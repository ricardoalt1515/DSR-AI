"""
AI Proposal generation endpoints.

Includes PDF generation and AI transparency features (Oct 2025).
"""

import os
from typing import Annotated, Any, Literal
from uuid import UUID

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser, OrganizationContext, ProjectDep
from app.core.database import get_async_db
from app.models.file import ProjectFile
from app.models.project import Project
from app.schemas.common import ErrorResponse
from app.schemas.proposal import (
    AIMetadataResponse,
    ProposalGenerationRequest,
    ProposalJobStatus,
    ProposalResponse,
)
from app.services.proposal_service import (
    ProposalService,
    build_external_markdown_from_data,
    sanitize_external_text,
)
from app.services.s3_service import (
    LOCAL_UPLOADS_DIR,
    USE_S3,
    delete_file_from_s3,
    get_presigned_url,
)
from app.visualization.pdf_generator import pdf_generator

logger = structlog.get_logger(__name__)

router = APIRouter()

# Import rate limiter from main app
from app.main import limiter


@router.post(
    "/generate",
    response_model=ProposalJobStatus,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Generate AI proposal",
    description="Start an async job to generate a proposal using AI",
    responses={404: {"model": ErrorResponse}},
)
@limiter.limit("3/minute")  # ⭐ Rate limit: AI generation (expensive operation)
async def generate_proposal(
    request: Request,  # Required for rate limiter
    proposal_request: ProposalGenerationRequest,
    background_tasks: BackgroundTasks,
    current_user: CurrentUser,
    org: OrganizationContext,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    Start AI-powered proposal generation for a project.

    **This is an async operation.** The endpoint returns immediately with a job ID.
    Use the job ID to poll for status and results.

    **Workflow:**
    1. Request submitted → Returns `job_id` with status "queued"
    2. Background worker processes request
    3. AI generates comprehensive proposal (1-2 minutes)
    4. Proposal saved to database
    5. Job status becomes "completed" with proposal ID

    **Polling:**
    - Poll `GET /ai/proposals/jobs/{jobId}` every 2-3 seconds
    - Monitor `progress` (0-100) and `current_step`
    - When status="completed", retrieve `result.proposal_id`

    **Requirements:**
    - Project must exist and belong to current user
    - Project should have technical data filled

    **Parameters:**
    - **project_id**: UUID of the project
    - **proposal_type**: "Conceptual", "Technical", or "Detailed"
    - **preferences**: Optional preferences (focus_areas, constraints)

    **Returns:**
    - **job_id**: Unique identifier for tracking this generation job
    - **status**: "queued" (initial state)
    - **estimated_time**: Estimated completion time in seconds
    """
    conditions = [
        Project.id == proposal_request.project_id,
        Project.organization_id == org.id,
    ]
    if not current_user.can_see_all_org_projects():
        conditions.append(Project.user_id == current_user.id)

    result = await db.execute(select(Project).where(*conditions))
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Start proposal generation
    try:
        job_id = await ProposalService.start_proposal_generation(
            db=db,
            project_id=proposal_request.project_id,
            request=proposal_request,
            org_id=org.id,
            user_id=current_user.id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Job status unavailable") from exc

    # Add background task for processing
    # Note: In production, this should be handled by Celery or similar
    # IMPORTANT: Don't pass db session - background task will create its own
    background_tasks.add_task(
        ProposalService.generate_proposal_async_wrapper,
        project_id=proposal_request.project_id,
        request=proposal_request,
        job_id=job_id,
        org_id=org.id,
        user_id=current_user.id,
    )

    logger.info(
        "Proposal generation started: %s for project %s",
        job_id,
        proposal_request.project_id,
    )

    return ProposalJobStatus(
        job_id=job_id,
        status="queued",
        progress=0,
        current_step="Initializing proposal generation...",
        result=None,
        error=None,
    )


@router.get(
    "/jobs/{job_id}",
    response_model=ProposalJobStatus,
    responses={404: {"model": ErrorResponse}},
    summary="Get proposal generation job status",
)
# Rate limiting removed: This endpoint is polled frequently (every 2.5s)
# and already protected by authentication (CurrentUser)
async def get_job_status(
    job_id: str,
    current_user: CurrentUser,
    org: OrganizationContext,
):
    """
    Get the current status of a proposal generation job.

    **Poll this endpoint** every 2-3 seconds after submitting a generation request.

    **Status values:**
    - **queued**: Job is waiting to be processed
    - **processing**: AI is generating the proposal
    - **completed**: Proposal is ready (check `result` for proposal_id)
    - **failed**: Generation failed (check `error` for details)

    **Progress tracking:**
    - `progress`: 0-100 percentage
    - `current_step`: Human-readable description of current operation

    **When completed:**
    - `result.proposal_id`: UUID of the generated proposal
    - `result.preview`: Quick preview with summary and report type

    **Example usage:**
    ```javascript
    // Poll every 2 seconds
    const checkStatus = async (jobId) => {
      const response = await fetch(`/api/v1/ai/proposals/jobs/${jobId}`);
      const data = await response.json();

      if (data.status === 'completed') {
        // Navigate to proposal
        navigate(`/projects/${projectId}/proposals/${data.result.proposal_id}`);
      } else if (data.status === 'failed') {
        // Show error
        showError(data.error);
      } else {
        // Show progress
        updateProgressBar(data.progress);
        showMessage(data.current_step);
        // Poll again
        setTimeout(() => checkStatus(jobId), 2000);
      }
    };
    ```
    """
    try:
        status_data = await ProposalService.get_job_status(
            job_id=job_id,
            org_id=org.id,
            user_id=current_user.id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Job status unavailable") from exc

    if not status_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found or expired",
        )

    return ProposalJobStatus(**status_data)


@router.get(
    "/{project_id}/proposals",
    response_model=list[ProposalResponse],
    responses={404: {"model": ErrorResponse}},
    summary="List project proposals",
)
async def list_proposals(
    project: ProjectDep,
):
    """
    Get all proposals for a project.

    Returns proposals ordered by creation date (newest first).
    Each proposal includes version, costs, and status.
    """
    # Get proposals (relationship already loaded via selectin)
    proposals = project.proposals

    # Convert to response models with snapshot using helper method
    response_list = [ProposalResponse.from_model_with_snapshot(p) for p in proposals]

    return response_list


@router.get(
    "/{project_id}/proposals/{proposal_id}",
    response_model=ProposalResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Get proposal detail",
)
async def get_proposal(
    project: ProjectDep,
    proposal_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    Get detailed proposal information.

    Includes full markdown content, equipment specs, costs, and efficiency data.
    """
    # Find proposal
    from app.models.proposal import Proposal

    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.project_id == project.id,
            Proposal.organization_id == project.organization_id,
        )
    )
    proposal = result.scalar_one_or_none()

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    # Regenerate fresh image URLs for photo insights (presigned URLs expire)
    try:
        ai_meta = proposal.ai_metadata or {}
        transparency = ai_meta.get("transparency")
        if isinstance(transparency, dict):
            client_meta = transparency.get("clientMetadata")
            if isinstance(client_meta, dict):
                attachments = client_meta.get("attachmentsSummary")
                if isinstance(attachments, dict):
                    photo_insights = attachments.get("photoInsights")
                    if isinstance(photo_insights, list):
                        for insight in photo_insights:
                            if not isinstance(insight, dict):
                                continue
                            file_id = insight.get("fileId")
                            if not file_id:
                                continue
                            try:
                                file_uuid = UUID(str(file_id))
                            except Exception:
                                continue
                            file = await db.get(ProjectFile, file_uuid)
                            if not file:
                                continue
                            if file.organization_id != project.organization_id:
                                continue
                            image_url = await get_presigned_url(file.file_path, expires=86400)
                            if image_url:
                                insight["imageUrl"] = image_url
    except Exception as exc:  # Best-effort refresh; do not block response
        logger.warning("photo_insight_refresh_failed", exc_info=True, error=str(exc))

    # Build response with snapshot using helper method
    return ProposalResponse.from_model_with_snapshot(proposal)


