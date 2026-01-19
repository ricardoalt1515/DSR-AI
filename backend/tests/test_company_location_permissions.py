import pytest
from httpx import AsyncClient

from app.models.user import UserRole
from tests.test_multi_tenant import (
    create_company,
    create_location,
    create_org,
    create_project,
    create_user,
)


@pytest.mark.asyncio
async def test_agent_can_create_company_and_location(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Org Agent", "org-agent")
    user = await create_user(
        db_session,
        email="agent-create@example.com",
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
    org = await create_org(db_session, "Org Agent 2", "org-agent-2")
    agent_a = await create_user(
        db_session,
        email="agent-a@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    agent_b = await create_user(
        db_session,
        email="agent-b@example.com",
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
    org = await create_org(db_session, "Org Compliance", "org-compliance")
    compliance_user = await create_user(
        db_session,
        email="compliance@example.com",
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
    org = await create_org(db_session, "Org Compliance 2", "org-compliance-2")
    compliance_user = await create_user(
        db_session,
        email="compliance2@example.com",
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
    org = await create_org(db_session, "Org Project Delete", "org-project-delete")
    agent = await create_user(
        db_session,
        email="agent-delete@example.com",
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
