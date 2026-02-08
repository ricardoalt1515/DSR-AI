import asyncio
import uuid
from datetime import UTC, datetime, timedelta

import pytest
from conftest import create_org, create_user
from httpx import AsyncClient
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.models.feedback import Feedback
from app.models.feedback_attachment import FeedbackAttachment
from app.models.organization import Organization
from app.models.organization_purge_manifest import OrganizationPurgeManifest
from app.models.user import User, UserRole


async def _create_superadmin(db_session):
    suffix = uuid.uuid4().hex[:8]
    return await create_user(
        db_session,
        email=f"org-lifecycle-superadmin-{suffix}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )


@pytest.mark.asyncio
async def test_archive_organization_success_and_idempotent(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Archive Org", "archive-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    first_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert first_response.status_code == 200
    first_payload = first_response.json()
    assert first_payload["isActive"] is False
    assert first_payload["archivedAt"] is not None
    assert first_payload["archivedByUserId"] == str(superadmin.id)
    assert first_payload["deactivatedUsersCount"] == 0

    second_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert second_response.status_code == 200
    second_payload = second_response.json()
    assert second_payload["archivedAt"] == first_payload["archivedAt"]
    assert second_payload["archivedByUserId"] == first_payload["archivedByUserId"]
    assert second_payload["deactivatedUsersCount"] == 0


@pytest.mark.asyncio
async def test_archive_organization_blocks_active_users(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Archive Blocked Org", "archive-blocked-org")
    superadmin = await _create_superadmin(db_session)
    await create_user(
        db_session,
        email=f"active-member-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(superadmin)
    response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert response.status_code == 409
    payload = response.json()
    assert payload["error"]["code"] == "ORG_ACTIVE_USERS_BLOCKED"


@pytest.mark.asyncio
async def test_archive_organization_with_force_deactivates_active_users(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Archive Forced Org", "archive-forced-org")
    superadmin = await _create_superadmin(db_session)
    user_one = await create_user(
        db_session,
        email=f"force-user-one-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    user_two = await create_user(
        db_session,
        email=f"force-user-two-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.CONTRACTOR.value,
        is_superuser=False,
    )

    set_current_user(superadmin)
    response = await client.post(
        f"/api/v1/organizations/{org.id}/archive",
        json={"forceDeactivateUsers": True},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["isActive"] is False
    assert payload["deactivatedUsersCount"] == 2

    refreshed_user_one = await db_session.get(User, user_one.id)
    refreshed_user_two = await db_session.get(User, user_two.id)
    assert refreshed_user_one is not None and refreshed_user_one.is_active is False
    assert refreshed_user_two is not None and refreshed_user_two.is_active is False


@pytest.mark.asyncio
async def test_archive_organization_with_force_and_zero_active_users_returns_zero_count(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Archive Force Zero", "archive-force-zero")
    superadmin = await _create_superadmin(db_session)
    inactive_user = await create_user(
        db_session,
        email=f"force-zero-user-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    inactive_user.is_active = False
    db_session.add(inactive_user)
    await db_session.commit()

    set_current_user(superadmin)
    response = await client.post(
        f"/api/v1/organizations/{org.id}/archive",
        json={"forceDeactivateUsers": True},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["isActive"] is False
    assert payload["deactivatedUsersCount"] == 0


@pytest.mark.asyncio
async def test_restore_organization_success_and_idempotent(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Restore Org", "restore-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    archive_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert archive_response.status_code == 200

    first_response = await client.post(f"/api/v1/organizations/{org.id}/restore")
    assert first_response.status_code == 200
    first_payload = first_response.json()
    assert first_payload["isActive"] is True
    assert first_payload["archivedAt"] is None
    assert first_payload["archivedByUserId"] is None

    second_response = await client.post(f"/api/v1/organizations/{org.id}/restore")
    assert second_response.status_code == 200
    second_payload = second_response.json()
    assert second_payload["isActive"] is True
    assert second_payload["archivedAt"] is None


@pytest.mark.asyncio
async def test_list_organizations_default_active_only_and_include_inactive(
    client: AsyncClient, db_session, set_current_user
):
    active_org = await create_org(db_session, "List Active Org", "list-active-org")
    archived_org = await create_org(db_session, "List Archived Org", "list-archived-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    archive_response = await client.post(f"/api/v1/organizations/{archived_org.id}/archive")
    assert archive_response.status_code == 200

    default_response = await client.get("/api/v1/organizations")
    assert default_response.status_code == 200
    default_ids = {org_item["id"] for org_item in default_response.json()}
    assert str(active_org.id) in default_ids
    assert str(archived_org.id) not in default_ids

    include_response = await client.get("/api/v1/organizations?include_inactive=true")
    assert include_response.status_code == 200
    include_ids = {org_item["id"] for org_item in include_response.json()}
    assert str(active_org.id) in include_ids
    assert str(archived_org.id) in include_ids


@pytest.mark.asyncio
async def test_patch_organization_rejects_is_active_mutation(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Immutable Org", "immutable-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    response = await client.patch(
        f"/api/v1/organizations/{org.id}",
        json={"isActive": False},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "ORG_LIFECYCLE_FIELD_IMMUTABLE"


@pytest.mark.asyncio
async def test_patch_organization_rejects_metadata_update_when_archived(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Archived Metadata Org", "archived-metadata-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    archive_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert archive_response.status_code == 200

    response = await client.patch(
        f"/api/v1/organizations/{org.id}",
        json={"contactEmail": "archived@example.com"},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORG_NOT_ACTIVE"


@pytest.mark.asyncio
async def test_patch_org_metadata_waits_for_lock_and_rejects_if_archived_mid_request(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Patch Lock Org", "patch-lock-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    session_factory = async_sessionmaker(bind=db_session.bind, expire_on_commit=False)
    async with session_factory() as lock_session:
        locked_result = await lock_session.execute(
            select(Organization).where(Organization.id == org.id).with_for_update()
        )
        locked_org = locked_result.scalar_one()
        locked_org.is_active = False
        locked_org.archived_at = datetime.now(UTC)

        patch_task = asyncio.create_task(
            client.patch(
                f"/api/v1/organizations/{org.id}",
                json={"contactEmail": "locked@example.com"},
            )
        )
        await asyncio.sleep(0.1)
        await lock_session.commit()

    patch_response = await patch_task
    assert patch_response.status_code == 409
    assert patch_response.json()["error"]["code"] == "ORG_NOT_ACTIVE"


@pytest.mark.asyncio
async def test_archive_uses_db_clock_not_app_clock(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "DB Clock Org", "db-clock-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    db_before_result = await db_session.execute(select(func.current_timestamp()))
    db_before = db_before_result.scalar_one()
    assert isinstance(db_before, datetime)

    archive_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert archive_response.status_code == 200
    archived_at = datetime.fromisoformat(archive_response.json()["archivedAt"])

    db_after_result = await db_session.execute(select(func.current_timestamp()))
    db_after = db_after_result.scalar_one()
    assert isinstance(db_after, datetime)

    assert db_before - timedelta(seconds=1) <= archived_at <= db_after + timedelta(seconds=1)


@pytest.mark.asyncio
async def test_purge_force_rejects_not_archived(client: AsyncClient, db_session, set_current_user):
    org = await create_org(db_session, "Purge Active Org", "purge-active-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    response = await client.post(
        f"/api/v1/organizations/{org.id}/purge-force",
        json={
            "confirmName": org.name,
            "confirmPhrase": f"PURGE {org.slug}",
            "reason": "Testing purge validations for lifecycle endpoint behavior.",
            "ticketId": "OPS-100",
        },
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORG_NOT_ARCHIVED"


@pytest.mark.asyncio
async def test_purge_force_rejects_retention_not_met(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Retention Org", "retention-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    archive_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert archive_response.status_code == 200

    response = await client.post(
        f"/api/v1/organizations/{org.id}/purge-force",
        json={
            "confirmName": org.name,
            "confirmPhrase": f"PURGE {org.slug}",
            "reason": "Testing retention window validation in purge force endpoint.",
            "ticketId": "OPS-101",
        },
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORG_RETENTION_NOT_MET"


@pytest.mark.asyncio
async def test_purge_force_rejects_confirmation_mismatch(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Confirm Org", "confirm-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    archive_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert archive_response.status_code == 200

    archived_org = await db_session.get(Organization, org.id)
    assert archived_org is not None
    archived_org.archived_at = datetime.now(UTC) - timedelta(days=31)
    await db_session.commit()

    bad_name_response = await client.post(
        f"/api/v1/organizations/{org.id}/purge-force",
        json={
            "confirmName": "Wrong Name",
            "confirmPhrase": f"PURGE {org.slug}",
            "reason": "Testing purge confirm_name mismatch behavior in endpoint flow.",
            "ticketId": "OPS-102",
        },
    )
    assert bad_name_response.status_code == 400
    assert bad_name_response.json()["error"]["code"] == "PURGE_CONFIRM_NAME_MISMATCH"

    bad_phrase_response = await client.post(
        f"/api/v1/organizations/{org.id}/purge-force",
        json={
            "confirmName": org.name,
            "confirmPhrase": "PURGE wrong-slug",
            "reason": "Testing purge confirm_phrase mismatch behavior in endpoint flow.",
            "ticketId": "OPS-103",
        },
    )
    assert bad_phrase_response.status_code == 400
    assert bad_phrase_response.json()["error"]["code"] == "PURGE_CONFIRM_PHRASE_MISMATCH"


@pytest.mark.asyncio
async def test_purge_force_success_after_retention(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Purge Ready Org", "purge-ready-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    archive_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert archive_response.status_code == 200

    archived_org = await db_session.get(Organization, org.id)
    assert archived_org is not None
    archived_org.archived_at = datetime.now(UTC) - timedelta(days=31)
    await db_session.commit()

    purge_response = await client.post(
        f"/api/v1/organizations/{org.id}/purge-force",
        json={
            "confirmName": org.name,
            "confirmPhrase": f"PURGE {org.slug}",
            "reason": "Retention window met; deleting test organization for lifecycle purge.",
            "ticketId": "OPS-104",
        },
    )
    assert purge_response.status_code == 204
    assert await db_session.get(Organization, org.id) is None


@pytest.mark.asyncio
async def test_purge_force_collects_feedback_attachment_storage_keys(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    org = await create_org(db_session, "Attachment Purge Org", "attachment-purge-org")
    superadmin = await _create_superadmin(db_session)
    member = await create_user(
        db_session,
        email=f"attachment-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    member.is_active = False
    db_session.add(member)

    feedback = Feedback(
        organization_id=org.id,
        user_id=member.id,
        content="Attachment cleanup coverage",
    )
    db_session.add(feedback)
    await db_session.flush()

    attachment_key = f"feedback/{org.id}/cleanup-proof.png"
    attachment = FeedbackAttachment(
        organization_id=org.id,
        feedback_id=feedback.id,
        storage_key=attachment_key,
        original_filename="cleanup-proof.png",
        content_type="image/png",
        size_bytes=1024,
        is_previewable=True,
        uploaded_by_user_id=member.id,
    )
    db_session.add(attachment)
    await db_session.commit()

    captured_keys: set[str] = set()

    async def _capture_delete_storage_keys(keys: set[str]) -> None:
        captured_keys.update(keys)

    monkeypatch.setattr(
        "app.services.organization_lifecycle_service.delete_storage_keys",
        _capture_delete_storage_keys,
    )

    set_current_user(superadmin)
    archive_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert archive_response.status_code == 200

    archived_org = await db_session.get(Organization, org.id)
    assert archived_org is not None
    archived_org.archived_at = datetime.now(UTC) - timedelta(days=31)
    await db_session.commit()

    purge_response = await client.post(
        f"/api/v1/organizations/{org.id}/purge-force",
        json={
            "confirmName": org.name,
            "confirmPhrase": f"PURGE {org.slug}",
            "reason": "Retention met and include feedback attachment storage cleanup.",
            "ticketId": "OPS-105",
        },
    )

    assert purge_response.status_code == 204
    assert attachment_key in captured_keys


@pytest.mark.asyncio
async def test_purge_force_returns_error_when_storage_cleanup_retries_exhausted(
    client: AsyncClient, db_session, set_current_user, monkeypatch
):
    org = await create_org(db_session, "Cleanup Failure Org", "cleanup-failure-org")
    superadmin = await _create_superadmin(db_session)
    member = await create_user(
        db_session,
        email=f"cleanup-owner-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    member.is_active = False
    db_session.add(member)

    feedback = Feedback(
        organization_id=org.id,
        user_id=member.id,
        content="Forcing cleanup failure",
    )
    db_session.add(feedback)
    await db_session.flush()

    attachment = FeedbackAttachment(
        organization_id=org.id,
        feedback_id=feedback.id,
        storage_key=f"feedback/{org.id}/retry-fail.png",
        original_filename="retry-fail.png",
        content_type="image/png",
        size_bytes=1024,
        is_previewable=True,
        uploaded_by_user_id=member.id,
    )
    db_session.add(attachment)
    await db_session.commit()

    async def _always_fail_delete_storage_keys(keys: set[str]) -> None:
        raise RuntimeError("forced storage cleanup failure")

    async def _no_sleep(_: float) -> None:
        return None

    monkeypatch.setattr(
        "app.services.organization_lifecycle_service.delete_storage_keys",
        _always_fail_delete_storage_keys,
    )
    monkeypatch.setattr(
        "app.services.organization_lifecycle_service.asyncio.sleep",
        _no_sleep,
    )

    set_current_user(superadmin)
    archive_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert archive_response.status_code == 200

    archived_org = await db_session.get(Organization, org.id)
    assert archived_org is not None
    archived_org.archived_at = datetime.now(UTC) - timedelta(days=31)
    await db_session.commit()

    purge_response = await client.post(
        f"/api/v1/organizations/{org.id}/purge-force",
        json={
            "confirmName": org.name,
            "confirmPhrase": f"PURGE {org.slug}",
            "reason": "Forcing storage cleanup retries to exhaust and return typed error.",
            "ticketId": "OPS-106",
        },
    )

    assert purge_response.status_code == 202
    error_payload = purge_response.json()["error"]
    assert error_payload["code"] == "ORG_STORAGE_CLEANUP_PENDING"
    manifest_id = error_payload["details"]["manifest_id"]

    assert await db_session.get(Organization, org.id) is None

    manifest_result = await db_session.execute(
        select(OrganizationPurgeManifest).where(
            OrganizationPurgeManifest.id == uuid.UUID(manifest_id),
            OrganizationPurgeManifest.status == "failed",
            OrganizationPurgeManifest.last_error.is_not(None),
        )
    )
    manifest = manifest_result.scalar_one_or_none()
    assert manifest is not None
    assert manifest.attempts == 3
    assert manifest.last_error is not None
    assert "forced storage cleanup failure" in manifest.last_error


@pytest.mark.asyncio
async def test_get_organization_is_read_only_without_write_lock(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Read Org", "read-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    session_factory = async_sessionmaker(bind=db_session.bind, expire_on_commit=False)
    async with session_factory() as lock_session:
        await lock_session.execute(
            select(Organization).where(Organization.id == org.id).with_for_update()
        )

        response = await asyncio.wait_for(
            client.get(f"/api/v1/organizations/{org.id}"),
            timeout=1.0,
        )

    assert response.status_code == 200
    assert response.json()["id"] == str(org.id)


@pytest.mark.asyncio
async def test_manifest_storage_keys_column_is_jsonb(db_session):
    result = await db_session.execute(
        text(
            """
            SELECT udt_name
            FROM information_schema.columns
            WHERE table_name = 'organization_purge_manifests'
              AND column_name = 'storage_keys'
            """
        )
    )
    assert result.scalar_one() == "jsonb"


@pytest.mark.asyncio
async def test_create_org_user_blocked_when_organization_archived(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Archived User Create Org", "archived-user-create-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    archive_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert archive_response.status_code == 200

    response = await client.post(
        f"/api/v1/organizations/{org.id}/users",
        json={
            "email": f"new-archived-user-{uuid.uuid4().hex[:8]}@example.com",
            "password": "Password1",
            "first_name": "New",
            "last_name": "User",
            "role": UserRole.FIELD_AGENT.value,
        },
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORG_NOT_ACTIVE"


@pytest.mark.asyncio
async def test_create_org_user_with_camel_case_names_returns_422(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Camel Case Org", "camel-case-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    response = await client.post(
        f"/api/v1/organizations/{org.id}/users",
        json={
            "email": f"camel-user-{uuid.uuid4().hex[:8]}@example.com",
            "password": "Password1",
            "firstName": "Camel",
            "lastName": "Case",
            "role": UserRole.FIELD_AGENT.value,
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_activate_org_user_blocked_when_organization_archived(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Archived Activate Org", "archived-activate-org")
    superadmin = await _create_superadmin(db_session)
    member = await create_user(
        db_session,
        email=f"inactive-archived-member-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    member.is_active = False
    db_session.add(member)
    await db_session.commit()

    set_current_user(superadmin)
    archive_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert archive_response.status_code == 200

    response = await client.patch(
        f"/api/v1/organizations/{org.id}/users/{member.id}",
        json={"is_active": True},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORG_NOT_ACTIVE"

    refreshed_member = await db_session.get(User, member.id)
    assert refreshed_member is not None
    assert refreshed_member.is_active is False


@pytest.mark.asyncio
async def test_update_org_user_role_blocked_when_organization_archived(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Archived Role Update Org", "archived-role-update-org")
    superadmin = await _create_superadmin(db_session)
    member = await create_user(
        db_session,
        email=f"archived-role-member-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    await db_session.commit()

    set_current_user(superadmin)
    archive_response = await client.post(
        f"/api/v1/organizations/{org.id}/archive",
        json={"forceDeactivateUsers": True},
    )
    assert archive_response.status_code == 200

    response = await client.patch(
        f"/api/v1/organizations/{org.id}/users/{member.id}",
        json={"role": UserRole.CONTRACTOR.value},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORG_NOT_ACTIVE"


@pytest.mark.asyncio
async def test_update_my_org_user_blocked_when_organization_archived(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Archived My Update Org", "archived-my-update-org")
    superadmin = await _create_superadmin(db_session)
    org_admin = await create_user(
        db_session,
        email=f"archived-my-org-admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    member = await create_user(
        db_session,
        email=f"archived-my-member-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    await db_session.commit()

    set_current_user(superadmin)
    archive_response = await client.post(
        f"/api/v1/organizations/{org.id}/archive",
        json={"forceDeactivateUsers": True},
    )
    assert archive_response.status_code == 200

    refreshed_org_admin = await db_session.get(User, org_admin.id)
    assert refreshed_org_admin is not None
    refreshed_org_admin.is_active = True
    db_session.add(refreshed_org_admin)
    await db_session.commit()

    set_current_user(org_admin)
    response = await client.patch(
        f"/api/v1/organizations/current/users/{member.id}",
        json={"role": UserRole.CONTRACTOR.value},
    )
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORG_NOT_ACTIVE"


@pytest.mark.asyncio
async def test_lifecycle_endpoints_forbidden_for_non_superadmin(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Non Superadmin Org", "non-superadmin-org")
    actor = await create_user(
        db_session,
        email=f"org-admin-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    set_current_user(actor)

    archive_response = await client.post(f"/api/v1/organizations/{org.id}/archive")
    assert archive_response.status_code == 403
    assert archive_response.json()["error"]["code"] == "FORBIDDEN_SUPERADMIN_REQUIRED"

    restore_response = await client.post(f"/api/v1/organizations/{org.id}/restore")
    assert restore_response.status_code == 403
    assert restore_response.json()["error"]["code"] == "FORBIDDEN_SUPERADMIN_REQUIRED"

    purge_response = await client.post(
        f"/api/v1/organizations/{org.id}/purge-force",
        json={
            "confirmName": org.name,
            "confirmPhrase": f"PURGE {org.slug}",
            "reason": "Forbidden request by non-superadmin should return consistent error code.",
            "ticketId": "OPS-107",
        },
    )
    assert purge_response.status_code == 403
    assert purge_response.json()["error"]["code"] == "FORBIDDEN_SUPERADMIN_REQUIRED"


@pytest.mark.asyncio
async def test_create_user_waits_for_org_lock_and_fails_if_archived_mid_request(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Create Lock Org", "create-lock-org")
    superadmin = await _create_superadmin(db_session)
    set_current_user(superadmin)

    session_factory = async_sessionmaker(bind=db_session.bind, expire_on_commit=False)
    async with session_factory() as lock_session:
        locked_result = await lock_session.execute(
            select(Organization).where(Organization.id == org.id).with_for_update()
        )
        locked_org = locked_result.scalar_one()
        locked_org.is_active = False
        locked_org.archived_at = datetime.now(UTC)

        create_task = asyncio.create_task(
            client.post(
                f"/api/v1/organizations/{org.id}/users",
                json={
                    "email": f"race-create-{uuid.uuid4().hex[:8]}@example.com",
                    "password": "Password1",
                    "first_name": "Race",
                    "last_name": "Create",
                    "role": UserRole.FIELD_AGENT.value,
                },
            )
        )
        await asyncio.sleep(0.1)
        await lock_session.commit()

    response = await create_task
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORG_NOT_ACTIVE"


@pytest.mark.asyncio
async def test_activate_user_waits_for_org_lock_and_fails_if_archived_mid_request(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Activate Lock Org", "activate-lock-org")
    superadmin = await _create_superadmin(db_session)
    member = await create_user(
        db_session,
        email=f"race-activate-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    member.is_active = False
    db_session.add(member)
    await db_session.commit()

    set_current_user(superadmin)

    session_factory = async_sessionmaker(bind=db_session.bind, expire_on_commit=False)
    async with session_factory() as lock_session:
        locked_result = await lock_session.execute(
            select(Organization).where(Organization.id == org.id).with_for_update()
        )
        locked_org = locked_result.scalar_one()
        locked_org.is_active = False
        locked_org.archived_at = datetime.now(UTC)

        activate_task = asyncio.create_task(
            client.patch(
                f"/api/v1/organizations/{org.id}/users/{member.id}",
                json={"is_active": True},
            )
        )
        await asyncio.sleep(0.1)
        await lock_session.commit()

    response = await activate_task
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "ORG_NOT_ACTIVE"
