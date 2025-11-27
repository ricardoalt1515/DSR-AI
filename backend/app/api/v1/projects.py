"""
Projects CRUD endpoints.
"""

from uuid import UUID
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request, Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from app.api.dependencies import (
    CurrentUser,
    AsyncDB,
    PageNumber,
    PageSize,
    SearchQuery,
    StatusFilter,
    SectorFilter,
)
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectDetail,
    ProjectSummary,
    DashboardStatsResponse,
    PipelineStageStats,
)
from app.schemas.common import PaginatedResponse, ErrorResponse
from app.models.project import Project
from app.models.proposal import Proposal
from sqlalchemy import select, func, case
from sqlalchemy.orm import raiseload, selectinload, load_only
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Import limiter for rate limiting
from app.main import limiter


@router.get(
    "",
    response_model=PaginatedResponse[ProjectSummary],
    summary="List all projects",
    description="Retrieve a paginated list of projects with optional filtering",
)
@limiter.limit("60/minute")  # Corregido: Ahora permite 60 solicitudes por minuto
async def list_projects(
    request: Request,
    current_user: CurrentUser,
    db: AsyncDB,  # ✅ Type alias
    page: PageNumber = 1,  # ✅ Type alias with default
    page_size: PageSize = 10,  # ✅ Default value (alias defined in PageSize)
    search: SearchQuery = None,  # ✅ Type alias
    status: StatusFilter = None,  # ✅ Type alias
    sector: SectorFilter = None,  # ✅ Type alias
    company_id: Optional[UUID] = Query(None, description="Filter by company ID"),
    location_id: Optional[UUID] = Query(None, description="Filter by location ID"),
):
    """
    List user's projects with filtering and pagination.

    Performance optimizations:
    - No relationship loading (raiseload) for list view
    - Uses proposals_count property (no N+1)
    - Indexed queries for fast filtering

    Returns lightweight ProjectSummary objects.
    """
    # Build query with selective loading
    # ✅ Load only proposal IDs for count (proposals_count property needs it)
    # ✅ Load location_rel and company for company_name/location_name computed fields
    from app.models.location import Location
    query = (
        select(Project)
        .options(
            selectinload(Project.proposals).load_only(Proposal.id),  # Only load IDs for count
            selectinload(Project.location_rel).selectinload(Location.company),  # For computed fields
            raiseload(Project.files),
            raiseload(Project.timeline),
        )
    )

    # Permission filter: admins see all projects, members only their own
    if not current_user.is_superuser:
        query = query.where(Project.user_id == current_user.id)

    # Add search filter
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Project.name.ilike(search_filter)) | (Project.client.ilike(search_filter))
        )

    # Add status filter (supports comma-separated list for multi-status)
    if status:
        statuses = [s.strip() for s in status.split(",") if s.strip()]
        if len(statuses) == 1:
            query = query.where(Project.status == statuses[0])
        elif statuses:
            query = query.where(Project.status.in_(statuses))

    # Add sector filter
    if sector:
        query = query.where(Project.sector == sector)
    
    # Add company filter (via location relationship)
    if company_id:
        query = query.join(Project.location_rel).where(Location.company_id == company_id)
    
    # Add location filter
    if location_id:
        query = query.where(Project.location_id == location_id)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar()

    # Apply pagination
    query = query.order_by(Project.updated_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)

    # Execute query
    result = await db.execute(query)
    projects = result.scalars().all()

    # Convert to response models
    # ✅ Pydantic V2 handles SQLAlchemy models automatically
    items = [ProjectSummary.model_validate(p, from_attributes=True) for p in projects]

    # Calculate total pages
    pages = (total + page_size - 1) // page_size if total > 0 else 1

    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        size=page_size,
        pages=pages,
    )


