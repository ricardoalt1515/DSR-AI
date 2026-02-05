import io
import uuid
from pathlib import Path

import pytest
from conftest import create_org, create_user
from httpx import AsyncClient
from sqlalchemy import select

import app.api.v1.feedback as feedback_module
from app.core.config import settings
from app.models.feedback import Feedback
from app.models.feedback_attachment import FeedbackAttachment
from app.models.user import UserRole


def _png_bytes() -> bytes:
    return b"\x89PNG\r\n\x1a\n" + b"\x00" * 16


@pytest.mark.asyncio
async def test_feedback_attachment_upload_success(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback Attach", "org-feedback-attach")
    user = await create_user(
        db_session,
        email=f"feedback-attach-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    feedback = Feedback(
        organization_id=org.id,
        user_id=user.id,
        content="Attachment test",
        feedback_type="general",
        page_path="/projects/1",
    )
    db_session.add(feedback)
    await db_session.commit()

    set_current_user(user)

    files = [
        ("attachments", ("image.png", io.BytesIO(_png_bytes()), "image/png")),
    ]
    response = await client.post(
        f"/api/v1/feedback/{feedback.id}/attachments",
        files=files,
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data) == 1
    assert data[0]["originalFilename"] == "image.png"
    assert data[0]["isPreviewable"] is True

    result = await db_session.execute(
        select(FeedbackAttachment).where(
            FeedbackAttachment.feedback_id == feedback.id,
            FeedbackAttachment.organization_id == org.id,
        )
    )
    attachment = result.scalar_one()
    assert attachment.uploaded_by_user_id == user.id


@pytest.mark.asyncio
async def test_feedback_attachment_cap_total(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback Cap", "org-feedback-cap")
    user = await create_user(
        db_session,
        email=f"feedback-cap-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    feedback = Feedback(
        organization_id=org.id,
        user_id=user.id,
        content="Cap test",
        feedback_type="general",
        page_path="/projects/1",
    )
    db_session.add(feedback)
    await db_session.commit()

    for idx in range(4):
        db_session.add(
            FeedbackAttachment(
                organization_id=org.id,
                feedback_id=feedback.id,
                storage_key=f"feedback/{org.id}/{feedback.id}/{uuid.uuid4()}.bin",
                original_filename=f"file-{idx}.bin",
                content_type="application/octet-stream",
                size_bytes=1,
                is_previewable=False,
                uploaded_by_user_id=user.id,
            )
        )
    await db_session.commit()

    set_current_user(user)

    files = [
        ("attachments", ("file1.bin", io.BytesIO(b"1"), "application/octet-stream")),
        ("attachments", ("file2.bin", io.BytesIO(b"2"), "application/octet-stream")),
    ]
    response = await client.post(
        f"/api/v1/feedback/{feedback.id}/attachments",
        files=files,
    )
    assert response.status_code == 400
    payload = response.json()
    assert payload["detail"]["code"] == "TOO_MANY_ATTACHMENTS"


@pytest.mark.asyncio
async def test_feedback_attachment_too_large(
    client: AsyncClient,
    db_session,
    set_current_user,
    monkeypatch,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback Large", "org-feedback-large")
    user = await create_user(
        db_session,
        email=f"feedback-large-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    feedback = Feedback(
        organization_id=org.id,
        user_id=user.id,
        content="Large test",
        feedback_type="general",
        page_path="/projects/1",
    )
    db_session.add(feedback)
    await db_session.commit()

    set_current_user(user)

    monkeypatch.setattr(feedback_module, "MAX_ATTACHMENT_SIZE", 8)
    files = [
        ("attachments", ("large.bin", io.BytesIO(b"123456789"), "application/octet-stream")),
    ]
    response = await client.post(
        f"/api/v1/feedback/{feedback.id}/attachments",
        files=files,
    )
    assert response.status_code == 400
    payload = response.json()
    assert payload["detail"]["code"] == "FILE_TOO_LARGE"


@pytest.mark.asyncio
async def test_feedback_attachment_non_creator_blocked(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback Other", "org-feedback-other")
    owner = await create_user(
        db_session,
        email=f"feedback-owner-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    other = await create_user(
        db_session,
        email=f"feedback-other-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    feedback = Feedback(
        organization_id=org.id,
        user_id=owner.id,
        content="Owner feedback",
        feedback_type="general",
        page_path="/projects/1",
    )
    db_session.add(feedback)
    await db_session.commit()

    set_current_user(other)
    files = [
        ("attachments", ("file.txt", io.BytesIO(b"data"), "text/plain")),
    ]
    response = await client.post(
        f"/api/v1/feedback/{feedback.id}/attachments",
        files=files,
    )
    assert response.status_code in {403, 404}


@pytest.mark.asyncio
async def test_admin_list_attachments_requires_org_header(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback Admin", "org-feedback-admin")
    admin = await create_user(
        db_session,
        email=f"feedback-admin-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    owner = await create_user(
        db_session,
        email=f"feedback-admin-owner-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    feedback = Feedback(
        organization_id=org.id,
        user_id=owner.id,
        content="Admin feedback",
        feedback_type="general",
        page_path="/projects/1",
    )
    db_session.add(feedback)
    await db_session.commit()

    set_current_user(admin)
    response = await client.get(f"/api/v1/admin/feedback/{feedback.id}/attachments")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_admin_list_attachments_feedback_not_found_returns_404(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback Missing", "org-feedback-missing")
    admin = await create_user(
        db_session,
        email=f"feedback-missing-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )

    set_current_user(admin)
    missing_feedback_id = uuid.uuid4()
    response = await client.get(
        f"/api/v1/admin/feedback/{missing_feedback_id}/attachments",
        headers={"X-Organization-Id": str(org.id)},
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_admin_list_attachments_urls_and_preview(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback URLs", "org-feedback-urls")
    admin = await create_user(
        db_session,
        email=f"feedback-urls-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    owner = await create_user(
        db_session,
        email=f"feedback-urls-owner-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    feedback = Feedback(
        organization_id=org.id,
        user_id=owner.id,
        content="URL feedback",
        feedback_type="general",
        page_path="/projects/1",
    )
    db_session.add(feedback)
    await db_session.commit()

    preview_key = f"feedback/{org.id}/{feedback.id}/{uuid.uuid4()}.jpg"
    download_key = f"feedback/{org.id}/{feedback.id}/{uuid.uuid4()}.bin"
    for key in [preview_key, download_key]:
        target_path = Path(settings.LOCAL_STORAGE_PATH) / key
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(b"data")

    preview_attachment = FeedbackAttachment(
        organization_id=org.id,
        feedback_id=feedback.id,
        storage_key=preview_key,
        original_filename="preview.jpg",
        content_type="image/jpeg",
        size_bytes=4,
        is_previewable=True,
        uploaded_by_user_id=None,
    )
    download_attachment = FeedbackAttachment(
        organization_id=org.id,
        feedback_id=feedback.id,
        storage_key=download_key,
        original_filename="doc.bin",
        content_type="application/octet-stream",
        size_bytes=4,
        is_previewable=False,
        uploaded_by_user_id=None,
    )
    db_session.add_all([preview_attachment, download_attachment])
    await db_session.commit()

    set_current_user(admin)
    response = await client.get(
        f"/api/v1/admin/feedback/{feedback.id}/attachments",
        headers={"X-Organization-Id": str(org.id)},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    preview_item = next(item for item in data if item["isPreviewable"])
    download_item = next(item for item in data if not item["isPreviewable"])
    assert preview_item["downloadUrl"]
    assert preview_item["previewUrl"]
    assert download_item["downloadUrl"]
    assert download_item.get("previewUrl") is None


@pytest.mark.asyncio
async def test_feedback_attachment_cleanup_on_upload_failure(
    client: AsyncClient,
    db_session,
    set_current_user,
    monkeypatch,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback Fail", "org-feedback-fail")
    user = await create_user(
        db_session,
        email=f"feedback-fail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    feedback = Feedback(
        organization_id=org.id,
        user_id=user.id,
        content="Failure test",
        feedback_type="general",
        page_path="/projects/1",
    )
    db_session.add(feedback)
    await db_session.commit()

    set_current_user(user)

    uploaded = {"keys": []}
    delete_calls = {"keys": []}

    async def fake_upload(_file_obj, filename: str, _content_type: str | None = None) -> str:
        uploaded["keys"].append(filename)
        if len(uploaded["keys"]) > 1:
            raise RuntimeError("boom")
        return filename

    async def fake_delete(keys):
        delete_calls["keys"].extend(keys)

    monkeypatch.setattr(feedback_module, "upload_file_to_s3", fake_upload)
    monkeypatch.setattr(feedback_module, "delete_storage_keys", fake_delete)

    files = [
        ("attachments", ("file1.bin", io.BytesIO(b"1"), "application/octet-stream")),
        ("attachments", ("file2.bin", io.BytesIO(b"2"), "application/octet-stream")),
    ]
    response = await client.post(
        f"/api/v1/feedback/{feedback.id}/attachments",
        files=files,
    )
    assert response.status_code == 500
    payload = response.json()
    assert payload["detail"]["code"] == "UPLOAD_FAILED"
    assert delete_calls["keys"] == uploaded["keys"][:1]

    result = await db_session.execute(
        select(FeedbackAttachment).where(
            FeedbackAttachment.feedback_id == feedback.id,
            FeedbackAttachment.organization_id == org.id,
        )
    )
    assert result.scalars().all() == []
