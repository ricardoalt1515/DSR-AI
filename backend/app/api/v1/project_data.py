"""
API endpoints for flexible project data management.
"""

from typing import Any, Dict
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.api.dependencies import CurrentUser
from typing import Optional
from app.services.project_data_service import ProjectDataService
from app.schemas.common import SuccessResponse
from app.models.project import Project

import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Import limiter for rate limiting
from app.main import limiter


@router.get("/{project_id}/data")
@limiter.limit("30/minute")  # JSONB read operations - moderate
async def get_project_data(
    request: Request,
    project_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Get all project data.
    Returns the complete JSONB structure.
    
    Requires authentication and ownership validation.
    """
    # Verify project ownership  (404 prevents info leakage)
    project = await db.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(404, "Project not found")
    
    data = await ProjectDataService.get_project_data(
        db=db,
        project_id=project_id,
        user_id=current_user.id
    )
    
    return {
        "project_id": str(project_id),
        "data": data
    }


@router.patch("/{project_id}/data")
@limiter.limit("30/minute")  # JSONB write operations - moderate
async def update_project_data(
    request: Request,
    project_id: UUID,
    updates: Dict[str, Any],
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db),
    merge: bool = True
):
    """
    Update project data.
    
    By default, merges with existing data (merge=true).
    Set merge=false to replace completely.
    
    Requires authentication and ownership validation.
    
    **Example:**
    ```json
    {
      "basic_info": {
        "company_name": "IBYMA",
        "location": "Los Mochis"
      },
      "quality": {
        "BOD": {
          "value": 3700,
          "unit": "mg/L"
        }
      }
    }
    ```
    """
    # Verify project ownership (404 prevents info leakage)
    project_check = await db.get(Project, project_id)
    if not project_check or project_check.user_id != current_user.id:
        raise HTTPException(404, "Project not found")
    
    project = await ProjectDataService.update_project_data(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        updates=updates,
        merge=merge
    )
    
    logger.info(f"✅ Updated project data for {project_id}")
    
    return {
        "message": "Project data updated successfully",
        "project_id": str(project_id),
        "updated_at": project.updated_at.isoformat()
    }


@router.put("/{project_id}/data")
@limiter.limit("20/minute")  # Full replacement - more restrictive
async def replace_project_data(
    request: Request,
    project_id: UUID,
    data: Dict[str, Any],
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Replace project data completely.
    Use this for full updates, not partial.
    
    Requires authentication and ownership validation.
    """
    # Verify project ownership (404 prevents info leakage)
    project_check = await db.get(Project, project_id)
    if not project_check or project_check.user_id != current_user.id:
        raise HTTPException(404, "Project not found")
    
    project = await ProjectDataService.update_project_data(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        updates=data,
        merge=False  # Complete replacement
    )
    
    logger.info(f"✅ Replaced project data for {project_id}")
    
    return {
        "message": "Project data replaced successfully",
        "project_id": str(project_id),
        "updated_at": project.updated_at.isoformat()
    }


@router.post("/{project_id}/quality-parameter")
@limiter.limit("30/minute")  # Parameter operations - moderate
async def add_quality_parameter(
    request: Request,
    project_id: UUID,
    parameter_name: str,
    value: float,
    unit: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Quick endpoint to add/update a water quality parameter.
    
    Requires authentication and ownership validation.
    
    **Example:**
    POST /projects/{id}/quality-parameter
    ?parameter_name=BOD&value=3700&unit=mg/L
    """
    # Verify project ownership (404 prevents info leakage)
    project_check = await db.get(Project, project_id)
    if not project_check or project_check.user_id != current_user.id:
        raise HTTPException(404, "Project not found")
    
    # Get current data
    data = await ProjectDataService.get_project_data(
        db=db,
        project_id=project_id,
        user_id=current_user.id
    )
    
    # Update quality parameter
    if "quality" not in data:
        data["quality"] = {}
    
    data["quality"][parameter_name] = {
        "value": value,
        "unit": unit
    }
    
    # Save
    project = await ProjectDataService.update_project_data(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        updates={"quality": data["quality"]},
        merge=True
    )
    
    logger.info(f"✅ Added parameter {parameter_name} = {value} {unit}")
    
    return SuccessResponse(
        message=f"Parameter '{parameter_name}' added successfully",
        data={
            "parameter": parameter_name,
            "value": value,
            "unit": unit
        }
    )


@router.delete("/{project_id}/quality-parameter/{parameter_name}")
@limiter.limit("30/minute")  # Parameter delete - moderate
async def delete_quality_parameter(
    request: Request,
    project_id: UUID,
    parameter_name: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Delete a water quality parameter.
    
    Requires authentication and ownership validation.
    """
    # Verify project ownership (404 prevents info leakage)
    project = await db.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(404, "Project not found")
    
    # Get current data
    data = await ProjectDataService.get_project_data(
        db=db,
        project_id=project_id,
        user_id=current_user.id
    )
    
    # Remove parameter
    quality = data.get("quality", {})
    if parameter_name in quality:
        del quality[parameter_name]
        
        # Save
        await ProjectDataService.update_project_data(
            db=db,
            project_id=project_id,
            user_id=current_user.id,
            updates={"quality": quality},
            merge=True
        )
        
        logger.info(f"✅ Deleted parameter {parameter_name}")
        
        return SuccessResponse(
            message=f"Parameter '{parameter_name}' deleted successfully"
        )
    else:
        raise HTTPException(404, f"Parameter '{parameter_name}' not found")


@router.post("/{project_id}/sections")
@limiter.limit("20/minute")  # Section operations - moderate
async def add_custom_section(
    request: Request,
    project_id: UUID,
    section: Dict[str, Any],
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Add a custom section to the project.
    
    **Example:**
    ```json
    {
      "id": "site-conditions",
      "title": "Site Conditions",
      "description": "Physical site characteristics",
      "fields": [
        {
          "id": "elevation",
          "label": "Elevation",
          "value": "1500",
          "unit": "m"
        }
      ]
    }
    ```
    """
    # Get project to find user_id
    project = await db.get(Project, project_id)
    if not project:
        raise HTTPException(404, "Project not found")
    
    # Get current data
    data = await ProjectDataService.get_project_data(
        db=db,
        project_id=project_id,
        user_id=project.user_id
    )
    
    # Add section
    sections = data.get("sections", [])
    
    # Set order if not provided
    if "order" not in section:
        section["order"] = len(sections)
    
    sections.append(section)
    
    # Save
    await ProjectDataService.update_project_data(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        updates={"sections": sections},
        merge=True
    )
    
    logger.info(f"✅ Added section '{section.get('title')}'")
    
    return SuccessResponse(
        message="Section added successfully",
        data={"section": section}
    )


@router.delete("/{project_id}/sections/{section_id}")
@limiter.limit("20/minute")  # Section delete - moderate
async def delete_custom_section(
    request: Request,
    project_id: UUID,
    section_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Delete a custom section.
    Requires authentication and ownership validation.
    """
    # Verify project ownership (404 prevents info leakage)
    project = await db.get(Project, project_id)
    if not project or project.user_id != current_user.id:
        raise HTTPException(404, "Project not found")
    
    # Get current data
    data = await ProjectDataService.get_project_data(
        db=db,
        project_id=project_id,
        user_id=current_user.id
    )
    
    # Filter section
    sections = data.get("sections", [])
    filtered_sections = [s for s in sections if s.get("id") != section_id]
    
    if len(sections) == len(filtered_sections):
        raise HTTPException(404, f"Section '{section_id}' not found")
    
    # Reorder
    for idx, section in enumerate(filtered_sections):
        section["order"] = idx
    
    # Save
    await ProjectDataService.update_project_data(
        db=db,
        project_id=project_id,
        user_id=current_user.id,
        updates={"sections": filtered_sections},
        merge=True
    )
    
    logger.info(f"✅ Deleted section '{section_id}'")
    
    return SuccessResponse(message="Section deleted successfully")
