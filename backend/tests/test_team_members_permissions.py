import pytest
from httpx import AsyncClient

from app.models.user import UserRole
from tests.test_multi_tenant import create_org, create_user


@pytest.mark.asyncio
async def test_field_agent_cannot_list_team_members(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Org Team", "org-team")
    agent = await create_user(
        db_session,
        email="agent-team@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(agent)

    response = await client.get("/api/v1/organizations/current/users")
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_field_agent_cannot_create_team_members(
    client: AsyncClient, db_session, set_current_user
):
    org = await create_org(db_session, "Org Team Create", "org-team-create")
    agent = await create_user(
        db_session,
        email="agent-create@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(agent)

    response = await client.post(
        "/api/v1/organizations/current/users",
        json={
            "email": "newuser@example.com",
            "password": "Password1",
            "first_name": "New",
            "last_name": "User",
            "role": UserRole.FIELD_AGENT.value,
        },
    )
    assert response.status_code == 403
