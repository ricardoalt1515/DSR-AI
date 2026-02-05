import uuid

import pytest
from conftest import create_org, create_user
from httpx import AsyncClient
from sqlalchemy import select

import app.api.v1.feedback as feedback_module
from app.models.feedback import Feedback
from app.models.feedback_attachment import FeedbackAttachment
from app.models.user import UserRole


async def _create_feedback_delete_fixture(db_session, *, uid: str, resolved: bool = True) -> tuple:
    org = await create_org(db_session, "Org Feedback Delete", "org-feedback-delete")
    admin = await create_user(
        db_session,
        email=f"feedback-delete-admin-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    owner = await create_user(
        db_session,
        email=f"feedback-delete-owner-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    feedback = Feedback(
        organization_id=org.id,
        user_id=owner.id,
        content="Delete feedback",
        feedback_type="general",
        page_path="/projects/1",
    )
    if resolved:
        feedback.resolved_at = feedback_module.datetime.now(feedback_module.UTC)
        feedback.resolved_by_user_id = admin.id
    db_session.add(feedback)
    await db_session.commit()
    return org, admin, owner, feedback


async def _create_attachment(db_session, *, org_id, feedback_id) -> FeedbackAttachment:
    attachment = FeedbackAttachment(
        organization_id=org_id,
        feedback_id=feedback_id,
        storage_key=f"feedback/{org_id}/{feedback_id}/{uuid.uuid4()}.bin",
        original_filename="file.bin",
        content_type="application/octet-stream",
        size_bytes=1,
        is_previewable=False,
        uploaded_by_user_id=None,
    )
    db_session.add(attachment)
    await db_session.commit()
    return attachment


@pytest.mark.asyncio
async def test_delete_feedback_requires_org_header(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    _, admin, _, feedback = await _create_feedback_delete_fixture(db_session, uid=uid)

    set_current_user(admin)
    response = await client.delete(f"/api/v1/admin/feedback/{feedback.id}")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_delete_feedback_wrong_org_returns_404(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    other_org = await create_org(
        db_session, "Org Feedback Delete Other", "org-feedback-delete-other"
    )
    _, admin, _, feedback = await _create_feedback_delete_fixture(db_session, uid=uid)

    set_current_user(admin)
    response = await client.delete(
        f"/api/v1/admin/feedback/{feedback.id}",
        headers={"X-Organization-Id": str(other_org.id)},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_feedback_cascades_attachments(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org, admin, _, feedback = await _create_feedback_delete_fixture(db_session, uid=uid)
    await _create_attachment(db_session, org_id=org.id, feedback_id=feedback.id)

    set_current_user(admin)
    response = await client.delete(
        f"/api/v1/admin/feedback/{feedback.id}",
        headers={"X-Organization-Id": str(org.id)},
    )
    assert response.status_code == 204

    feedback_result = await db_session.execute(select(Feedback).where(Feedback.id == feedback.id))
    assert feedback_result.scalar_one_or_none() is None

    attachment_result = await db_session.execute(
        select(FeedbackAttachment).where(
            FeedbackAttachment.feedback_id == feedback.id,
            FeedbackAttachment.organization_id == org.id,
        )
    )
    assert attachment_result.scalars().all() == []


@pytest.mark.asyncio
async def test_delete_feedback_cleanup_best_effort(
    client: AsyncClient,
    db_session,
    set_current_user,
    monkeypatch,
):
    uid = uuid.uuid4().hex[:8]
    org, admin, _, feedback = await _create_feedback_delete_fixture(db_session, uid=uid)
    await _create_attachment(db_session, org_id=org.id, feedback_id=feedback.id)

    async def failing_delete(_keys):
        raise RuntimeError("cleanup failed")

    monkeypatch.setattr(feedback_module, "delete_storage_keys", failing_delete)

    set_current_user(admin)
    response = await client.delete(
        f"/api/v1/admin/feedback/{feedback.id}",
        headers={"X-Organization-Id": str(org.id)},
    )
    assert response.status_code == 204

    feedback_result = await db_session.execute(select(Feedback).where(Feedback.id == feedback.id))
    assert feedback_result.scalar_one_or_none() is None

    attachment_result = await db_session.execute(
        select(FeedbackAttachment).where(
            FeedbackAttachment.feedback_id == feedback.id,
            FeedbackAttachment.organization_id == org.id,
        )
    )
    assert attachment_result.scalars().all() == []


@pytest.mark.asyncio
async def test_delete_feedback_open_returns_409(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org, admin, _, feedback = await _create_feedback_delete_fixture(
        db_session, uid=uid, resolved=False
    )

    set_current_user(admin)
    response = await client.delete(
        f"/api/v1/admin/feedback/{feedback.id}",
        headers={"X-Organization-Id": str(org.id)},
    )
    assert response.status_code == 409
