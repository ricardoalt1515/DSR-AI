import pytest
from httpx import AsyncClient

from app.models.location_contact import LocationContact
from app.models.user import UserRole
from tests.test_multi_tenant import create_company, create_location, create_org, create_user


@pytest.mark.asyncio
async def test_field_agent_can_manage_location_contacts(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    org = await create_org(db_session, "Org Contacts", "org-contacts")
    user = await create_user(
        db_session,
        email="agent@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Contact Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Plant 1",
    )

    set_current_user(user)

    create_payload = {
        "name": "Jane Contact",
        "email": "jane@example.com",
        "phone": "555-0101",
        "title": "Ops Lead",
        "notes": "Primary contact",
    }

    create_response = await client.post(
        f"/api/v1/companies/locations/{location.id}/contacts",
        json=create_payload,
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["name"] == "Jane Contact"

    contact_id = created["id"]
    update_response = await client.put(
        f"/api/v1/companies/locations/{location.id}/contacts/{contact_id}",
        json={"title": "Plant Manager"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["title"] == "Plant Manager"

    delete_response = await client.delete(
        f"/api/v1/companies/locations/{location.id}/contacts/{contact_id}",
    )
    assert delete_response.status_code == 200


@pytest.mark.asyncio
async def test_non_writer_cannot_manage_location_contacts(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    org = await create_org(db_session, "Org Readonly", "org-readonly")
    user = await create_user(
        db_session,
        email="compliance@example.com",
        org_id=org.id,
        role=UserRole.COMPLIANCE.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Readonly Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Plant 2",
    )

    set_current_user(user)

    response = await client.post(
        f"/api/v1/companies/locations/{location.id}/contacts",
        json={"name": "Denied"},
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_location_detail_includes_contacts(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    org = await create_org(db_session, "Org Detail", "org-detail")
    user = await create_user(
        db_session,
        email="viewer@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Detail Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Plant 3",
    )

    contact = LocationContact(
        organization_id=org.id,
        location_id=location.id,
        name="Location Contact",
        email=None,
        phone=None,
        title=None,
        notes=None,
    )
    db_session.add(contact)
    await db_session.commit()

    set_current_user(user)

    response = await client.get(f"/api/v1/companies/locations/{location.id}")
    assert response.status_code == 200
    data = response.json()
    assert "contacts" in data
    assert len(data["contacts"]) == 1
    assert data["contacts"][0]["name"] == "Location Contact"
