import uuid

import pytest
from conftest import (
    create_company,
    create_location,
    create_org,
    create_project,
    create_user,
)
from httpx import AsyncClient

from app.models.user import UserRole


@pytest.mark.asyncio
async def test_list_projects_empty(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Empty Proj", "org-empty-proj")
    user = await create_user(
        db_session,
        email=f"empty-proj-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    response = await client.get("/api/v1/projects")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 0
    assert data["items"] == []
    assert data["page"] == 1


@pytest.mark.asyncio
async def test_list_projects_paginated(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Paginated", "org-paginated")
    user = await create_user(
        db_session,
        email=f"paginated-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Pag Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Pag Loc"
    )
    for i in range(15):
        await create_project(
            db_session,
            org_id=org.id,
            user_id=user.id,
            location_id=location.id,
            name=f"Project {i}",
        )

    set_current_user(user)
    response = await client.get("/api/v1/projects?page=1&size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 15
    assert len(data["items"]) == 10
    assert data["pages"] == 2

    response2 = await client.get("/api/v1/projects?page=2&size=10")
    data2 = response2.json()
    assert len(data2["items"]) == 5


@pytest.mark.asyncio
async def test_list_projects_search(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Search", "org-search")
    user = await create_user(
        db_session,
        email=f"search-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Search Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Search Loc"
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Alpha Project",
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Beta Project",
    )

    set_current_user(user)
    response = await client.get("/api/v1/projects?search=Alpha")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Alpha Project"


@pytest.mark.asyncio
async def test_list_projects_status_filter(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Status Filter", "org-status-filter")
    user = await create_user(
        db_session,
        email=f"status-filter-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Status Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Status Loc"
    )
    p1 = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Active Project",
    )
    p1.status = "Active"
    await db_session.commit()

    p2 = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Completed Project",
    )
    p2.status = "Completed"
    await db_session.commit()

    set_current_user(user)
    response = await client.get("/api/v1/projects?status=Active")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["name"] == "Active Project"


@pytest.mark.asyncio
async def test_create_project_success(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Create Proj", "org-create-proj")
    user = await create_user(
        db_session,
        email=f"create-proj-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Create Proj Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Create Proj Loc"
    )

    set_current_user(user)
    response = await client.post(
        "/api/v1/projects",
        json={
            "location_id": str(location.id),
            "name": "New Project",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Project"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_project_invalid_location(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Invalid Loc", "org-invalid-loc")
    user = await create_user(
        db_session,
        email=f"invalid-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    fake_location_id = uuid.uuid4()
    response = await client.post(
        "/api/v1/projects",
        json={
            "location_id": str(fake_location_id),
            "name": "Bad Project",
        },
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_project_detail(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Proj Detail", "org-proj-detail")
    user = await create_user(
        db_session,
        email=f"proj-detail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Detail Proj Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Detail Proj Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Detail Project",
    )

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Detail Project"
    assert data["id"] == str(project.id)


@pytest.mark.asyncio
async def test_update_project(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Update Proj", "org-update-proj")
    user = await create_user(
        db_session,
        email=f"update-proj-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Update Proj Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Update Proj Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Old Project Name",
    )

    set_current_user(user)
    response = await client.patch(
        f"/api/v1/projects/{project.id}",
        json={"name": "Updated Project Name"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Project Name"


@pytest.mark.asyncio
async def test_dashboard_stats(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Dashboard", "org-dashboard")
    user = await create_user(
        db_session,
        email=f"dashboard-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Dashboard Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Dashboard Loc"
    )
    await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Dashboard Project",
    )

    set_current_user(user)
    response = await client.get("/api/v1/projects/stats")
    assert response.status_code == 200
    data = response.json()
    assert "totalProjects" in data
    assert data["totalProjects"] >= 1