@router.get(
    "/{project_id}/proposals/{proposal_id}/pdf",
    summary="Generate or retrieve a proposal PDF URL",
    responses={
        200: {"description": "PDF URL returned successfully"},
        404: {"model": ErrorResponse, "description": "Proposal not found"},
        500: {"model": ErrorResponse, "description": "PDF generation failed"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
    },
)
@limiter.limit("20/minute")  # ⭐ Rate limit: PDF generation (moderate - uses cache)
async def get_proposal_pdf(
    request: Request,  # Required for rate limiter
    project: ProjectDep,
    proposal_id: UUID,
    current_user: CurrentUser,  # CurrentUser already has Depends in type
    db: Annotated[AsyncSession, Depends(get_async_db)],
    regenerate: bool = False,
    audience: Literal["internal", "external"] = "internal",
):
    """
    Generate and retrieve a presigned URL for proposal PDF.

    **On-demand generation with caching:**
    - First request: Generates PDF and saves to storage (S3 or local)
    - Subsequent requests: Returns cached PDF URL from storage
    - Use `?regenerate=true` to force regeneration

    **Parameters:**
    - **regenerate**: Force PDF regeneration (default: false)
    - **audience**: "internal" or "external" (default: internal)

    **Returns:**
    - JSON object with `url` field containing presigned URL
    - Frontend should use `window.open(url)` to download
    """
    # Get proposal with relationships
    from app.models.proposal import Proposal

    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.project_id == project.id,
            Proposal.organization_id == project.organization_id,
        )
    )
    proposal = result.scalar_one_or_none()

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    try:
        ai_metadata = proposal.ai_metadata if isinstance(proposal.ai_metadata, dict) else {}
        pdf_paths = ai_metadata.get("pdfPaths") if isinstance(ai_metadata, dict) else None
        if not isinstance(pdf_paths, dict):
            pdf_paths = {}

        cached_pdf_path = proposal.pdf_path if audience == "internal" else pdf_paths.get("external")

        # Check if PDF exists and regeneration not requested
        if cached_pdf_path and not regenerate:
            logger.info(
                "Serving cached PDF for proposal %s (audience=%s)",
                proposal_id,
                audience,
            )

            # Generate fresh presigned URL or serve local path
            pdf_url = await get_presigned_url(cached_pdf_path, expires=3600)

            if pdf_url:
                return {"url": pdf_url}

        # Generate new PDF using existing ProfessionalPDFGenerator
        logger.info("Generating new PDF for proposal %s", proposal_id)

        # Prepare metadata for PDF generator.
        # metadata["proposal"] uses audience-specific data when available.
        proposal_data = None
        markdown_content = ""
        internal_data: dict[str, Any] = {}

        if ai_metadata:
            internal_data = ai_metadata.get("proposal") or {}
            proposal_data = (
                internal_data if audience == "internal" else ai_metadata.get("proposalExternal")
            )

            markdown_key = "markdownExternal" if audience == "external" else "markdownInternal"
            markdown_content = ai_metadata.get(markdown_key) or ""

        if audience == "external":
            if not proposal_data:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="External report not available for this proposal.",
                )
            if not markdown_content:
                markdown_content = build_external_markdown_from_data(proposal_data)
                ai_metadata["markdownExternal"] = markdown_content
                proposal.ai_metadata = ai_metadata
        else:
            if not markdown_content:
                markdown_content = proposal.technical_approach or ""

        legacy_technical = getattr(proposal, "technical_data", None)
        context = {}
        if audience == "external" and internal_data:
            # Basic context fields
            context = {
                "material": sanitize_external_text(internal_data.get("material")),
                "volume": sanitize_external_text(internal_data.get("volume")),
                "location": sanitize_external_text(
                    internal_data.get("location") or project.location
                ),
                "facilityType": sanitize_external_text(
                    internal_data.get("facilityType") or project.sector
                ),
            }

            # Enrichment: sanitized pathway data for Valorization/ESG sections
            pathways = internal_data.get("pathways") or []
            if pathways:
                # Valorization options: action + why_it_works (no prices)
                valorization = []
                for p in pathways[:3]:
                    action = sanitize_external_text(p.get("action"))
                    why = sanitize_external_text(p.get("whyItWorks"))
                    if action and why and why != "Details available upon request.":
                        valorization.append({"action": action, "rationale": why})
                if valorization:
                    context["valorization"] = valorization

                # ESG benefits: esg_pitch (filtered for sensitive data)
                esg_benefits = []
                for p in pathways[:3]:
                    pitch = sanitize_external_text(p.get("esgPitch"))
                    if pitch and pitch != "Details available upon request.":
                        esg_benefits.append(pitch)
                if esg_benefits:
                    context["esgBenefits"] = esg_benefits

                # Feasibility summary: count of viable pathways
                high_count = sum(1 for p in pathways if p.get("feasibility") == "High")
                med_count = sum(1 for p in pathways if p.get("feasibility") == "Medium")
                context["viablePathwaysCount"] = high_count + med_count

        metadata = {
            "proposal": proposal_data or {},
            "audience": audience,
            "client_name": project.client,
            "client_location": project.location,
            "context": context,
            "data_for_charts": legacy_technical
            if legacy_technical is not None and audience == "internal"
            else {
                "client_info": {
                    "company_name": project.client,
                    "industry": project.sector,
                    "location": project.location,
                },
                "flow_rate_m3_day": 0,  # Kept for backward-compatible charts
                "capex_usd": proposal.capex,
                "annual_opex_usd": proposal.opex,
                "main_equipment": getattr(proposal, "equipment_list", None) or [],
                "treatment_efficiency": getattr(proposal, "treatment_efficiency", None) or {},
                "capex_breakdown": getattr(proposal, "cost_breakdown", None) or {},
                "opex_breakdown": getattr(proposal, "operational_costs", None) or {},
                "problem_analysis": {},
                "alternative_analysis": [],
                "implementation_months": 12,
            }
            if audience == "internal"
            else {},
        }

        charts = {}
        if audience == "internal":
            # Generate charts before creating PDF (like backend-chatbot)
            from app.visualization.modern_charts import premium_chart_generator

            logger.info("Generating executive charts for proposal %s", proposal_id)
            charts = premium_chart_generator.generate_executive_charts(metadata)
            logger.info(
                "Generated %s charts: %s",
                len(charts),
                list(charts.keys()) if charts else "none",
            )

        # Generate PDF with charts (returns relative filename: "proposals/file.pdf")
        pdf_filename = await pdf_generator.create_pdf(
            markdown_content=markdown_content,
            metadata=metadata,
            charts=charts,
            conversation_id=str(proposal_id),
        )

        if not pdf_filename:
            raise ValueError("PDF generation returned None")

        # Save relative filename in database (not the full URL)
        if audience == "internal":
            proposal.pdf_path = pdf_filename
        else:
            pdf_paths["external"] = pdf_filename
            ai_metadata["pdfPaths"] = pdf_paths
            proposal.ai_metadata = ai_metadata

        await db.commit()

        logger.info("PDF generated and saved: %s", pdf_filename)

        # Generate download URL from relative filename
        # In local mode: returns "/uploads/proposals/file.pdf"
        # In S3 mode: returns presigned S3 URL
        pdf_url = await get_presigned_url(pdf_filename, expires=3600)

        if not pdf_url:
            raise ValueError("Failed to generate download URL")

        return {"url": pdf_url}

    except Exception as e:
        logger.error("PDF generation failed: %s", e, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate PDF: {e!s}",
        )


