import uuid

import pytest
from conftest import create_company, create_location, create_org, create_user
from httpx import AsyncClient

from app.models.user import UserRole


@pytest.mark.asyncio
async def test_list_companies(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org List Co", "org-list-co")
    user = await create_user(
        db_session,
        email=f"list-co-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    await create_company(db_session, org_id=org.id, name="Company A")
    await create_company(db_session, org_id=org.id, name="Company B")

    set_current_user(user)
    response = await client.get("/api/v1/companies/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = {c["name"] for c in data}
    assert "Company A" in names
    assert "Company B" in names


@pytest.mark.asyncio
async def test_create_company_success(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Create Co", "org-create-co")
    user = await create_user(
        db_session,
        email=f"create-co-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    response = await client.post(
        "/api/v1/companies/",
        json={
            "name": "New Company",
            "industry": "Technology",
            "sector": "industrial",
            "subsector": "other",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Company"
    assert data["industry"] == "Technology"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_company_missing_required_field(
    client: AsyncClient, db_session, set_current_user
):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Missing Field", "org-missing-field")
    user = await create_user(
        db_session,
        email=f"missing-field-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    response = await client.post(
        "/api/v1/companies/",
        json={
            "name": "Bad Co",
            "industry": "Tech",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_company_detail(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Detail Co", "org-detail-co")
    user = await create_user(
        db_session,
        email=f"detail-co-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Detail Company")
    await create_location(db_session, org_id=org.id, company_id=company.id, name="Location 1")

    set_current_user(user)
    response = await client.get(f"/api/v1/companies/{company.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Detail Company"
    assert "locations" in data
    assert len(data["locations"]) == 1


@pytest.mark.asyncio
async def test_get_company_not_found(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Not Found", "org-not-found")
    user = await create_user(
        db_session,
        email=f"not-found-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )

    set_current_user(user)
    fake_id = uuid.uuid4()
    response = await client.get(f"/api/v1/companies/{fake_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_company(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Update Co", "org-update-co")
    user = await create_user(
        db_session,
        email=f"update-co-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Old Name")

    set_current_user(user)
    response = await client.put(
        f"/api/v1/companies/{company.id}",
        json={"name": "New Name"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"


@pytest.mark.asyncio
async def test_list_locations(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org List Loc", "org-list-loc")
    user = await create_user(
        db_session,
        email=f"list-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Loc Company")
    await create_location(db_session, org_id=org.id, company_id=company.id, name="Loc A")
    await create_location(db_session, org_id=org.id, company_id=company.id, name="Loc B")

    set_current_user(user)
    response = await client.get("/api/v1/companies/locations")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_create_location_success(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Create Loc", "org-create-loc")
    user = await create_user(
        db_session,
        email=f"create-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Loc Parent")

    set_current_user(user)
    response = await client.post(
        f"/api/v1/companies/{company.id}/locations",
        json={
            "companyId": str(company.id),
            "name": "New Location",
            "city": "Austin",
            "state": "TX",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Location"
    assert data["city"] == "Austin"


@pytest.mark.asyncio
async def test_get_location_detail(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Loc Detail", "org-loc-detail")
    user = await create_user(
        db_session,
        email=f"loc-detail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Loc Detail Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Detail Location"
    )

    set_current_user(user)
    response = await client.get(f"/api/v1/companies/locations/{location.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Detail Location"
    assert "contacts" in data


@pytest.mark.asyncio
async def test_update_location(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Update Loc", "org-update-loc")
    user = await create_user(
        db_session,
        email=f"update-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Update Loc Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Old Loc Name"
    )

    set_current_user(user)
    response = await client.put(
        f"/api/v1/companies/locations/{location.id}",
        json={"name": "New Loc Name"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Loc Name"


@pytest.mark.asyncio
async def test_list_locations_filters_by_company(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Filter Loc", "org-filter-loc")
    user = await create_user(
        db_session,
        email=f"filter-loc-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company_a = await create_company(db_session, org_id=org.id, name="Filter Co A")
    company_b = await create_company(db_session, org_id=org.id, name="Filter Co B")
    await create_location(db_session, org_id=org.id, company_id=company_a.id, name="Loc A1")
    await create_location(db_session, org_id=org.id, company_id=company_a.id, name="Loc A2")
    await create_location(db_session, org_id=org.id, company_id=company_b.id, name="Loc B1")

    set_current_user(user)
    response = await client.get(f"/api/v1/companies/locations?company_id={company_a.id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = {loc["name"] for loc in data}
    assert "Loc A1" in names
    assert "Loc A2" in names
    assert "Loc B1" not in names