@router.get(
    "/stats",
    response_model=DashboardStatsResponse,
    summary="Get dashboard statistics",
    description="Pre-aggregated statistics for dashboard (replaces client-side calculations)",
)
@limiter.limit("30/minute")
async def get_dashboard_stats(
    request: Request,
    current_user: CurrentUser,
    db: AsyncDB,
):
    """
    Get pre-aggregated dashboard statistics.

    Performance optimization:
    - Single query with database aggregations (100x faster than client-side)
    - O(1) complexity vs O(N) on frontend
    - Replaces SimplifiedStats and ProjectPipeline calculations

    Returns:
        DashboardStatsResponse with totals, averages, and pipeline breakdown
    """
    # Single aggregation query
    stats_query = select(
        func.count(Project.id).label("total_projects"),
        func.count(case((Project.status == "In Preparation", 1))).label("in_preparation"),
        func.count(case((Project.status == "Generating Proposal", 1))).label("generating"),
        func.count(case((Project.status == "Proposal Ready", 1))).label("ready"),
        func.count(case((Project.status == "Completed", 1))).label("completed"),
        func.avg(Project.progress).label("avg_progress"),
        func.sum(Project.budget).label("total_budget"),
        func.max(Project.updated_at).label("last_updated"),
    ).where(Project.user_id == current_user.id)

    result = await db.execute(stats_query)
    stats = result.one()

    # Pipeline stages breakdown
    pipeline_query = (
        select(
            Project.status,
            func.count(Project.id).label("count"),
            func.avg(Project.progress).label("avg_progress"),
        )
        .where(Project.user_id == current_user.id)
        .group_by(Project.status)
    )

    pipeline_result = await db.execute(pipeline_query)
    pipeline_stages = {
        row.status: PipelineStageStats(count=row.count, avg_progress=round(row.avg_progress or 0))
        for row in pipeline_result
    }

    logger.info(f"📊 Dashboard stats generated for user {current_user.id}")

    return DashboardStatsResponse(
        total_projects=stats.total_projects or 0,
        in_preparation=stats.in_preparation or 0,
        generating=stats.generating or 0,
        ready=stats.ready or 0,
        completed=stats.completed or 0,
        avg_progress=round(stats.avg_progress or 0),
        total_budget=stats.total_budget or 0.0,
        last_updated=stats.last_updated,
        pipeline_stages=pipeline_stages,
    )


@router.get(
    "/{project_id}",
    response_model=ProjectDetail,
    summary="Get project by ID",
    description="Retrieve full project details with eager-loaded relationships",
    responses={404: {"model": ErrorResponse}},
)
@limiter.limit("60/minute")
async def get_project(
    request: Request,
    current_user: CurrentUser,  # ✅ Type alias already contains Depends
    db: AsyncDB,  # ✅ Type alias already contains Depends
    project_id: UUID = Path(description="Project unique identifier"),
):
    """
    Get full project details including proposals and recent timeline.
    
    Returns last 10 timeline events (limited in serializer).
    Use dedicated endpoint for full timeline history.
    """
    from app.models.location import Location
    from app.models.company import Company
    
    result = await db.execute(
        select(Project)
        .where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
        .options(
            selectinload(Project.location_rel).selectinload(Location.company),
            selectinload(Project.proposals),
            selectinload(Project.timeline),
            raiseload(Project.files),
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    logger.info(f"📖 Project retrieved: {project.id} - {project.name}")
    return ProjectDetail.model_validate(project, from_attributes=True)


@router.post(
    "",
    response_model=ProjectDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new project",
    description="Create a new project with the provided information",
    responses={400: {"model": ErrorResponse}},
)
@limiter.limit("100/minute")  # Balanced: Prevents abuse while allowing normal usage with retries
async def create_project(
    request: Request,
    project_data: ProjectCreate,
    current_user: CurrentUser,
    db: AsyncDB,  # Use type alias
):
    """
    Create a new project with assessment questionnaire applied.
    
    Assessment questionnaire is the standard form for all waste assessments.
    Returns complete project with questionnaire ready to fill.
    """
    from app.services.timeline_service import create_timeline_event
    from app.templates.assessment_questionnaire import get_assessment_questionnaire
    
    # Fetch location with company (fail-fast if not found)
    from app.models.location import Location
    location_result = await db.execute(
        select(Location)
        .options(selectinload(Location.company))
        .where(Location.id == project_data.location_id)
    )
    location = location_result.scalar_one_or_none()
    
    # Validation: location must exist
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Location {project_data.location_id} not found"
        )
    
    # Validation: location must have company (fail-fast)
    if not location.company:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Location '{location.name}' has no associated company. Please assign a company first."
        )
    
    # Inherit all data from company/location
    sector = location.company.sector
    subsector = location.company.subsector
    client_name = location.company.name
    location_name = f"{location.name}, {location.city}"
    
    logger.info(
        f"📍 Assessment created: {location.company.name} "
        f"({sector}/{subsector or 'N/A'}) at {location.name}, {location.city}"
    )
    
    new_project = Project(
        user_id=current_user.id,
        location_id=project_data.location_id,
        name=project_data.name,
        client=client_name,  # Inherited from Company.name
        sector=sector,  # Inherited from Company.sector
        subsector=subsector,  # Inherited from Company.subsector
        location=location_name,  # Inherited from Location (name + city)
        project_type=project_data.project_type,
        description=project_data.description,
        budget=project_data.budget,
        schedule_summary=project_data.schedule_summary,
        tags=project_data.tags,
        status="In Preparation",
        progress=0,
    )

    db.add(new_project)
    await db.flush()  # Get ID before applying questionnaire
    
    # Apply standard assessment questionnaire (same for all projects)
    questionnaire = get_assessment_questionnaire()
    new_project.project_data["technical_sections"] = questionnaire
    flag_modified(new_project, "project_data")  # Mark JSONB as modified for SQLAlchemy
    
    # Create timeline event
    await create_timeline_event(
        db=db,
        project_id=new_project.id,
        event_type="project_created",
        title="Assessment created",
        description=f"Assessment '{new_project.name}' created with standard questionnaire",
        actor=current_user.email,
        metadata={
            "sector": new_project.sector,
            "subsector": new_project.subsector,
            "budget": new_project.budget,
            "questionnaire_sections": len(questionnaire),
        }
    )
    
    await db.commit()
    
    # Reload project with relationships to avoid greenlet error
    from app.models.location import Location
    from app.models.company import Company
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.location_rel).selectinload(Location.company),
            selectinload(Project.proposals)
        )
        .where(Project.id == new_project.id)
    )
    new_project = result.scalar_one()

    # Calculate total fields for logging
    total_fields = sum(len(section["fields"]) for section in questionnaire)
    
    logger.info(
        f"✅ Assessment created: {new_project.id} - {new_project.name}. "
        f"Questionnaire applied: {len(questionnaire)} sections, {total_fields} fields"
    )
    
    return ProjectDetail.model_validate(new_project)


