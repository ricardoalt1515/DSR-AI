"""
Proposal service for generating technical proposals using AI.
Handles proposal generation workflow and job management.
"""

import asyncio
import logging
import re
import time
import uuid
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

# Retry logic for transient failures
from tenacity import (
    RetryError,
    before_sleep_log,
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.core.database import AsyncSessionLocal

# OpenAI exception types for retry logic
try:
    from openai import (
        APIConnectionError,
        APIError,
        APITimeoutError,
        RateLimitError,
    )
except ImportError:
    # Fallback for older openai versions
    APIError = Exception
    RateLimitError = Exception
    APITimeoutError = Exception
    APIConnectionError = Exception

from app.agents.proposal_agent import (
    ProposalGenerationError,
    generate_enhanced_proposal,
)
from app.models.external_opportunity_report import (
    CircularityIndicator,
    ExternalOpportunityReport,
    SustainabilityMetric,
    SustainabilitySection,
)
from app.models.file import ProjectFile
from app.models.project import Project
from app.models.project_input import FlexibleWaterProjectData
from app.models.proposal import Proposal
from app.models.proposal_output import BusinessPathway, ProposalOutput
from app.schemas.proposal import ProposalGenerationRequest
from app.services.cache_service import cache_service
from app.services.s3_service import get_presigned_url

logger = structlog.get_logger(__name__)


# ═══════════════════════════════════════════════════════════════════
# RETRY WRAPPER FOR AI GENERATION
# ═══════════════════════════════════════════════════════════════════
# Retry only on transient errors (OpenAI rate limits, timeouts, network)
# Do NOT retry on permanent errors (validation, schema, business logic)
# ═══════════════════════════════════════════════════════════════════


@retry(
    # Stop after 2 attempts (1 retry)
    stop=stop_after_attempt(2),
    # Exponential backoff: wait 4s, 8s, 10s (max)
    wait=wait_exponential(multiplier=1, min=4, max=10),
    # Only retry on transient OpenAI errors and timeouts
    retry=retry_if_exception_type(
        (
            APIError,  # OpenAI server errors (5xx)
            RateLimitError,  # Rate limit exceeded (429)
            APITimeoutError,  # Request timeout
            APIConnectionError,  # Network connection issues
            asyncio.TimeoutError,  # Our custom timeout
        )
    ),
    # Log retry attempts for monitoring
    before_sleep=before_sleep_log(logger, logging.WARNING),
    # Re-raise exception after all retries exhausted
    reraise=True,
)
async def _generate_with_retry(
    project_data: FlexibleWaterProjectData,
    client_metadata: dict,
    job_id: str,
    photo_insights: list[dict] | None = None,
) -> Any:
    """
    Generate proposal with automatic retry on transient failures.

    This wrapper function provides resilience against:
    - OpenAI rate limits (429)
    - OpenAI server errors (5xx)
    - Network timeouts
    - Connection issues

    Permanent errors (validation, schema) are NOT retried and fail immediately.

    Args:
        project_data: Project technical data
        client_metadata: Client and project metadata
        job_id: Unique job identifier for tracking
        photo_insights: Optional photo analysis from images

    Returns:
        ProposalOutput from AI agent

    Raises:
        ProposalGenerationError: After all retries exhausted
        ValidationError: Immediate failure (no retry)
    """
    logger.info(f"Attempting proposal generation for job {job_id}")

    try:
        # Add timeout to AI agent call (fail fast - 8 minutes)
        proposal_output = await asyncio.wait_for(
            generate_enhanced_proposal(
                project_data=project_data,
                client_metadata=client_metadata,
                photo_insights=photo_insights,
            ),
            timeout=480,  # 8 minutes (fail before frontend 10min timeout)
        )

        logger.info(f"Proposal generated successfully for job {job_id}")
        return proposal_output

    except TimeoutError as e:
        logger.error(f"AI agent timeout after 480s for job {job_id}")
        raise ProposalGenerationError(
            "AI generation took too long (>8 min). "
            "This may indicate a loop or very complex project. "
            "Please try again or simplify requirements."
        ) from e
    except Exception as e:
        logger.warning(f"Proposal generation attempt failed for job {job_id}: {e}")
        raise  # Re-raise for tenacity to handle


class ProposalService:
    """Service for managing proposal generation."""

    @staticmethod
    def _serialize_technical_data(project: Project) -> FlexibleWaterProjectData:
        """
        Serialize project technical data for AI agent consumption.

        Loads from project.project_data (JSONB) which contains user's dynamic data.
        This ensures the AI agent receives the EXACT data the user entered,
        including custom contaminants, regulations, and field notes.

        Args:
            project: SQLAlchemy Project instance

        Returns:
            FlexibleWaterProjectData instance with user's dynamic data

        Example:
            >>> project = await db.get(Project, project_id)
            >>> water_data = ProposalService._serialize_technical_data(project)
            >>> print(water_data.count_filled_fields())  # All user fields
        """
        # Load from JSONB data (frontend's dynamic structure)
        jsonb_sections = (
            project.project_data.get("technical_sections") if project.project_data else None
        )

        if jsonb_sections:
            # User has entered dynamic data in frontend
            logger.info(
                "loading_jsonb_technical_data",
                project_id=str(project.id),
                sections_count=len(jsonb_sections),
                source="jsonb",
            )
            try:
                water_data = FlexibleWaterProjectData.from_project_jsonb(project)
                logger.info(
                    "technical_data_loaded",
                    project_id=str(project.id),
                    filled_fields=water_data.count_filled_fields(),
                    total_fields=water_data.count_fields(),
                    completeness_percent=round(
                        water_data.count_filled_fields() / water_data.count_fields() * 100, 1
                    ),
                )
                return water_data
            except Exception as e:
                logger.error(
                    "jsonb_parsing_error",
                    exc_info=True,
                    project_id=str(project.id),
                    error_type=type(e).__name__,
                )
                # Fall through to minimal structure

        # No technical data exists - return minimal structure
        logger.warning(
            "no_technical_data_found",
            project_id=str(project.id),
            source="none",
            action="returning_minimal_structure",
        )
        return FlexibleWaterProjectData(
            project_name=project.name,
            client=project.client,
            sector=project.sector,
            location=project.location,
            budget=project.budget,
            technical_sections=[],  # Empty
        )

    @staticmethod
    async def _load_attachments_summary(
        db: AsyncSession,
        project_id: UUID,
    ) -> dict[str, Any] | None:
        """Load summary of AI-processed project files (photos) for agent context."""
        try:
            result = await db.execute(
                select(ProjectFile)
                .where(
                    ProjectFile.project_id == project_id,
                    ProjectFile.category == "photos",
                    ProjectFile.ai_analysis.isnot(None),
                )
                .order_by(ProjectFile.created_at.desc())
                .limit(5)
            )
            files = result.scalars().all()

            if not files:
                return None

            photo_insights: list[dict[str, Any]] = []

            for project_file in files:
                analysis = project_file.ai_analysis
                if not isinstance(analysis, dict):
                    continue

                # Generate presigned URL for image (24h expiry)
                image_url = await get_presigned_url(project_file.file_path, expires=86400)

                photo_insights.append(
                    {
                        "fileId": str(project_file.id),
                        "filename": project_file.filename,
                        "imageUrl": image_url,
                        "uploadedAt": project_file.created_at.isoformat()
                        if project_file.created_at
                        else None,
                        "analysis": analysis,
                    }
                )

            if not photo_insights:
                return None

            return {"photoInsights": photo_insights}

        except Exception as exc:
            logger.error(
                "attachments_summary_error",
                exc_info=True,
                project_id=str(project_id),
                error_type=type(exc).__name__,
            )
            return None

    @staticmethod
    async def start_proposal_generation(
        db: AsyncSession,
        project_id: uuid.UUID,
        request: ProposalGenerationRequest,
        org_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> str:
        """
        Start a proposal generation job.
        Returns job ID for status polling.

        Args:
            db: Database session
            project_id: Project UUID
            request: Proposal generation request
            user_id: User UUID

        Returns:
            Job ID string
        """
        # Generate job ID
        job_id = f"job_{uuid.uuid4().hex[:12]}"

        # Set initial job status
        await cache_service.set_job_status_scoped(
            org_id=org_id,
            user_id=user_id,
            job_id=job_id,
            status={
                "job_id": job_id,
                "status": "queued",
                "progress": 0,
                "current_step": "Initializing proposal generation...",
            },
        )

        logger.info(
            "proposal_job_started",
            job_id=job_id,
            project_id=str(project_id),
            proposal_type=request.proposal_type,
            user_id=str(user_id),
            organization_id=str(org_id),
        )

        # Note: In production, you would trigger a background task here
        # For now, we'll store the job info and it should be processed by a worker
        # TODO: Implement Celery or FastAPI BackgroundTasks

        return job_id

    @staticmethod
    async def generate_proposal_async(
        db: AsyncSession,
        project_id: uuid.UUID,
        request: ProposalGenerationRequest,
        job_id: str,
        org_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """
        Generate proposal asynchronously (to be called by background worker).

        Args:
            db: Database session
            project_id: Project UUID
            request: Proposal generation request
            job_id: Job identifier
            user_id: User UUID
        """
        try:
            # Update status
            await cache_service.set_job_status_scoped(
                org_id=org_id,
                user_id=user_id,
                job_id=job_id,
                status={
                    "job_id": job_id,
                    "status": "processing",
                    "progress": 10,
                    "current_step": "Loading project data...",
                },
            )

            # Load project
            result = await db.execute(
                select(Project).where(
                    Project.id == project_id,
                    Project.organization_id == org_id,
                )
            )
            project = result.scalar_one_or_none()

            if not project:
                raise ValueError(f"Project not found: {project_id}")

            # Load technical data
            await cache_service.set_job_status_scoped(
                org_id=org_id,
                user_id=user_id,
                job_id=job_id,
                status={
                    "job_id": job_id,
                    "status": "processing",
                    "progress": 20,
                    "current_step": "Loading technical data...",
                },
            )

            # Serialize technical data from JSONB
            await cache_service.set_job_status_scoped(
                org_id=org_id,
                user_id=user_id,
                job_id=job_id,
                status={
                    "job_id": job_id,
                    "status": "processing",
                    "progress": 30,
                    "current_step": "Preparing data for AI analysis...",
                },
            )

            technical_data = ProposalService._serialize_technical_data(project)

            # Structured logging - AI agent input data
            ai_context = technical_data.to_ai_context()
            ai_context_str = technical_data.format_ai_context_to_string(ai_context)

            logger.info(
                "ai_agent_input_prepared",
                project_id=str(project_id),
                job_id=job_id,
                data_source="jsonb" if project.project_data else "relational",
                total_fields=technical_data.count_fields(),
                filled_fields=technical_data.count_filled_fields(),
                completeness_percent=round(
                    technical_data.count_filled_fields() / technical_data.count_fields() * 100, 1
                )
                if technical_data.count_fields() > 0
                else 0,
                context_sections=len([k for k, v in ai_context.items() if isinstance(v, dict)]),
                estimated_tokens=len(ai_context_str) // 4,
            )

            # Prepare client metadata
            client_metadata = {
                "company_name": project.client,
                "selected_sector": project.sector,
                "selected_subsector": project.subsector,
                "user_location": project.location,
                "project_name": project.name,
                "project_type": project.project_type,
            }

            # Add user preferences if provided
            if request.preferences:
                client_metadata["preferences"] = request.preferences

            attachments_summary = await ProposalService._load_attachments_summary(
                db=db,
                project_id=project_id,
            )
            if attachments_summary:
                client_metadata["attachmentsSummary"] = attachments_summary

            logger.info(
                "client_metadata_prepared",
                company=client_metadata.get("company_name"),
                sector=client_metadata.get("selected_sector"),
                location=client_metadata.get("user_location"),
                has_preferences=bool(request.preferences),
                has_attachments=bool(attachments_summary),
            )

            # Generate proposal with AI
            await cache_service.set_job_status_scoped(
                org_id=org_id,
                user_id=user_id,
                job_id=job_id,
                status={
                    "job_id": job_id,
                    "status": "processing",
                    "progress": 40,
                    "current_step": "Generating proposal with AI (this may take 1-2 minutes)...",
                },
            )

            start_time = time.time()
            try:
                # Extract photo insights for the agent
                photo_insights = None
                if attachments_summary and "photoInsights" in attachments_summary:
                    photo_insights = [
                        insight.get("analysis", {})
                        for insight in attachments_summary["photoInsights"]
                        if isinstance(insight.get("analysis"), dict)
                    ]
                    if photo_insights:
                        logger.info(
                            "photo_insights_extracted",
                            count=len(photo_insights),
                            materials=[i.get("material_type", "unknown") for i in photo_insights],
                        )

                proposal_output = await _generate_with_retry(
                    project_data=technical_data,
                    client_metadata=client_metadata,
                    job_id=job_id,
                    photo_insights=photo_insights,
                )
                generation_duration = time.time() - start_time

                logger.info(
                    "ai_proposal_generated",
                    project_id=str(project_id),
                    job_id=job_id,
                    duration_seconds=round(generation_duration, 2),
                )

                # No proven cases needed for waste upcycling (business analysis, not engineering)
                proven_cases_data = {}

            except RetryError as e:
                # All retry attempts failed
                duration = time.time() - start_time
                logger.error(
                    "proposal_generation_failed_after_retries",
                    exc_info=True,
                    project_id=str(project_id),
                    job_id=job_id,
                    duration_seconds=round(duration, 2),
                    attempts=2,
                    last_error=str(e.last_attempt.exception()),
                )
                await cache_service.set_job_status_scoped(
                    org_id=org_id,
                    user_id=user_id,
                    job_id=job_id,
                    status={
                        "job_id": job_id,
                        "status": "failed",
                        "progress": 0,
                        "current_step": "Generation failed after retries",
                        "error": f"Failed after 2 attempts: {e.last_attempt.exception()!s}",
                    },
                )
                return

            except ProposalGenerationError as e:
                # Timeout or other non-retryable error
                duration = time.time() - start_time
                logger.error(
                    "proposal_generation_failed",
                    exc_info=True,
                    project_id=str(project_id),
                    job_id=job_id,
                    duration_seconds=round(duration, 2),
                    error_type=type(e).__name__,
                    error_message=str(e),
                )
                await cache_service.set_job_status_scoped(
                    org_id=org_id,
                    user_id=user_id,
                    job_id=job_id,
                    status={
                        "job_id": job_id,
                        "status": "failed",
                        "progress": 0,
                        "current_step": "Generation failed",
                        "error": str(e),
                    },
                )
                return

            # Create proposal record
            await cache_service.set_job_status_scoped(
                org_id=org_id,
                user_id=user_id,
                job_id=job_id,
                status={
                    "job_id": job_id,
                    "status": "processing",
                    "progress": 80,
                    "current_step": "Saving proposal...",
                },
            )
            # Get latest proposal version to determine new version
            result = await db.execute(
                select(Proposal)
                .where(Proposal.project_id == project_id)
                .order_by(Proposal.created_at.desc())
                .limit(1)
            )
            latest_proposal = result.scalar_one_or_none()

            if latest_proposal:
                # Parse version and increment
                version_num = float(latest_proposal.version.replace("v", ""))
                new_version = f"v{version_num + 0.1:.1f}"
            else:
                new_version = "v1.0"

            # Create proposal (single serialization, no duplication)
            proposal = create_proposal(
                proposal_output=proposal_output,
                proven_cases_data=proven_cases_data,
                client_metadata=client_metadata,
                generation_duration=generation_duration,
                project_id=project_id,
                project_name=project.name,
                request=request,
                new_version=new_version,
            )
            proposal.organization_id = org_id

            logger.info(
                "waste_report_created",
                project_id=str(project_id),
                confidence_level=proposal.ai_metadata["proposal"].get("confidence", "Medium"),
            )

            db.add(proposal)
            await db.flush()  # Get ID before timeline event

            # Create timeline event
            from app.services.timeline_service import create_timeline_event

            await create_timeline_event(
                db=db,
                project_id=project_id,
                organization_id=org_id,
                event_type="proposal_generated",
                title=f"Waste Report Generated: {new_version}",
                description="Waste upcycling feasibility report generated with AI",
                actor=f"user_{user_id}",
                metadata={
                    "proposal_id": str(proposal.id),
                    "version": new_version,
                    "proposal_type": request.proposal_type,
                    "report_type": "waste_upcycling_feasibility",
                    "generation_time": round(generation_duration, 2),
                },
            )

            await db.commit()
            await db.refresh(proposal)

            logger.info(
                "waste_report_saved_to_database",
                proposal_id=str(proposal.id),
                project_id=str(project_id),
                version=new_version,
                proposal_type=request.proposal_type,
                report_type="waste_upcycling_feasibility",
                has_ai_metadata=True,
            )

            # Complete job
            await cache_service.set_job_status_scoped(
                org_id=org_id,
                user_id=user_id,
                job_id=job_id,
                status={
                    "job_id": job_id,
                    "status": "completed",
                    "progress": 100,
                    "current_step": "Waste upcycling report generated successfully!",
                    "result": {
                        "proposalId": str(proposal.id),  # ← camelCase for frontend
                        "preview": {
                            "executiveSummary": proposal.executive_summary,  # ← camelCase
                            "reportType": "waste_upcycling_feasibility",  # ← camelCase
                        },
                    },
                },
            )

            logger.info(
                "proposal_generation_completed",
                proposal_id=str(proposal.id),
                project_id=str(project_id),
                job_id=job_id,
                version=new_version,
                total_duration_seconds=round(time.time() - start_time, 2),
            )

        except Exception as e:
            logger.error(
                "proposal_generation_error",
                exc_info=True,
                project_id=str(project_id),
                job_id=job_id,
                error_type=type(e).__name__,
                error_message=str(e),
            )
            await cache_service.set_job_status_scoped(
                org_id=org_id,
                user_id=user_id,
                job_id=job_id,
                status={
                    "job_id": job_id,
                    "status": "failed",
                    "progress": 0,
                    "current_step": "Failed",
                    "error": str(e),
                },
            )

    @staticmethod
    async def get_job_status(
        job_id: str,
        org_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict[str, Any] | None:
        """
        Get proposal generation job status.

        Args:
            job_id: Job identifier

        Returns:
            Job status data or None
        """
        return await cache_service.get_job_status_scoped(
            org_id=org_id,
            user_id=user_id,
            job_id=job_id,
        )

    @staticmethod
    async def generate_proposal_async_wrapper(
        project_id: uuid.UUID,
        request: ProposalGenerationRequest,
        job_id: str,
        org_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> None:
        """
        Background task wrapper - creates its own DB session.

        IMPORTANT: Background tasks should NOT receive db session from endpoint
        because the endpoint's session closes when it returns.
        """
        async with AsyncSessionLocal() as db:
            await ProposalService.generate_proposal_async(
                db=db,
                project_id=project_id,
                request=request,
                job_id=job_id,
                org_id=org_id,
                user_id=user_id,
            )


# ============================================================================
# HELPER FUNCTIONS - Proposal Building
# ============================================================================


def create_proposal(
    proposal_output: ProposalOutput,
    proven_cases_data: dict,
    client_metadata: dict,
    generation_duration: float,
    project_id: UUID,
    project_name: str,
    request: ProposalGenerationRequest,
    new_version: str,
) -> Proposal:
    """Create Proposal from ProposalOutput (DRY principle)."""
    proposal_data = proposal_output.model_dump(by_alias=True, exclude_none=True)
    external_report = derive_external_report(proposal_output)
    external_data = external_report.model_dump(
        by_alias=True,
        exclude_none=True,
        mode="json",
    )

    internal_markdown = _generate_markdown_report(proposal_output)
    external_markdown = _generate_markdown_external_report(external_report, proposal_output)

    ai_metadata = {
        "proposal": proposal_data,
        "proposalExternal": external_data,
        "markdownExternal": external_markdown,
        "transparency": {
            "clientMetadata": client_metadata,
            "generatedAt": datetime.now(UTC).isoformat(),
            "generationTimeSeconds": round(generation_duration, 2),
            "reportType": "waste_opportunity",
        },
    }

    return Proposal(
        project_id=project_id,
        version=new_version,
        title=f"Opportunity Report - {project_name}",
        proposal_type=request.proposal_type,
        status="Draft",
        author="AI",
        capex=0.0,
        opex=0.0,
        executive_summary=proposal_output.headline,
        technical_approach=internal_markdown,
        ai_metadata=ai_metadata,
    )


_NON_COMPUTED_MARKERS = {
    "n/a",
    "na",
    "unknown",
    "not computed",
    "not_computed",
}
_DEFAULT_CO2_BASIS = "Estimate based on available inputs and standard factors."
_CO2_DATA_NEEDED = [
    "Annual material volume",
    "Material composition",
    "Baseline disposal method",
]
_WATER_DATA_NEEDED = [
    "Process water baseline",
    "Reuse or discharge targets",
    "System yield or recovery rates",
]
_CIRCULARITY_DATA_NEEDED = [
    "Current diversion rate",
    "Post-processing yield",
    "End-use acceptance criteria",
]
_MAX_END_USE_EXAMPLES = 6
_END_USE_ALLOWLIST = {
    "recyclers": "Recyclers",
    "furniture makers": "Furniture makers",
    "construction companies": "Construction companies",
    "automotive parts manufacturers": "Automotive parts manufacturers",
    "lumber yards": "Lumber yards",
    "biomass plants": "Biomass plants",
    "pellet manufacturers": "Pellet manufacturers",
    "paper mills": "Paper mills",
    "packaging manufacturers": "Packaging manufacturers",
    "metal foundries": "Metal foundries",
    "plastic reprocessors": "Plastic reprocessors",
    "glass processors": "Glass processors",
    "composting facilities": "Composting facilities",
    "anaerobic digesters": "Anaerobic digesters",
    "waste to energy plants": "Waste-to-energy plants",
    "cement kilns": "Cement kilns",
    "chemical manufacturers": "Chemical manufacturers",
    "textile recyclers": "Textile recyclers",
    "electronics recyclers": "Electronics recyclers",
    "consumer goods manufacturers": "Consumer goods manufacturers",
}

_EXTERNAL_REDACTION_MESSAGE = "Details available upon request."
_EXTERNAL_EMPTY_VALUES = {
    "n/a",
    "na",
    "unknown",
    "not specified",
    "not computed",
    "not_computed",
}
_EXTERNAL_SENSITIVE_PATTERN = re.compile(
    r"(\$|@|\bROI\b|\bmargin\b|\bmargins\b|\bprice\b|\boffer\b|\bnetback\b|"
    r"\bbuyer pays\b|\bcontract rate\b|\bper\s*ton\b|/\s*ton\b|"
    r"\bper\s*lb\b|/\s*lb\b|\bper\s*tonne\b|/\s*tonne\b|"
    r"http[s]?://|www\.|\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b)",
    re.IGNORECASE,
)
_BUYER_CLAIMS_PREFIXES = (
    "buyer claims:",
    "buyer claim:",
)

_ANNUAL_IMPACT_BANDS = (
    ("Seven figures+", 1_000_000),
    ("Six figures", 100_000),
    ("Five figures", 10_000),
    ("Under five figures", 1),
)

_ROI_HIGH_THRESHOLD = 100.0

_HIGHLY_PROFITABLE_LABEL = "Highly profitable"
_PROFITABILITY_STATEMENTS = {
    "High": "This opportunity shows strong commercial potential with favorable economics.",
    "Medium": "This opportunity shows moderate commercial potential.",
    "Low": "Commercial viability requires further analysis.",
    "Unknown": "Commercial potential to be determined after detailed assessment.",
}


def _strip_buyer_claims_prefix(text: str) -> str:
    lowered = text.lower().strip()
    for prefix in _BUYER_CLAIMS_PREFIXES:
        if lowered.startswith(prefix):
            return text[len(prefix) :].strip().strip("\"'")
    return text


def sanitize_external_text(value: str | None) -> str | None:
    if not value or not isinstance(value, str):
        return None
    trimmed = value.strip()
    if not trimmed or trimmed.lower() in _EXTERNAL_EMPTY_VALUES:
        return None
    cleaned = _strip_buyer_claims_prefix(trimmed)
    if _EXTERNAL_SENSITIVE_PATTERN.search(cleaned):
        return _EXTERNAL_REDACTION_MESSAGE
    return cleaned


def sanitize_external_list(values: list[Any] | None) -> list[str]:
    if not values:
        return []
    cleaned = [sanitize_external_text(value) for value in values]
    return [value for value in cleaned if value]


def _parse_roi_percent(roi_summary: str) -> float | None:
    """Parse ROI percentage from roi_summary string."""
    if not roi_summary:
        return None
    patterns = [
        r"(\d+(?:\.\d+)?)\s*%\s*(?:first[-\s]?year\s*)?roi",
        r"roi[^0-9]*(\d+(?:\.\d+)?)\s*%",
        r"(\d+(?:\.\d+)?)\s*%\s*(?:return|roi)",
        r"=\s*(\d+(?:\.\d+)?)\s*%",
    ]
    for pattern in patterns:
        match = re.search(pattern, roi_summary, re.IGNORECASE)
        if match:
            return float(match.group(1))
    return None


def _derive_profitability_statement(band: str, roi_summary: str) -> str:
    """Derive qualitative statement. ROI > 100% yields "Highly profitable"."""
    roi_percent = _parse_roi_percent(roi_summary)
    if roi_percent and roi_percent > _ROI_HIGH_THRESHOLD:
        return _HIGHLY_PROFITABLE_LABEL
    return _PROFITABILITY_STATEMENTS.get(band, _PROFITABILITY_STATEMENTS["Unknown"])


def _extract_actions(pathways: list) -> list[str]:
    """Extract unique actions from High/Medium feasibility pathways."""
    actions = []
    for p in pathways:
        if p.feasibility in ("High", "Medium") and p.action not in actions:
            actions.append(p.action)
    return actions[:5]


def _extract_handling(pathways: list) -> list[str]:
    """Extract unique handling guidance from pathways."""
    seen: set[str] = set()
    guidance = []
    for p in pathways:
        if p.handling and p.handling not in seen:
            seen.add(p.handling)
            guidance.append(p.handling)
    return guidance[:5]


def _compose_annual_impact_narrative(
    magnitude_band: str,
    basis: str,
    confidence: str,
    profitability_summary: str,
) -> str:
    """Compose annual impact narrative from existing internal data."""
    impact_phrase = {
        "Seven figures+": "represents a substantial annual impact",
        "Six figures": "represents a meaningful annual impact",
        "Five figures": "represents a moderate annual impact",
        "Under five figures": "represents a modest annual impact",
        "Unknown": "has impact potential to be confirmed",
    }.get(magnitude_band, "has impact potential to be confirmed")

    basis_phrase = {
        "Revenue potential": "driven primarily by new revenue streams from material sales",
        "Avoided disposal cost": "driven primarily by reduced disposal costs",
        "Mixed": "combining reduced disposal costs and new revenue streams",
        "Unknown": "based on current market conditions",
    }.get(basis, "based on current market conditions")

    confidence_phrase = {
        "High": "High confidence based on verified market data.",
        "Medium": "Moderate confidence pending additional validation.",
        "Low": "Preliminary assessment pending detailed analysis.",
    }.get(confidence, "")

    narrative = f"This opportunity {impact_phrase} {basis_phrase}. {confidence_phrase}"

    if profitability_summary:
        sanitized = sanitize_external_text(profitability_summary)
        if sanitized and len(sanitized) > 20 and sanitized != _EXTERNAL_REDACTION_MESSAGE:
            narrative += f" {sanitized}"

    return narrative.strip()


def _compose_opportunity_narrative(
    pathways: list[BusinessPathway],
    profitability_statement: str,
) -> str:
    """Compose opportunity narrative from pathways data."""
    viable_pathways = [p for p in pathways if p.feasibility in ("High", "Medium")]
    pathway_count = len(viable_pathways)

    count_phrase = {
        0: "Pathways are being evaluated",
        1: "One viable pathway has been identified",
        2: "Two viable pathways have been identified",
        3: "Three viable pathways have been identified",
    }.get(pathway_count, f"{pathway_count} viable pathways have been identified")

    top_actions = [p.action for p in viable_pathways[:3]]
    actions_phrase = ""
    if top_actions:
        if len(top_actions) == 1:
            actions_phrase = f", including {top_actions[0].lower()}"
        else:
            formatted = ", ".join(a.lower() for a in top_actions[:-1])
            actions_phrase = f", including {formatted} and {top_actions[-1].lower()}"

    rationale = ""
    if viable_pathways and viable_pathways[0].why_it_works:
        sanitized_rationale = sanitize_external_text(viable_pathways[0].why_it_works)
        if (
            sanitized_rationale
            and len(sanitized_rationale) > 20
            and sanitized_rationale != _EXTERNAL_REDACTION_MESSAGE
        ):
            rationale = f" {sanitized_rationale}"

    outlook = ""
    if profitability_statement:
        outlook = f" Commercial outlook: {profitability_statement.lower()}."

    return f"{count_phrase} for material valorization{actions_phrase}.{rationale}{outlook}".strip()


def _parse_annual_amounts(value: str | None) -> list[float]:
    if not value:
        return []
    lowered = value.lower()
    if not any(token in lowered for token in ("yr", "year", "annual", "/yr")):
        return []
    matches = re.findall(r"(\d+(?:\.\d+)?)\s*(k|m|mm|b)?", lowered)
    amounts: list[float] = []
    for number, suffix in matches:
        amount = float(number.replace(",", ""))
        if suffix in {"k"}:
            amount *= 1_000
        elif suffix in {"m", "mm"}:
            amount *= 1_000_000
        elif suffix == "b":
            amount *= 1_000_000_000
        amounts.append(amount)
    return amounts


def _annual_impact_band(amount: float | None) -> str:
    if not amount:
        return "Unknown"
    for label, threshold in _ANNUAL_IMPACT_BANDS:
        if amount >= threshold:
            return label
    return "Unknown"


def _derive_annual_impact(internal: ProposalOutput) -> tuple[str, str, str, list[str]]:
    pathway_amounts: list[float] = []
    for pathway in internal.pathways:
        pathway_amounts.extend(_parse_annual_amounts(pathway.annual_value))
    cost_amounts = _parse_annual_amounts(internal.financials.current_cost)
    all_amounts = pathway_amounts + cost_amounts

    if not all_amounts:
        return (
            "Unknown",
            "Unknown",
            "Low",
            [
                "Provide annual disposal cost or revenue estimates to refine the impact band.",
            ],
        )

    max_amount = max(all_amounts)
    if pathway_amounts and cost_amounts:
        basis = "Mixed"
        confidence = "High"
    elif pathway_amounts:
        basis = "Revenue potential"
        confidence = "Medium"
    else:
        basis = "Avoided disposal cost"
        confidence = "Medium"

    return (
        _annual_impact_band(max_amount),
        basis,
        confidence,
        [],
    )


def derive_external_report(internal: ProposalOutput) -> ExternalOpportunityReport:
    """Derive a client-facing report from internal data (allowlist-only)."""
    if internal is None:
        raise ValueError("Internal report is required to derive external report.")

    co2_value = _metric_value_or_none(internal.environment.co2_avoided)
    co2_metric = _build_metric(
        value=co2_value,
        basis=_DEFAULT_CO2_BASIS if co2_value else None,
        data_needed=_CO2_DATA_NEEDED,
    )

    water_value = _metric_value_or_none(internal.environment.water_savings)
    water_metric = _build_metric(
        value=water_value,
        basis="Virgin material displacement" if water_value else None,
        data_needed=_WATER_DATA_NEEDED,
    )

    circularity_value = internal.environment.circularity_potential
    circularity_basis = internal.environment.circularity_rationale or None
    circularity = [
        CircularityIndicator(
            name="Circularity Potential",
            metric=_build_metric(
                value=circularity_value,
                basis=circularity_basis,
                data_needed=_CIRCULARITY_DATA_NEEDED,
            ),
        )
    ]

    sustainability_summary = _safe_external_summary(internal.environment.esg_headline)
    overall_impact = _safe_external_summary(internal.environment.current_harm)

    sustainability = SustainabilitySection(
        summary=sustainability_summary,
        co2e_reduction=co2_metric,
        water_savings=water_metric,
        circularity=circularity,
        overall_environmental_impact=overall_impact,
    )

    band = internal.economics_deep_dive.profitability_band
    annual_band, annual_basis, annual_confidence, annual_notes = _derive_annual_impact(internal)
    profitability_statement = sanitize_external_text(
        _derive_profitability_statement(band, internal.roi_summary)
    )
    external_band = band
    if profitability_statement == _HIGHLY_PROFITABLE_LABEL:
        external_band = "Unknown"

    annual_impact_narrative = _compose_annual_impact_narrative(
        magnitude_band=annual_band,
        basis=annual_basis,
        confidence=annual_confidence,
        profitability_summary=internal.economics_deep_dive.profitability_summary,
    )

    opportunity_narrative = _compose_opportunity_narrative(
        pathways=internal.pathways,
        profitability_statement=profitability_statement or "",
    )

    return ExternalOpportunityReport(
        sustainability=sustainability,
        profitability_band=external_band,
        end_use_industry_examples=_extract_end_use_examples(internal.pathways),
        material_description=sanitize_external_text(internal.material) or "",
        recommended_actions=sanitize_external_list(_extract_actions(internal.pathways)),
        handling_guidance=sanitize_external_list(_extract_handling(internal.pathways)),
        profitability_statement=profitability_statement or "",
        annual_impact_magnitude_band=annual_band,
        annual_impact_basis=annual_basis,
        annual_impact_confidence=annual_confidence,
        annual_impact_notes=annual_notes,
        annual_impact_narrative=annual_impact_narrative,
        opportunity_narrative=opportunity_narrative,
    )


def _metric_value_or_none(value: str | None) -> str | None:
    """Extract metric value if valid, else None."""
    if not value:
        return None
    normalized = value.strip().lower()
    if normalized in _NON_COMPUTED_MARKERS:
        return None
    if any(char.isdigit() for char in normalized):
        return value.strip()
    return None


def _build_metric(
    value: str | None,
    basis: str | None,
    data_needed: list[str],
) -> SustainabilityMetric:
    status = "computed" if value else "not_computed"
    needed = [] if value else data_needed
    return SustainabilityMetric(
        status=status,
        value=value,
        basis=basis if value else None,
        data_needed=needed,
    )


def _safe_external_summary(text: str | None) -> str:
    if not text:
        return "Sustainability impact summary is pending additional inputs."
    sanitized = sanitize_external_text(text)
    if not sanitized or sanitized == _EXTERNAL_REDACTION_MESSAGE:
        return "Sustainability impact summary is pending additional inputs."
    return sanitized


def _extract_end_use_examples(pathways: list[Any]) -> list[str]:
    examples: list[str] = []
    seen: set[str] = set()
    for pathway in pathways:
        buyer_types = getattr(pathway, "buyer_types", "")
        for raw in _split_buyer_types(buyer_types):
            normalized = _normalize_buyer_type(raw)
            if not normalized:
                continue
            if normalized in seen:
                continue
            label = _END_USE_ALLOWLIST.get(normalized)
            if not label:
                continue
            seen.add(normalized)
            examples.append(label)
            if len(examples) >= _MAX_END_USE_EXAMPLES:
                return examples
    return examples


def _split_buyer_types(value: str) -> list[str]:
    separators = [",", ";", "/", "|"]
    for separator in separators:
        value = value.replace(separator, ",")
    parts = [p.strip() for p in value.split(",") if p.strip()]
    return parts


def _normalize_buyer_type(value: str) -> str:
    cleaned = value.strip().lower()
    for prefix in ("the ", "a ", "an "):
        if cleaned.startswith(prefix):
            cleaned = cleaned[len(prefix) :]
            break
    cleaned = "".join(ch if ch.isalnum() or ch.isspace() else " " for ch in cleaned)
    return " ".join(cleaned.split())


def build_external_markdown_from_data(report_data: dict) -> str:
    if not report_data:
        raise ValueError("External report data is required to build markdown.")
    report = ExternalOpportunityReport.model_validate(report_data)
    return _generate_markdown_external_report(report)


def _generate_markdown_external_report(
    output: ExternalOpportunityReport,
    internal: ProposalOutput | None = None,
) -> str:
    """Generate external (client-facing) markdown from structured data.

    Enriches report with valorization options and ESG benefits from internal data.
    """
    sustainability = output.sustainability

    # Build sustainability metrics (only show if computed)
    metrics_lines = []

    co2 = sustainability.co2e_reduction
    if co2.status == "computed" and co2.value:
        metrics_lines.append(f"**CO₂e Reduction:** {co2.value}")
        if co2.basis:
            metrics_lines.append(f"  *{co2.basis}*")

    water = sustainability.water_savings
    if water.status == "computed" and water.value:
        metrics_lines.append(f"**Water Savings:** {water.value}")
        if water.basis:
            metrics_lines.append(f"  *{water.basis}*")

    metrics_md = chr(10).join(metrics_lines) if metrics_lines else ""

    # Circularity (only if computed)
    circularity_lines = [
        f"- **{indicator.name}:** {indicator.metric.value}"
        for indicator in sustainability.circularity
        if indicator.metric.status == "computed" and indicator.metric.value
    ]
    circularity_md = chr(10).join(circularity_lines) if circularity_lines else ""

    # Profitability assessment
    profitability_md = ""
    if output.profitability_statement:
        if output.profitability_statement == _HIGHLY_PROFITABLE_LABEL:
            profitability_md = f"**Opportunity Level:** {output.profitability_statement}"
        elif output.profitability_band and output.profitability_band != "Unknown":
            profitability_md = f"**Opportunity Level:** {output.profitability_band}"

    # Annual impact estimate
    annual_impact_lines = []
    impact_band = output.annual_impact_magnitude_band
    if impact_band and impact_band != "Unknown":
        annual_impact_lines.append(f"**Estimated Annual Impact:** {impact_band}")
    else:
        annual_impact_lines.append("**Estimated Annual Impact:** To be confirmed")
    if output.annual_impact_basis and output.annual_impact_basis != "Unknown":
        annual_impact_lines.append(f"**Basis:** {output.annual_impact_basis}")
    if output.annual_impact_confidence:
        annual_impact_lines.append(f"**Confidence:** {output.annual_impact_confidence}")
    if output.annual_impact_notes:
        annual_impact_lines.extend(f"- {note}" for note in output.annual_impact_notes)
    annual_impact_md = chr(10).join(annual_impact_lines) if annual_impact_lines else ""

    # Valorization Options from internal pathways
    valorization_lines = []
    if internal and internal.pathways:
        for p in internal.pathways[:3]:  # Top 3 only
            action = sanitize_external_text(p.action)
            rationale = sanitize_external_text(p.why_it_works)
            if action and rationale and rationale != _EXTERNAL_REDACTION_MESSAGE:
                valorization_lines.append(f"- **{action}** — {rationale}")
            elif action:
                valorization_lines.append(f"- **{action}**")
    valorization_md = chr(10).join(valorization_lines) if valorization_lines else ""

    # ESG Benefits from internal pathways
    esg_lines = []
    if internal and internal.pathways:
        for p in internal.pathways[:3]:
            pitch = sanitize_external_text(p.esg_pitch)
            if pitch and pitch != _EXTERNAL_REDACTION_MESSAGE:
                esg_lines.append(f"- {pitch}")
    esg_md = chr(10).join(esg_lines) if esg_lines else ""

    # NEW: Feasibility summary
    feasibility_md = ""
    if internal and internal.pathways:
        high_count = sum(1 for p in internal.pathways if p.feasibility == "High")
        med_count = sum(1 for p in internal.pathways if p.feasibility == "Medium")
        total_viable = high_count + med_count
        if total_viable > 0:
            feasibility_md = f"**{total_viable} viable pathway{'s' if total_viable != 1 else ''}** identified for material valorization."

    # Build final markdown
    sections = []

    # Summary section
    sections.append(f"""## Sustainability Summary

{sustainability.summary}""")

    # Metrics section (if any computed)
    if metrics_md:
        sections.append(f"""## Environmental Metrics

{metrics_md}""")

    # Circularity (if any computed)
    if circularity_md:
        sections.append(f"""## Circularity Indicators

{circularity_md}""")

    # Overall impact
    sections.append(f"""## Overall Environmental Impact

{sustainability.overall_environmental_impact}""")

    # Annual impact estimate
    if annual_impact_md:
        sections.append(f"""## Annual Impact Estimate

{annual_impact_md}""")

    # Valorization Options (NEW)
    if valorization_md:
        sections.append(f"""## Valorization Options

{valorization_md}""")

    # ESG Benefits (NEW)
    if esg_md:
        sections.append(f"""## ESG Benefits for Stakeholders

{esg_md}""")

    # Feasibility + Profitability (NEW combined section)
    opportunity_parts = []
    if feasibility_md:
        opportunity_parts.append(feasibility_md)
    if profitability_md:
        opportunity_parts.append(profitability_md)
    if (
        output.profitability_statement
        and output.profitability_statement != _HIGHLY_PROFITABLE_LABEL
    ):
        opportunity_parts.append(output.profitability_statement)
    if opportunity_parts:
        sections.append(f"""## Opportunity Assessment

{chr(10).join(opportunity_parts)}""")

    return chr(10) + chr(10) + "---" + chr(10) + chr(10).join(s + chr(10) for s in sections)


def _generate_markdown_report(output: ProposalOutput) -> str:
    """Generate internal opportunity markdown from structured data."""

    # Format pathways
    pathway_lines = []
    for i, p in enumerate(output.pathways, 1):
        target_locations = ", ".join(p.target_locations) if p.target_locations else "N/A"
        pathway_lines.append(f"""
### Pathway {i}: {p.action}

- **Buyers:** {p.buyer_types}
- **Price:** {p.price_range}
- **Annual Value:** {p.annual_value}
- **ESG Pitch for Buyer:** _{p.esg_pitch}_
- **Handling:** {p.handling}
- **Feasibility:** {p.feasibility}
- **Target Locations:** {target_locations}
- **Why it works:** {p.why_it_works}
""")

    pathways_md = "".join(pathway_lines)

    economics = output.economics_deep_dive
    cost_lines = chr(10).join(f"- {line}" for line in economics.cost_breakdown)
    scenario_lines = chr(10).join(f"- {line}" for line in economics.scenario_summary)
    assumptions_lines = (
        chr(10).join(f"- {line}" for line in economics.assumptions)
        if economics.assumptions
        else "- N/A"
    )
    data_gaps_lines = (
        chr(10).join(f"- {line}" for line in economics.data_gaps)
        if economics.data_gaps
        else "- N/A"
    )

    return f"""# Opportunity Report

## {output.recommendation}: {output.headline}

**Confidence:** {output.confidence}

---

## Company: {output.client}
- **Location:** {output.location}
- **Material:** {output.material}
- **Volume:** {output.volume}

---

## Financial Snapshot

| Current Cost | Offer | Estimated Margin |
|-------------|-----------|------------|
| {output.financials.current_cost} | {output.financials.offer_terms} | {output.financials.estimated_margin} |

---

## Economics Deep Dive (Estimate-Only)

- **Profitability Band:** {economics.profitability_band}
- **Summary:** {economics.profitability_summary}

### Cost Breakdown (Ranges)
{cost_lines}

### Scenarios (Best/Base/Worst)
{scenario_lines}

### Assumptions
{assumptions_lines}

### Data Gaps
{data_gaps_lines}

---

## Environmental Impact

- **CO₂ Avoided:** {output.environment.co2_avoided}
- **Water Savings:** {output.environment.water_savings or "Requires water footprint data"}
- **Circularity Potential:** {output.environment.circularity_potential}
- **Circularity Rationale:** {output.environment.circularity_rationale or "N/A"}
- **ESG Headline:** {output.environment.esg_headline}
- **If Not Diverted:** {output.environment.current_harm}

---

## Safety & Handling

- **Hazard:** {output.safety.hazard}
- **Warnings:** {output.safety.warnings}
- **Storage:** {output.safety.storage}

---

## Business Pathways
{pathways_md}

---

## Risks

{chr(10).join(f"- {r}" for r in output.risks)}

---

## Next Steps

{chr(10).join(f"{i}. {s}" for i, s in enumerate(output.next_steps, 1))}

---

## ROI Summary

**{output.roi_summary or "ROI calculation pending"}**
"""


# Global service instance
proposal_service = ProposalService()
