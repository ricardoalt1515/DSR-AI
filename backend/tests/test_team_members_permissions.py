import uuid

import pytest
from conftest import create_org, create_user
from httpx import AsyncClient

from app.models.user import UserRole


@pytest.mark.asyncio
async def test_field_agent_cannot_list_team_members(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Team", "org-team")
    agent = await create_user(
        db_session,
        email=f"agent-team-{uid}@example.com",
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
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Team Create", "org-team-create")
    agent = await create_user(
        db_session,
        email=f"agent-create-{uid}@example.com",
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
