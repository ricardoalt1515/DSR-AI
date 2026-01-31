"""
Tests for Incoming Materials CRUD and RBAC.
"""

import uuid

import pytest
from conftest import create_company, create_location, create_org, create_user
from httpx import AsyncClient

from app.models.incoming_material import IncomingMaterial, IncomingMaterialCategory
from app.models.user import UserRole


@pytest.mark.asyncio
async def test_field_agent_can_create_and_update_incoming_materials(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    """Field agents can create and update incoming materials."""
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Materials", "org-materials")
    user = await create_user(
        db_session,
        email=f"agent-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Materials Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Plant 1",
    )

    set_current_user(user)

    create_payload = {
        "name": "Industrial Oil",
        "category": "oil",
        "volumeFrequency": "500 liters/month",
        "qualitySpec": "Grade A",
        "currentSupplier": "ACME Corp",
        "notes": "Monthly delivery",
    }

    create_response = await client.post(
        f"/api/v1/companies/locations/{location.id}/incoming-materials",
        json=create_payload,
    )
    assert create_response.status_code == 201
    created = create_response.json()
    assert created["name"] == "Industrial Oil"
    assert created["category"] == "oil"
    assert created["volumeFrequency"] == "500 liters/month"

    material_id = created["id"]
    update_response = await client.put(
        f"/api/v1/companies/locations/{location.id}/incoming-materials/{material_id}",
        json={"volumeFrequency": "1000 liters/month"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["volumeFrequency"] == "1000 liters/month"


@pytest.mark.asyncio
async def test_field_agent_cannot_delete_incoming_materials(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    """Field agents cannot delete incoming materials (admin only)."""
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Materials Deny", "org-materials-deny")
    user = await create_user(
        db_session,
        email=f"agent-deny-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Materials Co 2")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Plant 2",
    )

    material = IncomingMaterial(
        organization_id=org.id,
        location_id=location.id,
        name="Test Material",
        category=IncomingMaterialCategory.METALS,
        volume_frequency="100 kg/week",
        quality_spec=None,
        current_supplier=None,
        notes=None,
    )
    db_session.add(material)
    await db_session.commit()

    set_current_user(user)

    delete_response = await client.delete(
        f"/api/v1/companies/locations/{location.id}/incoming-materials/{material.id}",
    )
    assert delete_response.status_code == 403


@pytest.mark.asyncio
async def test_admin_can_delete_incoming_materials(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    """Org admin users can delete incoming materials."""
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Admin Delete", "org-admin-delete")
    user = await create_user(
        db_session,
        email=f"org-admin-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,  # Must be ORG_ADMIN to delete (per policies.py)
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Admin Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Plant Admin",
    )

    material = IncomingMaterial(
        organization_id=org.id,
        location_id=location.id,
        name="Deletable Material",
        category=IncomingMaterialCategory.CHEMICALS,
        volume_frequency="50 liters/day",
    )
    db_session.add(material)
    await db_session.commit()

    set_current_user(user)

    delete_response = await client.delete(
        f"/api/v1/companies/locations/{location.id}/incoming-materials/{material.id}",
    )
    assert delete_response.status_code == 200


@pytest.mark.asyncio
async def test_non_writer_cannot_manage_incoming_materials(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    """Compliance users cannot create incoming materials."""
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Readonly Materials", "org-readonly-mat")
    user = await create_user(
        db_session,
        email=f"compliance-{uid}@example.com",
        org_id=org.id,
        role=UserRole.COMPLIANCE.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Readonly Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Plant Readonly",
    )

    set_current_user(user)

    response = await client.post(
        f"/api/v1/companies/locations/{location.id}/incoming-materials",
        json={
            "name": "Denied Material",
            "category": "wood",
            "volumeFrequency": "10 tons/year",
        },
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_location_detail_includes_incoming_materials(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    """Location detail endpoint includes incoming materials."""
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Detail Materials", "org-detail-mat")
    user = await create_user(
        db_session,
        email=f"viewer-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Detail Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Plant Detail",
    )

    material = IncomingMaterial(
        organization_id=org.id,
        location_id=location.id,
        name="Location Material",
        category=IncomingMaterialCategory.PLASTICS,
        volume_frequency="200 kg/month",
    )
    db_session.add(material)
    await db_session.commit()

    set_current_user(user)

    response = await client.get(f"/api/v1/companies/locations/{location.id}")
    assert response.status_code == 200
    data = response.json()
    assert "incomingMaterials" in data
    assert len(data["incomingMaterials"]) == 1
    assert data["incomingMaterials"][0]["name"] == "Location Material"
    assert data["incomingMaterials"][0]["category"] == "plastics"


@pytest.mark.asyncio
async def test_list_incoming_materials(
    client: AsyncClient,
    db_session,
    set_current_user,
):
    """List endpoint returns all materials for a location."""
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org List Materials", "org-list-mat")
    user = await create_user(
        db_session,
        email=f"lister-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="List Co")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name="Plant List",
    )

    # Create multiple materials (names ordered alphabetically: Glass Material < Wood Material)
    materials_data = [
        ("Wood Material", IncomingMaterialCategory.WOOD, "100 units/week"),
        ("Glass Material", IncomingMaterialCategory.GLASS, "200 units/week"),
    ]
    for name, cat, vol in materials_data:
        material = IncomingMaterial(
            organization_id=org.id,
            location_id=location.id,
            name=name,
            category=cat,
            volume_frequency=vol,
        )
        db_session.add(material)
    await db_session.commit()

    set_current_user(user)

    response = await client.get(f"/api/v1/companies/locations/{location.id}/incoming-materials")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Verify ordering by name (alphabetical)
    assert data[0]["name"] == "Glass Material"
    assert data[0]["category"] == "glass"
    assert data[1]["name"] == "Wood Material"
    assert data[1]["category"] == "wood"
