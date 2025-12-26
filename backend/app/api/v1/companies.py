"""
Companies API endpoints.
CRUD operations for companies and their locations.
"""
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models import Company, Location
from app.schemas.company import (
    CompanyCreate,
    CompanyUpdate,
    CompanySummary,
    CompanyDetail,
)
from app.schemas.location import (
    LocationCreate,
    LocationUpdate,
    LocationSummary,
    LocationDetail,
)
from app.schemas.common import SuccessResponse
from app.api.dependencies import (
    CurrentSuperUser,
    CurrentUser,
    AsyncDB,
    RateLimitUser60,
    RateLimitUser30,
    RateLimitUser10,
)

router = APIRouter()


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# COMPANIES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/", response_model=List[CompanySummary])
async def list_companies(
    db: AsyncDB,
    current_user: CurrentUser,
    _rate_limit: RateLimitUser60,
):
    """List all companies."""
    result = await db.execute(
        select(Company)
        .options(selectinload(Company.locations))
        .order_by(Company.name)
    )
    companies = result.scalars().all()
    return companies


@router.post("/", response_model=CompanyDetail, status_code=status.HTTP_201_CREATED)
async def create_company(
    company_data: CompanyCreate,
    db: AsyncDB,
    current_user: CurrentUser,
    _rate_limit: RateLimitUser30,
):
    """Create a new company."""
    company = Company(**company_data.model_dump())
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


# NOTE: This route MUST be before /{company_id} to avoid "locations" being parsed as UUID
@router.get("/locations", response_model=List[LocationSummary])
async def list_all_locations(
    db: AsyncDB,
    current_user: CurrentUser,
    _rate_limit: RateLimitUser60,
    company_id: Optional[UUID] = None,
):
    """List all locations, optionally filtered by company."""
    query = (
        select(Location)
        .options(
            selectinload(Location.company),
            selectinload(Location.projects),
        )
        .order_by(Location.name)
    )

    if company_id:
        query = query.where(Location.company_id == company_id)

    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{company_id}", response_model=CompanyDetail)
async def get_company(
    company_id: UUID,
    db: AsyncDB,
    current_user: CurrentUser,
    _rate_limit: RateLimitUser60,
):
    """Get company details with locations."""
    result = await db.execute(
        select(Company)
        .options(selectinload(Company.locations))
        .where(Company.id == company_id)
    )
    company = result.scalar_one_or_none()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found"
        )
    
    return company


@router.put("/{company_id}", response_model=CompanyDetail)
async def update_company(
    company_id: UUID,
    company_data: CompanyUpdate,
    db: AsyncDB,
    current_user: CurrentSuperUser,
    _rate_limit: RateLimitUser30,
):
    """Update company information."""
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found"
        )
    
    # Update only provided fields
    update_data = company_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(company, field, value)
    
    await db.commit()
    await db.refresh(company)
    return company


@router.delete("/{company_id}", response_model=SuccessResponse)
async def delete_company(
    company_id: UUID,
    db: AsyncDB,
    current_user: CurrentSuperUser,
    _rate_limit: RateLimitUser10,
):
    """
    Delete company.
    Cascade deletes all locations and projects.
    """
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found"
        )
    
    await db.delete(company)
    await db.commit()
    
    return SuccessResponse(message=f"Company {company.name} deleted successfully")


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LOCATIONS (nested under companies)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@router.get("/{company_id}/locations", response_model=List[LocationSummary])
async def list_company_locations(
    company_id: UUID,
    db: AsyncDB,
    current_user: CurrentUser,
    _rate_limit: RateLimitUser60,
):
    """List all locations for a company."""
    result = await db.execute(
        select(Location)
        .options(selectinload(Location.projects))
        .where(Location.company_id == company_id)
        .order_by(Location.name)
    )
    locations = result.scalars().all()
    return locations


@router.post(
    "/{company_id}/locations",
    response_model=LocationSummary,
    status_code=status.HTTP_201_CREATED,
)
async def create_location(
    company_id: UUID,
    location_data: LocationCreate,
    db: AsyncDB,
    current_user: CurrentUser,
    _rate_limit: RateLimitUser30,
):
    """Create a new location for a company."""
    # Verify company exists
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company {company_id} not found"
        )
    
    # Override company_id from URL (security)
    location_dict = location_data.model_dump()
    location_dict['company_id'] = company_id
    
    location = Location(**location_dict)
    db.add(location)
    await db.commit()
    
    # Reload with relationships for response
    result = await db.execute(
        select(Location)
        .options(
            selectinload(Location.company).selectinload(Company.locations),
            selectinload(Location.projects)
        )
        .where(Location.id == location.id)
    )
    location = result.scalar_one()
    
    return location


@router.get("/locations/{location_id}", response_model=LocationDetail)
async def get_location(
    location_id: UUID,
    db: AsyncDB,
    current_user: CurrentUser,
    _rate_limit: RateLimitUser60,
):
    """Get location details with company and projects."""
    result = await db.execute(
        select(Location)
        .options(
            selectinload(Location.company).selectinload(Company.locations),
            selectinload(Location.projects)
        )
        .where(Location.id == location_id)
    )
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found"
        )
    
    return location


@router.put("/locations/{location_id}", response_model=LocationDetail)
async def update_location(
    location_id: UUID,
    location_data: LocationUpdate,
    db: AsyncDB,
    current_user: CurrentSuperUser,
    _rate_limit: RateLimitUser30,
):
    """Update location information."""
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found"
        )
    
    # Update only provided fields
    update_data = location_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(location, field, value)
    
    await db.commit()
    
    # Reload with relationships for response
    result = await db.execute(
        select(Location)
        .options(
            selectinload(Location.company).selectinload(Company.locations),
            selectinload(Location.projects)
        )
        .where(Location.id == location_id)
    )
    location = result.scalar_one()
    
    return location


@router.delete("/locations/{location_id}", response_model=SuccessResponse)
async def delete_location(
    location_id: UUID,
    db: AsyncDB,
    current_user: CurrentSuperUser,
    _rate_limit: RateLimitUser10,
):
    """
    Delete location.
    Cascade deletes all projects at this location.
    """
    result = await db.execute(select(Location).where(Location.id == location_id))
    location = result.scalar_one_or_none()
    
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {location_id} not found"
        )
    
    await db.delete(location)
    await db.commit()
    
    return SuccessResponse(message=f"Location {location.name} deleted successfully")
