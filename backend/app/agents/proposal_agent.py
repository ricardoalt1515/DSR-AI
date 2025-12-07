"""
AI Agent for generating waste upcycling feasibility reports.

Design principles:
- DRY: Single context injection, no repeated data
- Fail fast: Lazy API key check
- Less code: ~100 lines instead of ~300
- Good names: project_data instead of water_data
"""

import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic_ai import Agent, RunContext
from pydantic_ai.settings import ModelSettings
from pydantic_ai.usage import UsageLimits

from app.core.config import settings
from app.models.project_input import FlexibleWaterProjectData
from app.models.proposal_output import ProposalOutput

logger = logging.getLogger(__name__)


class ProposalGenerationError(Exception):
    """Raised when proposal generation fails."""
    pass


@dataclass
class ProposalContext:
    """Context for proposal generation."""
    project_data: FlexibleWaterProjectData
    client_metadata: dict[str, Any]
    photo_insights: list[dict[str, Any]] | None = None


def _ensure_api_key() -> None:
    """Lazy API key check - fail fast only when actually needed."""
    if not os.getenv("OPENAI_API_KEY"):
        if settings.OPENAI_API_KEY:
            os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY
        else:
            raise ValueError("OPENAI_API_KEY required but not configured")


def _load_prompt() -> str:
    """Load prompt from external file."""
    path = Path(__file__).parent.parent / "prompts" / "waste-upcycling-report.v3.md"
    if not path.exists():
        raise FileNotFoundError(f"Prompt not found: {path}")
    return path.read_text(encoding="utf-8").strip()


# Initialize agent (lazy API key check happens on first use)
proposal_agent = Agent(
    f"openai:{settings.OPENAI_MODEL}",
    deps_type=ProposalContext,
    output_type=ProposalOutput,
    instructions=_load_prompt(),
    model_settings=ModelSettings(temperature=0.4),
    retries=2,
)


@proposal_agent.instructions
def inject_context(ctx: RunContext[ProposalContext]) -> str:
    """
    Single context injection (DRY principle).
    
    Combines: project context, waste data, client metadata, and photo insights.
    """
    meta = ctx.deps.client_metadata
    data = ctx.deps.project_data
    photos = ctx.deps.photo_insights
    
    # Build context sections
    sections = []
    
    # 1. Project context
    sections.append(f"""
PROJECT:
- Company: {meta.get('company_name', 'N/A')}
- Sector: {meta.get('selected_sector', 'Industrial')} / {meta.get('selected_subsector', 'General')}
- Location: {meta.get('user_location', 'Not specified')}
""")
    
    # 2. Waste assessment data (clean, no UI metadata)
    ai_context = data.to_ai_context()
    formatted = data.format_ai_context_to_string(ai_context)
    sections.append(f"""
WASTE ASSESSMENT:
{formatted}
""")
    
    # 3. Photo insights (if available) - pass ESG data directly
    if photos:
        photo_sections = []
        for i, p in enumerate(photos, 1):
            # Core identification
            material = p.get("material_type", "Unknown")
            quality = p.get("quality_grade", "Unknown")
            lifecycle = p.get("lifecycle_status", "Unknown")
            
            # ESG data - pass directly so LLM can copy to esg_pitch
            esg_current = p.get("current_situation", "")
            esg_benefit = p.get("benefit_if_diverted", "")
            
            # Handling - pass directly for safety section
            storage = p.get("storage_requirements", [])
            ppe = p.get("ppe_requirements", [])
            
            # Price hint
            price = p.get("price_band_hint", "N/A")
            
            # Business ideas from photo
            ideas = p.get("business_ideas", [])
            
            photo_sections.append(f"""
PHOTO {i}: {material}
- Quality: {quality} | Lifecycle: {lifecycle}
- Price hint: {price}
- ESG (current): {esg_current}
- ESG (if diverted): {esg_benefit}
- Storage: {', '.join(storage) if storage else 'N/A'}
- PPE: {', '.join(ppe) if ppe else 'Standard'}
- Photo business ideas: {'; '.join(ideas[:2]) if ideas else 'None identified'}
""")
        
        sections.append(f"""
PHOTO ANALYSIS (use this data directly in your pathways):
{''.join(photo_sections)}
""")
    
    return "".join(sections)


async def generate_proposal(
    project_data: FlexibleWaterProjectData,
    client_metadata: dict[str, Any] | None = None,
    photo_insights: list[dict[str, Any]] | None = None,
) -> ProposalOutput:
    """
    Generate waste upcycling feasibility report.
    
    Args:
        project_data: Waste assessment questionnaire data
        client_metadata: Client info (company, sector, location)
        photo_insights: Optional photo analysis from image_analysis_agent
    
    Returns:
        ProposalOutput with GO/NO-GO decision and analysis
    
    Raises:
        ProposalGenerationError: On failure
    """
    _ensure_api_key()  # Fail fast if no API key
    
    context = ProposalContext(
        project_data=project_data,
        client_metadata=client_metadata or {},
        photo_insights=photo_insights,
    )
    
    try:
        logger.info("🧠 Generating proposal...")
        
        result = await proposal_agent.run(
            "Generate a waste upcycling feasibility report with GO/NO-GO decision.",
            deps=context,
            usage_limits=UsageLimits(
                request_limit=3,
                total_tokens_limit=50000,  # Reduced - simpler output
            ),
        )
        
        # Log usage
        if usage := result.usage():
            logger.info(f"✅ Proposal generated ({usage.total_tokens:,} tokens)")
        
        return result.output
        
    except Exception as e:
        logger.error(f"❌ Proposal generation failed: {e}")
        raise ProposalGenerationError(str(e)) from e


# Backwards compatibility alias
generate_enhanced_proposal = generate_proposal
