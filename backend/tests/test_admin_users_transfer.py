import asyncio
import uuid

import pytest
from conftest import create_company, create_location, create_org, create_project, create_user
from httpx import AsyncClient
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.project import Project
from app.models.user import User, UserRole


async def _transfer_user(
    client: AsyncClient,
    *,
    user_id: uuid.UUID,
    target_organization_id: uuid.UUID,
    reason: str = "Transfer required for support operations",
    reassign_to_user_id: uuid.UUID | None = None,
):
    payload: dict[str, str | None] = {
        "target_organization_id": str(target_organization_id),
        "reason": reason,
        "reassign_to_user_id": str(reassign_to_user_id) if reassign_to_user_id else None,
    }
    return await client.post(
        f"/api/v1/admin/users/{user_id}/transfer-organization",
        json=payload,
    )


@pytest.mark.asyncio
async def test_transfer_user_forbidden_for_non_superadmin(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    from_org = await create_org(db_session, "Transfer Source", "transfer-source")
    to_org = await create_org(db_session, "Transfer Target", "transfer-target")
    actor = await create_user(
        db_session,
        email=f"actor-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    target = await create_user(
        db_session,
        email=f"target-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(actor)
    response = await _transfer_user(
        client,
        user_id=target.id,
        target_organization_id=to_org.id,
    )

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "FORBIDDEN_SUPERADMIN_REQUIRED"


@pytest.mark.asyncio
async def test_transfer_user_success_without_active_projects(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    from_org = await create_org(db_session, "Source No Projects", "source-no-projects")
    to_org = await create_org(db_session, "Target No Projects", "target-no-projects")
    superadmin = await create_user(
        db_session,
        email=f"superadmin-success-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    target = await create_user(
        db_session,
        email=f"member-transfer-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(superadmin)
    response = await _transfer_user(
        client,
        user_id=target.id,
        target_organization_id=to_org.id,
    )

    assert response.status_code == 200
    data = response.json()
    assert data["userId"] == str(target.id)
    assert data["fromOrganizationId"] == str(from_org.id)
    assert data["toOrganizationId"] == str(to_org.id)
    assert data["reassignedProjectsCount"] == 0

    refreshed_target = await db_session.get(User, target.id)
    assert refreshed_target is not None
    assert refreshed_target.organization_id == to_org.id


@pytest.mark.asyncio
async def test_transfer_user_success_with_project_reassign(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    from_org = await create_org(db_session, "Source Reassign", "source-reassign")
    to_org = await create_org(db_session, "Target Reassign", "target-reassign")
    superadmin = await create_user(
        db_session,
        email=f"superadmin-reassign-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    transferring_user = await create_user(
        db_session,
        email=f"transfer-user-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    reassign_admin = await create_user(
        db_session,
        email=f"reassign-admin-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(
        db_session,
        org_id=from_org.id,
        name=f"Company {uid}",
        created_by_user_id=reassign_admin.id,
    )
    location = await create_location(
        db_session,
        org_id=from_org.id,
        company_id=company.id,
        name=f"Location {uid}",
        created_by_user_id=reassign_admin.id,
    )
    project = await create_project(
        db_session,
        org_id=from_org.id,
        user_id=transferring_user.id,
        location_id=location.id,
        name=f"Project {uid}",
    )

    set_current_user(superadmin)
    response = await _transfer_user(
        client,
        user_id=transferring_user.id,
        target_organization_id=to_org.id,
        reassign_to_user_id=reassign_admin.id,
    )

    assert response.status_code == 200
    assert response.json()["reassignedProjectsCount"] == 1

    refreshed_project = await db_session.get(Project, project.id)
    refreshed_user = await db_session.get(User, transferring_user.id)
    assert refreshed_project is not None
    assert refreshed_user is not None
    assert refreshed_project.user_id == reassign_admin.id
    assert refreshed_user.organization_id == to_org.id


@pytest.mark.asyncio
async def test_transfer_user_rejects_not_found_entities(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    source_org = await create_org(db_session, "Entity Source", "entity-source")
    superadmin = await create_user(
        db_session,
        email=f"superadmin-notfound-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    target_user = await create_user(
        db_session,
        email=f"target-notfound-{uid}@example.com",
        org_id=source_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(superadmin)

    missing_user_response = await _transfer_user(
        client,
        user_id=uuid.uuid4(),
        target_organization_id=source_org.id,
    )
    assert missing_user_response.status_code == 404
    assert missing_user_response.json()["error"]["code"] == "USER_NOT_FOUND"

    missing_org_response = await _transfer_user(
        client,
        user_id=target_user.id,
        target_organization_id=uuid.uuid4(),
    )
    assert missing_org_response.status_code == 404
    assert missing_org_response.json()["error"]["code"] == "TARGET_ORG_NOT_FOUND"


@pytest.mark.asyncio
async def test_transfer_user_rejects_same_org_and_superuser(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Validation Org", "validation-org")
    superadmin = await create_user(
        db_session,
        email=f"superadmin-validation-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    regular_user = await create_user(
        db_session,
        email=f"regular-validation-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    platform_admin = await create_user(
        db_session,
        email=f"platform-admin-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )

    set_current_user(superadmin)

    same_org_response = await _transfer_user(
        client,
        user_id=regular_user.id,
        target_organization_id=org.id,
    )
    assert same_org_response.status_code == 400
    assert same_org_response.json()["error"]["code"] == "SAME_ORGANIZATION"

    superuser_response = await _transfer_user(
        client,
        user_id=platform_admin.id,
        target_organization_id=org.id,
    )
    assert superuser_response.status_code == 400
    assert superuser_response.json()["error"]["code"] == "SUPERUSER_TRANSFER_BLOCKED"


@pytest.mark.asyncio
async def test_transfer_user_blocks_last_org_admin(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    from_org = await create_org(db_session, "Last Admin Source", "last-admin-source")
    to_org = await create_org(db_session, "Last Admin Target", "last-admin-target")
    superadmin = await create_user(
        db_session,
        email=f"superadmin-last-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    only_org_admin = await create_user(
        db_session,
        email=f"only-org-admin-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    set_current_user(superadmin)
    response = await _transfer_user(
        client,
        user_id=only_org_admin.id,
        target_organization_id=to_org.id,
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "LAST_ORG_ADMIN_BLOCKED"


@pytest.mark.asyncio
async def test_transfer_user_requires_reassign_when_active_projects_exist(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    from_org = await create_org(db_session, "Reassign Required", "reassign-required")
    to_org = await create_org(db_session, "Reassign Required To", "reassign-required-to")
    superadmin = await create_user(
        db_session,
        email=f"superadmin-required-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    transferring_user = await create_user(
        db_session,
        email=f"transfer-required-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    org_admin = await create_user(
        db_session,
        email=f"org-admin-required-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(
        db_session,
        org_id=from_org.id,
        name=f"Required Co {uid}",
        created_by_user_id=org_admin.id,
    )
    location = await create_location(
        db_session,
        org_id=from_org.id,
        company_id=company.id,
        name=f"Required Location {uid}",
        created_by_user_id=org_admin.id,
    )
    project = await create_project(
        db_session,
        org_id=from_org.id,
        user_id=transferring_user.id,
        location_id=location.id,
        name=f"Required Project {uid}",
    )

    set_current_user(superadmin)
    response = await _transfer_user(
        client,
        user_id=transferring_user.id,
        target_organization_id=to_org.id,
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "REASSIGN_REQUIRED"

    refreshed_project = await db_session.get(Project, project.id)
    refreshed_user = await db_session.get(User, transferring_user.id)
    assert refreshed_project is not None
    assert refreshed_user is not None
    assert refreshed_project.user_id == transferring_user.id
    assert refreshed_user.organization_id == from_org.id


@pytest.mark.asyncio
@pytest.mark.parametrize("invalid_mode", ["other_org", "inactive", "not_org_admin"])
async def test_transfer_user_rejects_invalid_reassign_user(
    client: AsyncClient, db_session, set_current_user, invalid_mode: str
):
    uid = uuid.uuid4().hex[:8]
    from_org = await create_org(db_session, "Invalid Reassign Source", "invalid-reassign-source")
    to_org = await create_org(db_session, "Invalid Reassign Target", "invalid-reassign-target")
    third_org = await create_org(db_session, "Invalid Reassign Third", "invalid-reassign-third")
    superadmin = await create_user(
        db_session,
        email=f"superadmin-invalid-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    transferring_user = await create_user(
        db_session,
        email=f"transferring-invalid-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    valid_org_admin = await create_user(
        db_session,
        email=f"valid-org-admin-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(
        db_session,
        org_id=from_org.id,
        name=f"Invalid Co {uid}",
        created_by_user_id=valid_org_admin.id,
    )
    location = await create_location(
        db_session,
        org_id=from_org.id,
        company_id=company.id,
        name=f"Invalid Location {uid}",
        created_by_user_id=valid_org_admin.id,
    )
    await create_project(
        db_session,
        org_id=from_org.id,
        user_id=transferring_user.id,
        location_id=location.id,
        name=f"Invalid Project {uid}",
    )

    reassign_user = valid_org_admin
    if invalid_mode == "other_org":
        reassign_user = await create_user(
            db_session,
            email=f"other-org-user-{uid}@example.com",
            org_id=third_org.id,
            role=UserRole.ORG_ADMIN.value,
            is_superuser=False,
        )
    elif invalid_mode == "inactive":
        reassign_user = await create_user(
            db_session,
            email=f"inactive-user-{uid}@example.com",
            org_id=from_org.id,
            role=UserRole.ORG_ADMIN.value,
            is_superuser=False,
        )
        reassign_user.is_active = False
        await db_session.commit()
        await db_session.refresh(reassign_user)
    elif invalid_mode == "not_org_admin":
        reassign_user = await create_user(
            db_session,
            email=f"not-org-admin-{uid}@example.com",
            org_id=from_org.id,
            role=UserRole.FIELD_AGENT.value,
            is_superuser=False,
        )

    set_current_user(superadmin)
    response = await _transfer_user(
        client,
        user_id=transferring_user.id,
        target_organization_id=to_org.id,
        reassign_to_user_id=reassign_user.id,
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "REASSIGN_INVALID"


@pytest.mark.asyncio
async def test_transfer_user_rejects_reassign_to_self(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    from_org = await create_org(db_session, "Self Reassign Source", "self-reassign-source")
    to_org = await create_org(db_session, "Self Reassign Target", "self-reassign-target")
    superadmin = await create_user(
        db_session,
        email=f"superadmin-self-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    transferring_user = await create_user(
        db_session,
        email=f"self-reassign-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    org_admin = await create_user(
        db_session,
        email=f"org-admin-self-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(
        db_session,
        org_id=from_org.id,
        name=f"Self Co {uid}",
        created_by_user_id=org_admin.id,
    )
    location = await create_location(
        db_session,
        org_id=from_org.id,
        company_id=company.id,
        name=f"Self Location {uid}",
        created_by_user_id=org_admin.id,
    )
    await create_project(
        db_session,
        org_id=from_org.id,
        user_id=transferring_user.id,
        location_id=location.id,
        name=f"Self Project {uid}",
    )

    set_current_user(superadmin)
    response = await _transfer_user(
        client,
        user_id=transferring_user.id,
        target_organization_id=to_org.id,
        reassign_to_user_id=transferring_user.id,
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "REASSIGN_INVALID"


@pytest.mark.asyncio
async def test_transfer_user_rejects_inactive_target_org(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    from_org = await create_org(db_session, "Inactive Target Source", "inactive-target-source")
    target_org = await create_org(db_session, "Inactive Target Org", "inactive-target-org")
    target_org.is_active = False
    await db_session.commit()
    await db_session.refresh(target_org)

    superadmin = await create_user(
        db_session,
        email=f"superadmin-inactive-target-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    target_user = await create_user(
        db_session,
        email=f"member-inactive-target-{uid}@example.com",
        org_id=from_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(superadmin)
    response = await _transfer_user(
        client,
        user_id=target_user.id,
        target_organization_id=target_org.id,
    )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "TARGET_ORG_INACTIVE"


@pytest.mark.asyncio
async def test_concurrent_transfers_keep_at_least_one_org_admin(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    source_org = await create_org(db_session, "Concurrency Source", "concurrency-source")
    target_org = await create_org(db_session, "Concurrency Target", "concurrency-target")
    superadmin = await create_user(
        db_session,
        email=f"superadmin-concurrency-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    org_admin_1 = await create_user(
        db_session,
        email=f"org-admin-1-{uid}@example.com",
        org_id=source_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    org_admin_2 = await create_user(
        db_session,
        email=f"org-admin-2-{uid}@example.com",
        org_id=source_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    set_current_user(superadmin)

    first_transfer, second_transfer = await asyncio.gather(
        _transfer_user(
            client,
            user_id=org_admin_1.id,
            target_organization_id=target_org.id,
            reason="Concurrent transfer one for staffing needs",
        ),
        _transfer_user(
            client,
            user_id=org_admin_2.id,
            target_organization_id=target_org.id,
            reason="Concurrent transfer two for staffing needs",
        ),
    )

    statuses = sorted([first_transfer.status_code, second_transfer.status_code])
    assert statuses == [200, 400]

    if first_transfer.status_code == 400:
        assert first_transfer.json()["error"]["code"] == "LAST_ORG_ADMIN_BLOCKED"
    if second_transfer.status_code == 400:
        assert second_transfer.json()["error"]["code"] == "LAST_ORG_ADMIN_BLOCKED"

    source_admins_result = await db_session.execute(
        select(User.id).where(
            User.organization_id == source_org.id,
            User.role == UserRole.ORG_ADMIN.value,
            User.is_active.is_(True),
        )
    )
    assert len(source_admins_result.all()) >= 1


@pytest.mark.asyncio
async def test_transfer_conflicts_when_user_org_changes_during_request(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    source_org = await create_org(db_session, "Race Source", "race-source")
    target_org = await create_org(db_session, "Race Target", "race-target")
    alternate_org = await create_org(db_session, "Race Alternate", "race-alternate")
    superadmin = await create_user(
        db_session,
        email=f"superadmin-race-{uid}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    source_org_admin = await create_user(
        db_session,
        email=f"source-admin-race-{uid}@example.com",
        org_id=source_org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    transferring_user = await create_user(
        db_session,
        email=f"member-race-{uid}@example.com",
        org_id=source_org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    lock_ready = asyncio.Event()
    release_lock = asyncio.Event()

    async def move_user_in_separate_session() -> None:
        async with AsyncSessionLocal() as updater_session:
            lock_result = await updater_session.execute(
                select(User).where(User.id == transferring_user.id).with_for_update()
            )
            locked_user = lock_result.scalar_one_or_none()
            assert locked_user is not None
            locked_user.organization_id = alternate_org.id
            lock_ready.set()
            await release_lock.wait()
            await updater_session.commit()

    set_current_user(superadmin)

    mover_task = asyncio.create_task(move_user_in_separate_session())
    await lock_ready.wait()

    transfer_task = asyncio.create_task(
        _transfer_user(
            client,
            user_id=transferring_user.id,
            target_organization_id=target_org.id,
            reason="Concurrent org reassignment conflict validation",
        )
    )

    await asyncio.sleep(0)
    release_lock.set()

    response = await transfer_task
    await mover_task

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "TRANSFER_STATE_CONFLICT"

    refreshed_user = await db_session.get(User, transferring_user.id)
    assert refreshed_user is not None
    assert refreshed_user.organization_id == alternate_org.id

    source_admins_result = await db_session.execute(
        select(User.id).where(
            User.organization_id == source_org.id,
            User.role == UserRole.ORG_ADMIN.value,
            User.is_active.is_(True),
        )
    )
    source_admin_rows = source_admins_result.all()
    assert len(source_admin_rows) >= 1
    assert source_org_admin.id in [row[0] for row in source_admin_rows]
