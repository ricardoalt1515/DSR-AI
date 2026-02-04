import uuid
from datetime import UTC, datetime, timedelta

import pytest
from conftest import create_org, create_user
from httpx import AsyncClient
from sqlalchemy import select

from app.models.feedback import Feedback
from app.models.user import UserRole


@pytest.mark.asyncio
async def test_user_can_create_feedback(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback", "org-feedback")
    user = await create_user(
        db_session,
        email=f"feedback-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)

    payload = {
        "content": "Something looks off",
        "feedback_type": "bug",
        "page_path": "/projects/123?tab=overview#section",
    }

    response = await client.post("/api/v1/feedback", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert "createdAt" in data

    result = await db_session.execute(select(Feedback).where(Feedback.id == data["id"]))
    feedback = result.scalar_one()
    assert feedback.organization_id == org.id
    assert feedback.user_id == user.id
    assert feedback.content == payload["content"]
    assert feedback.feedback_type == payload["feedback_type"]
    assert feedback.page_path == "/projects/123"


@pytest.mark.asyncio
async def test_create_feedback_ignores_org_header(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback", "org-feedback")
    other_org = await create_org(db_session, "Org Feedback Other", "org-feedback-other")
    user = await create_user(
        db_session,
        email=f"feedback-header-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)

    response = await client.post(
        "/api/v1/feedback",
        json={"content": "Header spoof attempt", "feedback_type": "general"},
        headers={"X-Organization-Id": str(other_org.id)},
    )
    assert response.status_code == 201

    result = await db_session.execute(
        select(Feedback).where(Feedback.user_id == user.id).order_by(Feedback.created_at.desc())
    )
    feedback = result.scalar_one()
    assert feedback.organization_id == org.id


@pytest.mark.asyncio
async def test_superuser_cannot_create_feedback(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback Superadmin", "org-feedback-superadmin")
    superuser = await create_user(
        db_session,
        email=f"superadmin-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )

    set_current_user(superuser)

    payload = {
        "content": "Trying to submit as superadmin",
        "feedback_type": "general",
        "page_path": "/admin",
    }

    response = await client.post(
        "/api/v1/feedback",
        json=payload,
        headers={"X-Organization-Id": str(org.id)},
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "Superadmins cannot submit feedback"


@pytest.mark.asyncio
async def test_superuser_can_list_feedback_with_filters(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback Admin", "org-feedback-admin")
    superuser = await create_user(
        db_session,
        email=f"admin-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    user = await create_user(
        db_session,
        email=f"user-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    now = datetime.now(UTC)
    recent_feedback = Feedback(
        organization_id=org.id,
        user_id=user.id,
        content="Recent bug",
        feedback_type="bug",
        page_path="/projects/1",
        created_at=now - timedelta(days=1),
    )
    old_resolved_feedback = Feedback(
        organization_id=org.id,
        user_id=user.id,
        content="Old request",
        feedback_type="feature_request",
        page_path="/projects/2",
        created_at=now - timedelta(days=10),
        resolved_at=now - timedelta(days=5),
        resolved_by_user_id=superuser.id,
    )
    db_session.add_all([recent_feedback, old_resolved_feedback])
    await db_session.commit()

    set_current_user(superuser)

    response = await client.get(
        "/api/v1/admin/feedback",
        params={"days": 7, "resolved": False, "feedback_type": "bug"},
        headers={"X-Organization-Id": str(org.id)},
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["content"] == "Recent bug"
    assert data[0]["user"]["id"] == str(user.id)
    assert data[0]["user"]["firstName"] == user.first_name
    assert data[0]["user"]["lastName"] == user.last_name


@pytest.mark.asyncio
async def test_superuser_list_requires_org_header(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    await create_org(db_session, "Org Feedback Header", "org-feedback-header")
    superuser = await create_user(
        db_session,
        email=f"header-admin-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )

    set_current_user(superuser)

    response = await client.get("/api/v1/admin/feedback")
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_non_superuser_cannot_list_feedback(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback Deny", "org-feedback-deny")
    user = await create_user(
        db_session,
        email=f"deny-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)

    response = await client.get("/api/v1/admin/feedback")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_superuser_can_resolve_and_reopen_feedback(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback Resolve", "org-feedback-resolve")
    superuser = await create_user(
        db_session,
        email=f"resolve-admin-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    user = await create_user(
        db_session,
        email=f"resolve-user-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    feedback = Feedback(
        organization_id=org.id,
        user_id=user.id,
        content="Resolve me",
        feedback_type="general",
        page_path="/dashboard",
    )
    db_session.add(feedback)
    await db_session.commit()
    await db_session.refresh(feedback)

    set_current_user(superuser)

    resolve_response = await client.patch(
        f"/api/v1/admin/feedback/{feedback.id}",
        json={"resolved": True},
        headers={"X-Organization-Id": str(org.id)},
    )
    assert resolve_response.status_code == 200
    resolved_data = resolve_response.json()
    assert resolved_data["resolvedAt"] is not None
    assert resolved_data["resolvedByUserId"] == str(superuser.id)
    assert resolved_data["user"]["id"] == str(user.id)

    reopen_response = await client.patch(
        f"/api/v1/admin/feedback/{feedback.id}",
        json={"resolved": False},
        headers={"X-Organization-Id": str(org.id)},
    )
    assert reopen_response.status_code == 200
    reopened_data = reopen_response.json()
    assert reopened_data["resolvedAt"] is None
    assert reopened_data["resolvedByUserId"] is None
    assert reopened_data["user"]["id"] == str(user.id)


@pytest.mark.asyncio
async def test_superuser_patch_requires_org_header(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Feedback Patch Header", "org-feedback-patch-header")
    superuser = await create_user(
        db_session,
        email=f"patch-header-admin-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    user = await create_user(
        db_session,
        email=f"patch-header-user-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    feedback = Feedback(
        organization_id=org.id,
        user_id=user.id,
        content="Patch header required",
        feedback_type="general",
        page_path="/dashboard",
    )
    db_session.add(feedback)
    await db_session.commit()
    await db_session.refresh(feedback)

    set_current_user(superuser)

    response = await client.patch(
        f"/api/v1/admin/feedback/{feedback.id}",
        json={"resolved": True},
    )
    assert response.status_code == 400