@router.patch(
    "/{project_id}",
    response_model=ProjectDetail,
    summary="Update project",
    description="Update project fields. Only provided fields will be updated.",
    responses={404: {"model": ErrorResponse}},
)
@limiter.limit("20/minute")  # Write endpoint - moderate
async def update_project(
    request: Request,
    project_id: UUID,
    project_data: ProjectUpdate,
    current_user: CurrentUser,
    db: AsyncDB,  # ✅ Use type alias
):
    """Update project fields and log timeline event."""
    from app.services.timeline_service import create_timeline_event
    
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Update fields
    update_data = project_data.model_dump(exclude_unset=True)
    changed_fields = list(update_data.keys())
    
    for field, value in update_data.items():
        setattr(project, field, value)
    
    # Create timeline event
    await create_timeline_event(
        db=db,
        project_id=project.id,
        event_type="project_updated",
        title="Proyecto actualizado",
        description=f"Campos actualizados: {', '.join(changed_fields)}",
        actor=current_user.email,
        metadata={"changed_fields": changed_fields}
    )

    await db.commit()
    
    # Reload project with relationships to avoid greenlet error
    from app.models.location import Location
    from app.models.company import Company
    result = await db.execute(
        select(Project)
        .options(
            selectinload(Project.location_rel).selectinload(Location.company),
            selectinload(Project.proposals)
        )
        .where(Project.id == project.id)
    )
    project = result.scalar_one()

    logger.info(f"✅ Project updated: {project.id}")
    return ProjectDetail.model_validate(project)


@router.delete(
    "/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete project",
    description="Delete a project and all related data (cascade delete)",
    responses={404: {"model": ErrorResponse}},
)
@limiter.limit("10/minute")  # Delete endpoint - conservative
async def delete_project(
    request: Request,
    project_id: UUID,
    current_user: CurrentUser,
    db: AsyncDB,  # ✅ Use type alias
):
    """
    Delete a project.

    This will also delete all related data (technical data, proposals, files, timeline).
    Cascade delete is configured in the database models.
    """
    # Get project
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Delete project (cascade will handle related records)
    await db.delete(project)
    await db.commit()

    logger.info(f"✅ Project deleted: {project_id}")

    return None


@router.get(
    "/{project_id}/timeline",
    response_model=list,
    summary="Get project timeline",
    description="Get full project activity timeline with pagination",
    responses={404: {"model": ErrorResponse}},
)
@limiter.limit("60/minute")
async def get_project_timeline(
    request: Request,
    project_id: UUID,
    current_user: CurrentUser,
    db: AsyncDB,
    limit: int = Query(50, ge=1, le=100, description="Max events to return"),
):
    """
    Get project activity timeline.
    
    Returns events ordered by most recent first.
    Useful for full audit trail or pagination.
    """
    from app.models.timeline import TimelineEvent
    from app.schemas.timeline import TimelineEventResponse
    
    # Verify project access
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    # Get timeline events
    result = await db.execute(
        select(TimelineEvent)
        .where(TimelineEvent.project_id == project_id)
        .order_by(TimelineEvent.created_at.desc())
        .limit(limit)
    )
    events = result.scalars().all()
    
    return [
        TimelineEventResponse.model_validate(e).model_dump(by_alias=True)
        for e in events
    ]
