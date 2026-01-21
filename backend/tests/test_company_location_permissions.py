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
async def test_agent_can_create_company_and_location(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Agent", "org-agent")
    user = await create_user(
        db_session,
        email=f"agent-create-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)

    company_payload = {
        "name": "Agent Co",
        "industry": "Manufacturing",
        "sector": "industrial",
        "subsector": "other",
    }
    company_response = await client.post("/api/v1/companies", json=company_payload)
    assert company_response.status_code == 201
    company_data = company_response.json()

    location_payload = {
        "company_id": company_data["id"],
        "name": "Agent Plant",
        "city": "Monterrey",
        "state": "NL",
    }
    location_response = await client.post(
        f"/api/v1/companies/{company_data['id']}/locations",
        json=location_payload,
    )
    assert location_response.status_code == 201


@pytest.mark.asyncio
async def test_agent_cannot_update_company_created_by_other_user(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Agent 2", "org-agent-2")
    agent_a = await create_user(
        db_session,
        email=f"agent-a-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    agent_b = await create_user(
        db_session,
        email=f"agent-b-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Shared Co")
    company.created_by_user_id = agent_a.id
    await db_session.commit()

    set_current_user(agent_b)
    response = await client.put(
        f"/api/v1/companies/{company.id}",
        json={"name": "Nope"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_compliance_cannot_create_company(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Compliance", "org-compliance")
    compliance_user = await create_user(
        db_session,
        email=f"compliance-{uid}@example.com",
        org_id=org.id,
        role=UserRole.COMPLIANCE.value,
        is_superuser=False,
    )

    set_current_user(compliance_user)

    response = await client.post(
        "/api/v1/companies",
        json={
            "name": "Nope",
            "industry": "Manufacturing",
            "sector": "industrial",
            "subsector": "other",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_compliance_cannot_create_project(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Compliance 2", "org-compliance-2")
    compliance_user = await create_user(
        db_session,
        email=f"compliance2-{uid}@example.com",
        org_id=org.id,
        role=UserRole.COMPLIANCE.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Compliance Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Compliance Plant",
    )

    set_current_user(compliance_user)

    response = await client.post(
        "/api/v1/projects",
        json={
            "location_id": str(location.id),
            "name": "Blocked Project",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_field_agent_cannot_delete_project(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Project Delete", "org-project-delete")
    agent = await create_user(
        db_session,
        email=f"agent-delete-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Delete Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Delete Plant",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=agent.id,
        location_id=location.id,
        name="Delete Me",
    )

    set_current_user(agent)

    response = await client.delete(f"/api/v1/projects/{project.id}")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_agent_can_update_own_company(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Own Co", "org-own-co")
    agent = await create_user(
        db_session,
        email=f"agent-own-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(agent)

    resp = await client.post(
        "/api/v1/companies",
        json={
            "name": "My Co",
            "industry": "Manufacturing",
            "sector": "industrial",
            "subsector": "other",
        },
    )
    assert resp.status_code == 201
    company_id = resp.json()["id"]

    resp = await client.put(f"/api/v1/companies/{company_id}", json={"name": "My Co Updated"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "My Co Updated"


@pytest.mark.asyncio
async def test_agent_can_update_own_location(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Own Loc", "org-own-loc")
    agent = await create_user(
        db_session,
        email=f"agent-own-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(agent)

    company_resp = await client.post(
        "/api/v1/companies",
        json={
            "name": "Loc Co",
            "industry": "Manufacturing",
            "sector": "industrial",
            "subsector": "other",
        },
    )
    company_id = company_resp.json()["id"]

    loc_resp = await client.post(
        f"/api/v1/companies/{company_id}/locations",
        json={"companyId": company_id, "name": "My Plant", "city": "Monterrey", "state": "NL"},
    )
    assert loc_resp.status_code == 201
    location_id = loc_resp.json()["id"]

    resp = await client.put(
        f"/api/v1/companies/locations/{location_id}",
        json={"name": "My Plant Updated"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "My Plant Updated"


@pytest.mark.asyncio
async def test_agent_cannot_delete_company(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Del Co", "org-del-co")
    agent = await create_user(
        db_session,
        email=f"agent-del-co-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(agent)

    resp = await client.post(
        "/api/v1/companies",
        json={
            "name": "Del Co",
            "industry": "Manufacturing",
            "sector": "industrial",
            "subsector": "other",
        },
    )
    company_id = resp.json()["id"]

    resp = await client.delete(f"/api/v1/companies/{company_id}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_agent_cannot_delete_location(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Del Loc", "org-del-loc")
    agent = await create_user(
        db_session,
        email=f"agent-del-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(agent)

    company_resp = await client.post(
        "/api/v1/companies",
        json={
            "name": "Del Loc Co",
            "industry": "Manufacturing",
            "sector": "industrial",
            "subsector": "other",
        },
    )
    company_id = company_resp.json()["id"]

    loc_resp = await client.post(
        f"/api/v1/companies/{company_id}/locations",
        json={"companyId": company_id, "name": "Del Plant", "city": "Monterrey", "state": "NL"},
    )
    location_id = loc_resp.json()["id"]

    resp = await client.delete(f"/api/v1/companies/locations/{location_id}")
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_org_admin_can_update_any_company(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Admin Co", "org-admin-co")
    agent = await create_user(
        db_session,
        email=f"agent-admin-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    admin = await create_user(
        db_session,
        email=f"admin-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    company = await create_company(
        db_session, org_id=org.id, name="Agent Co", created_by_user_id=agent.id
    )

    set_current_user(admin)
    resp = await client.put(f"/api/v1/companies/{company.id}", json={"name": "Admin Updated"})
    assert resp.status_code == 200
    assert resp.json()["name"] == "Admin Updated"


@pytest.mark.asyncio
async def test_org_admin_can_delete_any_company(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Admin Del", "org-admin-del")
    agent = await create_user(
        db_session,
        email=f"agent-admindel-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    admin = await create_user(
        db_session,
        email=f"admin-del-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    company = await create_company(
        db_session, org_id=org.id, name="To Delete", created_by_user_id=agent.id
    )

    set_current_user(admin)
    resp = await client.delete(f"/api/v1/companies/{company.id}")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_org_admin_can_update_any_location(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Admin Loc", "org-admin-loc")
    agent = await create_user(
        db_session,
        email=f"agent-adminloc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    admin = await create_user(
        db_session,
        email=f"admin-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    company = await create_company(db_session, org_id=org.id, name="Loc Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Agent Plant",
        created_by_user_id=agent.id,
    )

    set_current_user(admin)
    resp = await client.put(
        f"/api/v1/companies/locations/{location.id}",
        json={"name": "Admin Updated Plant"},
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Admin Updated Plant"


@pytest.mark.asyncio
async def test_org_admin_can_delete_any_location(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Admin DelLoc", "org-admin-delloc")
    agent = await create_user(
        db_session,
        email=f"agent-delloc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    admin = await create_user(
        db_session,
        email=f"admin-delloc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    company = await create_company(db_session, org_id=org.id, name="DelLoc Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="To Delete Plant",
        created_by_user_id=agent.id,
    )

    set_current_user(admin)
    resp = await client.delete(f"/api/v1/companies/locations/{location.id}")
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_created_by_user_id_set_on_create(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Created By", "org-created-by")
    agent = await create_user(
        db_session,
        email=f"agent-createdby-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(agent)

    resp = await client.post(
        "/api/v1/companies",
        json={
            "name": "Created By Co",
            "industry": "Manufacturing",
            "sector": "industrial",
            "subsector": "other",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data.get("createdByUserId") == str(agent.id)

    company_id = data["id"]
    loc_resp = await client.post(
        f"/api/v1/companies/{company_id}/locations",
        json={
            "companyId": company_id,
            "name": "Created By Plant",
            "city": "Monterrey",
            "state": "NL",
        },
    )
    assert loc_resp.status_code == 201
    loc_data = loc_resp.json()
    assert loc_data.get("createdByUserId") == str(agent.id)


@pytest.mark.asyncio
async def test_contractor_same_permissions_as_agent(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Contractor", "org-contractor")
    contractor = await create_user(
        db_session,
        email=f"contractor-{uid}@example.com",
        org_id=org.id,
        role=UserRole.CONTRACTOR.value,
        is_superuser=False,
    )
    other_agent = await create_user(
        db_session,
        email=f"other-agent-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(contractor)

    resp = await client.post(
        "/api/v1/companies",
        json={
            "name": "Contractor Co",
            "industry": "Manufacturing",
            "sector": "industrial",
            "subsector": "other",
        },
    )
    assert resp.status_code == 201
    company_id = resp.json()["id"]

    resp = await client.put(f"/api/v1/companies/{company_id}", json={"name": "Contractor Updated"})
    assert resp.status_code == 200

    other_company = await create_company(
        db_session, org_id=org.id, name="Other Co", created_by_user_id=other_agent.id
    )
    resp = await client.put(f"/api/v1/companies/{other_company.id}", json={"name": "Nope"})
    assert resp.status_code == 403

    resp = await client.delete(f"/api/v1/companies/{company_id}")
    assert resp.status_code == 403
