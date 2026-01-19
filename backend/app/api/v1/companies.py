"""
Companies API endpoints.
CRUD operations for companies and their locations.
"""

from uuid import UUID

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import load_only, selectinload

from app.api.dependencies import (
    AsyncDB,
    CurrentCompanyCreator,
    CurrentCompanyDeleter,
    CurrentCompanyEditor,
    CurrentCompanyLocationCreator,
    CurrentLocationContactsCreator,
    CurrentLocationContactsDeleter,
    CurrentLocationContactsEditor,
    CurrentLocationDeleter,
    CurrentLocationEditor,
    CurrentUser,
    OrganizationContext,
    RateLimitUser10,
    RateLimitUser30,
    RateLimitUser60,
)
from app.models import Company, Location, LocationContact, Project
from app.schemas.common import SuccessResponse
from app.schemas.company import (
    CompanyCreate,
    CompanyDetail,
    CompanySummary,
    CompanyUpdate,
)
from app.schemas.location import (
    LocationCreate,
    LocationDetail,
    LocationProjectSummary,
    LocationSummary,
    LocationUpdate,
)
from app.schemas.location_contact import (
    LocationContactCreate,
    LocationContactRead,
    LocationContactUpdate,
)

router = APIRouter()


async def _get_project_counts_by_location(
    db: AsyncDB,
    org_id: UUID,
    location_ids: list[UUID],
    current_user: CurrentUser,
) -> dict[UUID, int]:
    if not location_ids:
        return {}

    count_conditions = [
        Project.organization_id == org_id,
        Project.location_id.in_(location_ids),
    ]
    if not current_user.can_see_all_org_projects():
        count_conditions.append(Project.user_id == current_user.id)

    counts_result = await db.execute(
        select(
            Project.location_id,
            func.count(Project.id).label("project_count"),
        )
        .where(*count_conditions)
        .group_by(Project.location_id)
    )
    return {row.location_id: row.project_count for row in counts_result}


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMPANIES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.get("/", response_model=list[CompanySummary])
async def list_companies(
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    _rate_limit: RateLimitUser60,
):
    """List all companies."""
    result = await db.execute(
        select(Company).where(Company.organization_id == org.id).order_by(Company.name)
    )
    companies = result.scalars().all()
    return companies


