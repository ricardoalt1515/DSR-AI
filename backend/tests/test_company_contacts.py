import uuid
from datetime import UTC, datetime

import pytest
from conftest import create_company, create_org, create_user
from httpx import AsyncClient

from app.models.company_contact import CompanyContact
from app.models.user import UserRole


@pytest.mark.asyncio
async def test_create_company_contact_and_company_detail_returns_all_contacts_sorted(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Company Contacts", "org-company-contacts")
    user = await create_user(
        db_session,
        email=f"company-contacts-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Contacts Co")
    set_current_user(user)

    response_b = await client.post(
        f"/api/v1/companies/{company.id}/contacts",
        json={"name": "Zoe", "email": "zoe@example.com", "isPrimary": False},
    )
    assert response_b.status_code == 201

    response_a = await client.post(
        f"/api/v1/companies/{company.id}/contacts",
        json={"name": "Ana", "phone": "5551234", "isPrimary": True},
    )
    assert response_a.status_code == 201

    detail_response = await client.get(f"/api/v1/companies/{company.id}")
    assert detail_response.status_code == 200
    contacts = detail_response.json()["contacts"]
    assert len(contacts) == 2
    assert [contact["name"] for contact in contacts] == ["Ana", "Zoe"]
    assert contacts[0]["isPrimary"] is True


@pytest.mark.asyncio
async def test_update_company_contact_does_not_affect_others(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Update Contacts", "org-update-contacts")
    user = await create_user(
        db_session,
        email=f"update-contacts-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Update Contacts Co")
    set_current_user(user)

    first = await client.post(
        f"/api/v1/companies/{company.id}/contacts",
        json={"name": "First", "phone": "1112222", "isPrimary": False},
    )
    second = await client.post(
        f"/api/v1/companies/{company.id}/contacts",
        json={"name": "Second", "phone": "3334444", "isPrimary": False},
    )
    assert first.status_code == 201
    assert second.status_code == 201

    first_id = first.json()["id"]
    update_response = await client.put(
        f"/api/v1/companies/{company.id}/contacts/{first_id}",
        json={"title": "Operations Lead", "isPrimary": True},
    )
    assert update_response.status_code == 200

    detail_response = await client.get(f"/api/v1/companies/{company.id}")
    assert detail_response.status_code == 200
    contacts = {contact["name"]: contact for contact in detail_response.json()["contacts"]}
    assert contacts["First"]["title"] == "Operations Lead"
    assert contacts["First"]["isPrimary"] is True
    assert contacts["Second"]["title"] is None
    assert contacts["Second"]["isPrimary"] is False


@pytest.mark.asyncio
async def test_delete_company_contact_does_not_affect_others(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Delete Contacts", "org-delete-contacts")
    user = await create_user(
        db_session,
        email=f"delete-contacts-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Delete Contacts Co")
    set_current_user(user)

    first = await client.post(
        f"/api/v1/companies/{company.id}/contacts",
        json={"name": "Keep", "phone": "2223333"},
    )
    second = await client.post(
        f"/api/v1/companies/{company.id}/contacts",
        json={"name": "Delete", "phone": "4445555"},
    )
    assert first.status_code == 201
    assert second.status_code == 201

    delete_response = await client.delete(
        f"/api/v1/companies/{company.id}/contacts/{second.json()['id']}",
    )
    assert delete_response.status_code == 200

    detail_response = await client.get(f"/api/v1/companies/{company.id}")
    assert detail_response.status_code == 200
    contacts = detail_response.json()["contacts"]
    assert len(contacts) == 1
    assert contacts[0]["name"] == "Keep"


@pytest.mark.asyncio
async def test_setting_second_primary_returns_deterministic_409(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Primary Conflict", "org-primary-conflict")
    user = await create_user(
        db_session,
        email=f"primary-conflict-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Primary Conflict Co")
    set_current_user(user)

    first = await client.post(
        f"/api/v1/companies/{company.id}/contacts",
        json={"name": "Primary One", "phone": "1112223", "isPrimary": True},
    )
    assert first.status_code == 201

    second = await client.post(
        f"/api/v1/companies/{company.id}/contacts",
        json={"name": "Primary Two", "phone": "1112224", "isPrimary": False},
    )
    assert second.status_code == 201

    conflict_response = await client.put(
        f"/api/v1/companies/{company.id}/contacts/{second.json()['id']}",
        json={"isPrimary": True},
    )
    assert conflict_response.status_code == 409
    assert conflict_response.json()["detail"] == "Company already has a primary contact"


@pytest.mark.asyncio
async def test_archived_company_blocks_company_contact_writes(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Archived Contacts", "org-archived-contacts")
    user = await create_user(
        db_session,
        email=f"archived-contacts-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Archived Contacts Co")
    set_current_user(user)

    created = await client.post(
        f"/api/v1/companies/{company.id}/contacts",
        json={"name": "Before Archive", "phone": "7778888"},
    )
    assert created.status_code == 201

    company.archived_at = datetime.now(UTC)
    db_session.add(company)
    await db_session.commit()

    create_response = await client.post(
        f"/api/v1/companies/{company.id}/contacts",
        json={"name": "Blocked", "phone": "7779999"},
    )
    update_response = await client.put(
        f"/api/v1/companies/{company.id}/contacts/{created.json()['id']}",
        json={"title": "Blocked Update"},
    )
    delete_response = await client.delete(
        f"/api/v1/companies/{company.id}/contacts/{created.json()['id']}",
    )

    assert create_response.status_code == 409
    assert update_response.status_code == 409
    assert delete_response.status_code == 409


@pytest.mark.asyncio
async def test_company_contact_tenant_isolation_blocks_cross_org_access(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org_a = await create_org(db_session, "Org A Contacts", "org-a-contacts")
    org_b = await create_org(db_session, "Org B Contacts", "org-b-contacts")

    user_a = await create_user(
        db_session,
        email=f"org-a-contacts-{uid}@example.com",
        org_id=org_a.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    user_b = await create_user(
        db_session,
        email=f"org-b-contacts-{uid}@example.com",
        org_id=org_b.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company_a = await create_company(db_session, org_id=org_a.id, name="Company A")
    company_b = await create_company(db_session, org_id=org_b.id, name="Company B")

    set_current_user(user_b)
    create_b = await client.post(
        f"/api/v1/companies/{company_b.id}/contacts",
        json={"name": "Org B Contact", "phone": "9090101"},
    )
    assert create_b.status_code == 201

    set_current_user(user_a)
    cross_update = await client.put(
        f"/api/v1/companies/{company_a.id}/contacts/{create_b.json()['id']}",
        json={"title": "Should Fail"},
    )
    cross_delete = await client.delete(
        f"/api/v1/companies/{company_a.id}/contacts/{create_b.json()['id']}",
    )

    assert cross_update.status_code == 404
    assert cross_delete.status_code == 404


@pytest.mark.asyncio
async def test_create_company_with_legacy_contact_fields_creates_primary_company_contact(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Legacy Compat", "org-legacy-compat")
    user = await create_user(
        db_session,
        email=f"legacy-compat-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    set_current_user(user)

    create_response = await client.post(
        "/api/v1/companies/",
        json={
            "name": "Legacy Contact Co",
            "industry": "Technology",
            "sector": "industrial",
            "subsector": "other",
            "customerType": "buyer",
            "contactName": "Legacy Primary",
            "contactEmail": "legacy.primary@example.com",
            "contactPhone": "5551010",
        },
    )
    assert create_response.status_code == 201
    created_company = create_response.json()
    assert created_company["contactName"] == "Legacy Primary"
    assert created_company["contactEmail"] == "legacy.primary@example.com"
    assert created_company["contactPhone"] == "5551010"
    assert len(created_company["contacts"]) == 1
    assert created_company["contacts"][0]["isPrimary"] is True
    assert created_company["contacts"][0]["name"] == "Legacy Primary"

    db_contact = await db_session.get(CompanyContact, created_company["contacts"][0]["id"])
    assert db_contact is not None
    assert db_contact.is_primary is True
