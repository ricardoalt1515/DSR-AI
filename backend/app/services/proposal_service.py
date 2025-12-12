"""
Proposal service for generating technical proposals using AI.
Handles proposal generation workflow and job management.
"""

import asyncio
import logging
import time
import uuid
from datetime import datetime
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
from app.models.file import ProjectFile
from app.models.project import Project
from app.models.project_input import FlexibleWaterProjectData
from app.models.proposal import Proposal
from app.models.proposal_output import ProposalOutput
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
    wait=wait_exponential(
        multiplier=1,
        min=4,
        max=10
    ),

    # Only retry on transient OpenAI errors and timeouts
    retry=retry_if_exception_type((
        APIError,           # OpenAI server errors (5xx)
        RateLimitError,     # Rate limit exceeded (429)
        APITimeoutError,    # Request timeout
        APIConnectionError, # Network connection issues
        asyncio.TimeoutError, # Our custom timeout
    )),

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
    logger.info(f"🤖 Attempting proposal generation for job {job_id}")

    try:
        # Add timeout to AI agent call (fail fast - 8 minutes)
        proposal_output = await asyncio.wait_for(
            generate_enhanced_proposal(
                project_data=project_data,
                client_metadata=client_metadata,
                photo_insights=photo_insights,
            ),
            timeout=480  # 8 minutes (fail before frontend 10min timeout)
        )

        logger.info(f"✅ Proposal generated successfully for job {job_id}")
        return proposal_output

    except TimeoutError:
        logger.error(f"❌ AI agent timeout after 480s for job {job_id}")
        raise ProposalGenerationError(
            "AI generation took too long (>8 min). "
            "This may indicate a loop or very complex project. "
            "Please try again or simplify requirements."
        )
    except Exception as e:
        logger.warning(f"⚠️ Proposal generation attempt failed for job {job_id}: {e}")
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
        jsonb_sections = project.project_data.get('technical_sections') if project.project_data else None

        if jsonb_sections:
            # ✅ User has entered dynamic data in frontend
            logger.info(
                "loading_jsonb_technical_data",
                project_id=str(project.id),
                sections_count=len(jsonb_sections),
                source="jsonb"
            )
            try:
                water_data = FlexibleWaterProjectData.from_project_jsonb(project)
                logger.info(
                    "technical_data_loaded",
                    project_id=str(project.id),
                    filled_fields=water_data.count_filled_fields(),
                    total_fields=water_data.count_fields(),
                    completeness_percent=round(water_data.count_filled_fields() / water_data.count_fields() * 100, 1)
                )
                return water_data
            except Exception as e:
                logger.error(
                    "jsonb_parsing_error",
                    exc_info=True,
                    project_id=str(project.id),
                    error_type=type(e).__name__
                )
                # Fall through to minimal structure

        # No technical data exists - return minimal structure
        logger.warning(
            "no_technical_data_found",
            project_id=str(project.id),
            source="none",
            action="returning_minimal_structure"
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
        await cache_service.set_job_status(
            job_id=job_id,
            status="queued",
            progress=0,
            current_step="Initializing proposal generation...",
            ttl=3600,  # 1 hour
        )

        logger.info(
            "proposal_job_started",
            job_id=job_id,
            project_id=str(project_id),
            proposal_type=request.proposal_type,
            user_id=str(user_id)
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
            await cache_service.set_job_status(
                job_id=job_id,
                status="processing",
                progress=10,
                current_step="Loading project data...",
            )

            # Load project
            result = await db.execute(
                select(Project).where(Project.id == project_id)
            )
            project = result.scalar_one_or_none()

            if not project:
                raise ValueError(f"Project not found: {project_id}")

            # Load technical data
            await cache_service.set_job_status(
                job_id=job_id,
                status="processing",
                progress=20,
                current_step="Loading technical data...",
            )

            # Serialize technical data from JSONB
            await cache_service.set_job_status(
                job_id=job_id,
                status="processing",
                progress=30,
                current_step="Preparing data for AI analysis...",
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
                ) if technical_data.count_fields() > 0 else 0,
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
            await cache_service.set_job_status(
                job_id=job_id,
                status="processing",
                progress=40,
                current_step="Generating proposal with AI (this may take 1-2 minutes)...",
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
                    last_error=str(e.last_attempt.exception())
                )
                await cache_service.set_job_status(
                    job_id=job_id,
                    status="failed",
                    progress=0,
                    current_step="Generation failed after retries",
                    error=f"Failed after 2 attempts: {str(e.last_attempt.exception())}"
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
                    error_message=str(e)
                )
                await cache_service.set_job_status(
                    job_id=job_id,
                    status="failed",
                    progress=0,
                    current_step="Generation failed",
                    error=str(e),
                )
                return

            # Create proposal record
            await cache_service.set_job_status(
                job_id=job_id,
                status="processing",
                progress=80,
                current_step="Saving proposal...",
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
                new_version=new_version
            )
            
            logger.info(
                "waste_report_created",
                project_id=str(project_id),
                confidence_level=proposal.ai_metadata['proposal'].get('confidence', 'Medium')
            )

            db.add(proposal)
            await db.flush()  # Get ID before timeline event
            
            # Create timeline event
            from app.services.timeline_service import create_timeline_event
            await create_timeline_event(
                db=db,
                project_id=project_id,
                event_type="proposal_generated",
                title=f"Waste Report Generated: {new_version}",
                description=f"Waste upcycling feasibility report generated with AI",
                actor=f"user_{user_id}",
                metadata={
                    "proposal_id": str(proposal.id),
                    "version": new_version,
                    "proposal_type": request.proposal_type,
                    "report_type": "waste_upcycling_feasibility",
                    "generation_time": round(generation_duration, 2),
                }
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
                has_ai_metadata=True
            )

            # Complete job
            await cache_service.set_job_status(
                job_id=job_id,
                status="completed",
                progress=100,
                current_step="Waste upcycling report generated successfully!",
                result={
                    "proposalId": str(proposal.id),  # ← camelCase for frontend
                    "preview": {
                        "executiveSummary": proposal.executive_summary,  # ← camelCase
                        "reportType": "waste_upcycling_feasibility",  # ← camelCase
                    },
                },
            )

            logger.info(
                "proposal_generation_completed",
                proposal_id=str(proposal.id),
                project_id=str(project_id),
                job_id=job_id,
                version=new_version,
                total_duration_seconds=round(time.time() - start_time, 2)
            )

        except Exception as e:
            logger.error(
                "proposal_generation_error",
                exc_info=True,
                project_id=str(project_id),
                job_id=job_id,
                error_type=type(e).__name__,
                error_message=str(e)
            )
            await cache_service.set_job_status(
                job_id=job_id,
                status="failed",
                progress=0,
                current_step="Failed",
                error=str(e),
            )

    @staticmethod
    async def get_job_status(job_id: str) -> dict[str, Any] | None:
        """
        Get proposal generation job status.
        
        Args:
            job_id: Job identifier
            
        Returns:
            Job status data or None
        """
        return await cache_service.get_job_status(job_id)

    @staticmethod
    async def generate_proposal_async_wrapper(
        project_id: uuid.UUID,
        request: ProposalGenerationRequest,
        job_id: str,
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
    new_version: str
) -> Proposal:
    """Create Proposal from ProposalOutput (DRY principle)."""
    proposal_data = proposal_output.model_dump(by_alias=True, exclude_none=True)
    
    ai_metadata = {
        "proposal": proposal_data,
        "transparency": {
            "clientMetadata": client_metadata,
            "generatedAt": datetime.utcnow().isoformat(),
            "generationTimeSeconds": round(generation_duration, 2),
            "reportType": "waste_opportunity"
        }
    }
    
    markdown = _generate_markdown_report(proposal_output)
    
    return Proposal(
        project_id=project_id,
        version=new_version,
        title=f"Opportunity Report - {project_name}",
        proposal_type=request.proposal_type,
        status="Draft",
        author="DSR-AI",
        capex=0.0,
        opex=0.0,
        executive_summary=proposal_output.headline,
        technical_approach=markdown,
        ai_metadata=ai_metadata,
    )


def _generate_markdown_report(output: ProposalOutput) -> str:
    """Generate buyer-focused markdown from structured data."""
    
    # Format pathways
    pathway_lines = []
    for i, p in enumerate(output.pathways, 1):
        pathway_lines.append(f"""
### Pathway {i}: {p.action}

- **Buyers:** {p.buyer_types}
- **Price:** {p.price_range}
- **Annual Value:** {p.annual_value}
- **ESG Pitch for Buyer:** _{p.esg_pitch}_
- **Handling:** {p.handling}
""")
    
    pathways_md = "".join(pathway_lines)
    
    return f"""# DSR Opportunity Report

## {output.recommendation}: {output.headline}

**Confidence:** {output.confidence}

---

## Client: {output.client}
- **Location:** {output.location}
- **Material:** {output.material}
- **Volume:** {output.volume}

---

## Financials

| Current Cost | DSR Offer | DSR Margin |
|-------------|-----------|------------|
| {output.financials.current_cost} | {output.financials.dsr_offer} | {output.financials.dsr_margin} |

---

## Environmental Impact

- **CO₂ Avoided:** {output.environment.co2_avoided}
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

{chr(10).join(f'- {r}' for r in output.risks)}

---

## Next Steps

{chr(10).join(f'{i}. {s}' for i, s in enumerate(output.next_steps, 1))}

---

## ROI Summary

💰 **{output.roi_summary or 'ROI calculation pending'}**
"""


# Global service instance
proposal_service = ProposalService()