@router.delete(
    "/{project_id}/proposals/{proposal_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        204: {"description": "Proposal deleted successfully"},
        404: {"model": ErrorResponse, "description": "Proposal not found"},
        403: {"model": ErrorResponse, "description": "Not authorized to delete this proposal"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
    },
    summary="Delete a proposal",
    description="Permanently delete a proposal and its associated PDF file. Only the project owner can delete proposals.",
)
@limiter.limit("10/minute")  # ⭐ Rate limit: Delete operation (conservative)
async def delete_proposal(
    request: Request,  # Required for rate limiter
    project: ProjectDep,
    proposal_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    Delete a proposal permanently.

    **Security:**
    - Only the project owner can delete proposals
    - Cascading delete removes all associated data
    - PDF files are deleted from storage (S3 or local)

    **Best Practices (October 2025):**
    - Returns 204 No Content on success (RESTful standard)
    - Returns 404 if proposal doesn't exist (prevents info leakage)
    - Atomic operation (DB + file deletion)
    """
    # Get proposal
    from app.models.proposal import Proposal

    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.project_id == project.id,
            Proposal.organization_id == project.organization_id,
        )
    )
    proposal = result.scalar_one_or_none()

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    # Store pdf_path before deleting (for cleanup)
    pdf_path = proposal.pdf_path

    # Delete from database (SQLAlchemy will handle cascade)
    await db.delete(proposal)
    await db.commit()

    # Delete PDF file from storage (best effort - don't fail if file doesn't exist)
    if pdf_path:
        try:
            if USE_S3:
                await delete_file_from_s3(pdf_path)
                logger.info("Deleted PDF from S3: %s", pdf_path)
            else:
                local_file_path = os.path.join(LOCAL_UPLOADS_DIR, pdf_path)
                if os.path.exists(local_file_path):
                    os.remove(local_file_path)
                    logger.info("Deleted local PDF: %s", local_file_path)
        except Exception as e:
            # Log error but don't fail the request (file might already be deleted)
            logger.warning(f"Failed to delete PDF file {pdf_path}: {e}")

    logger.info("Deleted proposal %s from project %s", proposal_id, project.id)

    # Return 204 No Content (RESTful standard for successful DELETE)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{project_id}/proposals/{proposal_id}/ai-metadata",
    response_model=AIMetadataResponse,
    responses={
        200: {"model": AIMetadataResponse},
        404: {"model": ErrorResponse, "description": "Proposal not found"},
        422: {"model": ErrorResponse, "description": "Invalid metadata format"},
        429: {"model": ErrorResponse, "description": "Too many requests"},
    },
    summary="Get AI reasoning and transparency data",
    description="Retrieve validated AI metadata including proven cases, assumptions, and confidence level",
)
@limiter.limit("60/minute")  # ⭐ Rate limit: Read operation (permissive)
async def get_proposal_ai_metadata(
    request: Request,  # Required for rate limiter
    project: ProjectDep,
    proposal_id: UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_async_db)],
):
    """
    Get AI reasoning and transparency metadata for a proposal.

    **Transparency Features (Engineering Co-Pilot):**
    This endpoint exposes the "why" behind the AI's decisions, enabling
    engineers to validate, trust, and improve the proposal.

    **Data Included:**
    - **usage_stats**: Token usage, model info, generation time
    - **proven_cases**: Similar projects consulted during generation
    - **assumptions**: Design assumptions made by the AI
    - **alternatives**: Technologies considered but rejected
    - **technology_justification**: Detailed reasoning for selections
    - **confidence_level**: AI's confidence ("High", "Medium", "Low")
    - **recommendations**: Additional recommendations from AI

    **Use Cases:**
    1. **Validation Tab**: Show proven cases and deviations in UI
    2. **Q&A Context**: Use for contextual chat with proposal
    3. **Audit Trail**: Document AI decision-making process
    4. **Learning**: Understand AI reasoning to improve inputs

    **Example Response:**
    ```json
    {
      "usage_stats": {
        "total_tokens": 45000,
        "model_used": "gpt-4o-mini",
        "success": true
      },
      "proven_cases": [
        {
          "sector": "Food & Beverage",
          "treatment_train": "DAF + UASB + UV",
          "capex_usd": 180000,
          "flow_rate_m3_day": 350
        }
      ],
      "assumptions": [
        "COD/BOD ratio of 2.5 based on F&B industry standards",
        "Peak factor of 1.5x for equipment sizing"
      ],
      "confidence_level": "High"
    }
    ```

    **Frontend Integration:**
    Use this data in a "Validation" or "AI Insights" tab to show
    engineers the reasoning behind the proposal.
    """
    # Get proposal
    from app.models.proposal import Proposal

    result = await db.execute(
        select(Proposal).where(
            Proposal.id == proposal_id,
            Proposal.project_id == project.id,
            Proposal.organization_id == project.organization_id,
        )
    )
    proposal = result.scalar_one_or_none()

    if not proposal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal not found",
        )

    # Get AI metadata directly from PostgreSQL (single source of truth)
    ai_metadata = proposal.ai_metadata

    if not ai_metadata:
        logger.warning("No AI metadata found for proposal %s", proposal_id)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No AI metadata available for this proposal.",
        )

    try:
        # Validate with Pydantic (catches corrupted data)
        validated_metadata = AIMetadataResponse(**ai_metadata)
        logger.info(
            "Returning validated AI metadata",
            extra={
                "proposal_id": str(proposal_id),
                "confidence": validated_metadata.confidence_level,
                "proven_cases_count": len(validated_metadata.proven_cases),
                "model": validated_metadata.usage_stats.model_used,
            },
        )
        return validated_metadata
    except Exception as e:
        logger.error(
            "Failed to validate AI metadata: %s",
            e,
            extra={"proposal_id": str(proposal_id)},
            exc_info=True,
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"AI metadata validation failed: {e!s}",
        )