@router.post("/", response_model=CompanyDetail, status_code=status.HTTP_201_CREATED)
async def create_company(
    company_data: CompanyCreate,
    db: AsyncDB,
    current_user: CurrentCompanyCreator,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    """Create a new company."""
    company = Company(
        **company_data.model_dump(),
        organization_id=org.id,
        created_by_user_id=current_user.id,
    )
    db.add(company)
    await db.commit()
    await db.refresh(company)

    company_summary = CompanySummary.model_validate(company, from_attributes=True)

    return CompanyDetail(
        **company_summary.model_dump(),
        locations=[],
    )


# NOTE: This route MUST be before /{company_id} to avoid "locations" being parsed as UUID
@router.get("/locations", response_model=list[LocationSummary])
async def list_all_locations(
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    _rate_limit: RateLimitUser60,
    company_id: UUID | None = None,
):
    """List all locations, optionally filtered by company."""
    query = select(Location).where(Location.organization_id == org.id).order_by(Location.name)

    if company_id:
        query = query.where(Location.company_id == company_id)

    result = await db.execute(query)
    locations = result.scalars().all()

    location_ids = [loc.id for loc in locations]
    project_counts_by_location = await _get_project_counts_by_location(
        db=db,
        org_id=org.id,
        location_ids=location_ids,
        current_user=current_user,
    )

    return [
        LocationSummary.model_validate(loc, from_attributes=True).model_copy(
            update={"project_count": project_counts_by_location.get(loc.id, 0)}
        )
        for loc in locations
    ]


@router.get("/{company_id}", response_model=CompanyDetail)
async def get_company(
    company_id: UUID,
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    _rate_limit: RateLimitUser60,
):
    """Get company details with locations."""
    result = await db.execute(
        select(Company)
        .options(selectinload(Company.locations))
        .where(Company.id == company_id, Company.organization_id == org.id)
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Company {company_id} not found"
        )

    locations = company.locations or []
    location_ids = [location.id for location in locations]
    project_counts_by_location = await _get_project_counts_by_location(
        db=db,
        org_id=org.id,
        location_ids=location_ids,
        current_user=current_user,
    )

    company_summary = CompanySummary.model_validate(company, from_attributes=True)
    locations_summary = [
        LocationSummary.model_validate(location, from_attributes=True).model_copy(
            update={"project_count": project_counts_by_location.get(location.id, 0)}
        )
        for location in locations
    ]

    return CompanyDetail(
        **company_summary.model_dump(),
        locations=locations_summary,
    )


@router.put("/{company_id}", response_model=CompanyDetail)
async def update_company(
    company_id: UUID,
    company_data: CompanyUpdate,
    db: AsyncDB,
    current_user_company: CurrentCompanyEditor,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    """Update company information."""
    current_user, company = current_user_company

    # Update only provided fields
    update_data = company_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)

    await db.commit()
    await db.refresh(company)

    locations = company.locations or []
    location_ids = [location.id for location in locations]
    project_counts_by_location = await _get_project_counts_by_location(
        db=db,
        org_id=org.id,
        location_ids=location_ids,
        current_user=current_user,
    )

    company_summary = CompanySummary.model_validate(company, from_attributes=True)
    locations_summary = [
        LocationSummary.model_validate(location, from_attributes=True).model_copy(
            update={"project_count": project_counts_by_location.get(location.id, 0)}
        )
        for location in locations
    ]

    return CompanyDetail(
        **company_summary.model_dump(),
        locations=locations_summary,
    )


@router.delete("/{company_id}", response_model=SuccessResponse)
async def delete_company(
    company_id: UUID,
    db: AsyncDB,
    current_user: CurrentCompanyDeleter,
    org: OrganizationContext,
    _rate_limit: RateLimitUser10,
):
    """
    Delete company.
    Cascade deletes all locations and projects.
    """
    result = await db.execute(
        select(Company).where(
            Company.id == company_id,
            Company.organization_id == org.id,
        )
    )
    company = result.scalar_one_or_none()

    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Company {company_id} not found"
        )

    await db.delete(company)
    await db.commit()

    return SuccessResponse(message=f"Company {company.name} deleted successfully")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOCATION CONTACTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.post(
    "/locations/{location_id}/contacts",
    response_model=LocationContactRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_location_contact(
    location_id: UUID,
    contact_data: LocationContactCreate,
    db: AsyncDB,
    current_user: CurrentLocationContactsCreator,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    """Create a contact for a location."""
    result = await db.execute(
        select(Location).where(
            Location.id == location_id,
            Location.organization_id == org.id,
        )
    )
    location = result.scalar_one_or_none()
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found",
        )

    contact = LocationContact(
        **contact_data.model_dump(),
        organization_id=org.id,
        location_id=location_id,
    )
    db.add(contact)
    await db.commit()
    await db.refresh(contact)
    return LocationContactRead.model_validate(contact, from_attributes=True)


@router.put(
    "/locations/{location_id}/contacts/{contact_id}",
    response_model=LocationContactRead,
)
async def update_location_contact(
    location_id: UUID,
    contact_id: UUID,
    contact_data: LocationContactUpdate,
    db: AsyncDB,
    current_user: CurrentLocationContactsEditor,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    """Update a contact for a location."""
    result = await db.execute(
        select(LocationContact).where(
            LocationContact.id == contact_id,
            LocationContact.location_id == location_id,
            LocationContact.organization_id == org.id,
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location contact {contact_id} not found",
        )

    update_data = contact_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(contact, field, value)

    await db.commit()
    await db.refresh(contact)
    return LocationContactRead.model_validate(contact, from_attributes=True)


@router.delete(
    "/locations/{location_id}/contacts/{contact_id}",
    response_model=SuccessResponse,
)
async def delete_location_contact(
    location_id: UUID,
    contact_id: UUID,
    db: AsyncDB,
    current_user: CurrentLocationContactsDeleter,
    org: OrganizationContext,
    _rate_limit: RateLimitUser10,
):
    """Delete a contact from a location."""
    result = await db.execute(
        select(LocationContact).where(
            LocationContact.id == contact_id,
            LocationContact.location_id == location_id,
            LocationContact.organization_id == org.id,
        )
    )
    contact = result.scalar_one_or_none()

    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location contact {contact_id} not found",
        )

    await db.delete(contact)
    await db.commit()

    return SuccessResponse(message=f"Contact {contact.name} deleted successfully")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOCATIONS (nested under companies)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


@router.get("/{company_id}/locations", response_model=list[LocationSummary])
async def list_company_locations(
    company_id: UUID,
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    _rate_limit: RateLimitUser60,
):
    """List all locations for a company."""
    company = await db.get(Company, company_id)
    if not company or company.organization_id != org.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found",
        )

    return await list_all_locations(
        db=db,
        current_user=current_user,
        org=org,
        _rate_limit=_rate_limit,
        company_id=company_id,
    )


@router.post(
    "/{company_id}/locations",
    response_model=LocationSummary,
    status_code=status.HTTP_201_CREATED,
)
async def create_location(
    company_id: UUID,
    location_data: LocationCreate,
    db: AsyncDB,
    current_user_company: CurrentCompanyLocationCreator,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    """Create a new location for a company."""
    current_user, _company = current_user_company

    # Override company_id from URL (security)
    location_dict = location_data.model_dump()
    location_dict["company_id"] = company_id

    location = Location(
        **location_dict,
        organization_id=org.id,
        created_by_user_id=current_user.id,
    )
    db.add(location)
    await db.commit()
    await db.refresh(location)
    return location


@router.get("/locations/{location_id}", response_model=LocationDetail)
async def get_location(
    location_id: UUID,
    db: AsyncDB,
    current_user: CurrentUser,
    org: OrganizationContext,
    _rate_limit: RateLimitUser60,
):
    """Get location details with company and projects."""
    result = await db.execute(
        select(Location)
        .options(
            selectinload(Location.company),
            selectinload(Location.contacts),
        )
        .where(
            Location.id == location_id,
            Location.organization_id == org.id,
        )
    )
    location = result.scalar_one_or_none()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found",
        )

    project_conditions = [
        Project.organization_id == org.id,
        Project.location_id == location.id,
    ]
    if not current_user.can_see_all_org_projects():
        project_conditions.append(Project.user_id == current_user.id)

    projects_result = await db.execute(
        select(Project)
        .options(load_only(Project.id, Project.name, Project.status, Project.created_at))
        .where(*project_conditions)
        .order_by(Project.created_at.desc())
    )
    projects = projects_result.scalars().all()

    company_summary = (
        CompanySummary.model_validate(location.company, from_attributes=True)
        if location.company
        else None
    )

    location_summary = LocationSummary.model_validate(location, from_attributes=True).model_copy(
        update={"project_count": len(projects)}
    )
    contacts_summary = [
        LocationContactRead.model_validate(contact, from_attributes=True)
        for contact in (location.contacts or [])
    ]
    return LocationDetail(
        **location_summary.model_dump(),
        company=company_summary,
        projects=[LocationProjectSummary.model_validate(p, from_attributes=True) for p in projects],
        contacts=contacts_summary,
    )


@router.put("/locations/{location_id}", response_model=LocationDetail)
async def update_location(
    location_id: UUID,
    location_data: LocationUpdate,
    db: AsyncDB,
    current_user_location: CurrentLocationEditor,
    org: OrganizationContext,
    _rate_limit: RateLimitUser30,
):
    """Update location information."""
    current_user, location = current_user_location

    # Update only provided fields
    update_data = location_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)

    await db.commit()

    result = await db.execute(
        select(Location)
        .options(selectinload(Location.company))
        .where(
            Location.id == location_id,
            Location.organization_id == org.id,
        )
    )
    location = result.scalar_one_or_none()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found",
        )

    project_conditions = [
        Project.organization_id == org.id,
        Project.location_id == location.id,
    ]
    if not current_user.can_see_all_org_projects():
        project_conditions.append(Project.user_id == current_user.id)

    projects_result = await db.execute(
        select(Project)
        .options(load_only(Project.id, Project.name, Project.status, Project.created_at))
        .where(*project_conditions)
        .order_by(Project.created_at.desc())
    )
    projects = projects_result.scalars().all()

    company_summary = (
        CompanySummary.model_validate(location.company, from_attributes=True)
        if location.company
        else None
    )

    location_summary = LocationSummary.model_validate(location, from_attributes=True).model_copy(
        update={"project_count": len(projects)}
    )
    return LocationDetail(
        **location_summary.model_dump(),
        company=company_summary,
        projects=[
            LocationProjectSummary.model_validate(project, from_attributes=True)
            for project in projects
        ],
    )


@router.delete("/locations/{location_id}", response_model=SuccessResponse)
async def delete_location(
    location_id: UUID,
    db: AsyncDB,
    current_user: CurrentLocationDeleter,
    org: OrganizationContext,
    _rate_limit: RateLimitUser10,
):
    """
    Delete location.
    Cascade deletes all projects at this location.
    """
    result = await db.execute(
        select(Location).where(
            Location.id == location_id,
            Location.organization_id == org.id,
        )
    )
    location = result.scalar_one_or_none()

    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"Location {location_id} not found"
        )

    await db.delete(location)
    await db.commit()

    return SuccessResponse(message=f"Location {location.name} deleted successfully")
