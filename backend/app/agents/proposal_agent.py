"""
AI Agent for generating waste upcycling feasibility reports.
Analyzes waste assessment questionnaire data to generate business-focused reports.
No engineering tools needed - pure LLM analysis of waste streams, pathways, and ROI.
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
    """Custom exception for proposal generation failures"""

    pass


# Simple data structure for the agent
@dataclass
class ProposalContext:
    """Simple context for proposal generation"""

    water_data: FlexibleWaterProjectData
    client_metadata: dict[str, Any]


# Configure OpenAI API
if not os.getenv("OPENAI_API_KEY") and settings.OPENAI_API_KEY:
    os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY

if not os.getenv("OPENAI_API_KEY"):
    logger.error("OpenAI API key not found")
    raise ValueError("OpenAI API key required")


def load_proposal_prompt() -> str:
    """
    Load waste upcycling report prompt from external markdown file.
    Follows 2025 best practices for prompt management in production AI applications.
    """
    prompt_path = Path(__file__).parent.parent / "prompts" / "dsr-bussines-opportunity.v2.md"

    try:
        with open(prompt_path, encoding="utf-8") as f:
            content = f.read().strip()

        if not content:
            raise ValueError(f"Prompt file is empty: {prompt_path}")

        logger.info(f"✅ Loaded prompt template from: {prompt_path.name}")
        return content

    except FileNotFoundError:
        logger.error(f"❌ Prompt file not found: {prompt_path}")
        raise
    except Exception as e:
        logger.error(f"❌ Error loading prompt: {e}")
        raise


proposal_agent = Agent(
    f"openai:{settings.OPENAI_MODEL}",  # Read from .env for flexibility
    deps_type=ProposalContext,
    output_type=ProposalOutput,
    instructions=load_proposal_prompt(),
    model_settings=ModelSettings(
        temperature=0.3,  # Slightly higher for creative business recommendations
    ),
    retries=1,
)


# Dynamic data injection using @instructions
@proposal_agent.instructions
def inject_company_context(ctx: RunContext[ProposalContext]) -> str:
    """Inject dynamic company and project context"""
    client_metadata = ctx.deps.client_metadata

    return f"""
PROJECT CONTEXT:
Company: {client_metadata.get("company_name", "Client Company")}
Industry: {client_metadata.get("selected_sector", "Industrial")}
Subsector: {client_metadata.get("selected_subsector", "General")}
Location: {client_metadata.get("user_location", "Not specified")}
"""


@proposal_agent.instructions
def inject_waste_assessment_data(ctx: RunContext[ProposalContext]) -> str:
    """
    Inject clean waste assessment data for AI analysis.

    Uses to_ai_context() to extract ONLY relevant values without UI metadata,
    reducing token count and improving AI focus on business analysis.
    """
    water_data = ctx.deps.water_data  # Still called water_data for compatibility

    # Extract clean context (no id, type, source, importance metadata)
    ai_context = water_data.to_ai_context()

    # Format as readable markdown
    formatted_context = water_data.format_ai_context_to_string(ai_context)

    return f"""
WASTE ASSESSMENT DATA:
{formatted_context}
"""


@proposal_agent.instructions
def inject_client_requirements(ctx: RunContext[ProposalContext]) -> str:
    """Inject additional client metadata and requirements"""
    client_metadata = ctx.deps.client_metadata
    metadata_json = json.dumps(client_metadata, indent=2)

    return f"""
CLIENT REQUIREMENTS & METADATA:
{metadata_json}
"""

async def generate_enhanced_proposal(
    water_data: FlexibleWaterProjectData,
    client_metadata: dict[str, Any] | None = None,
) -> ProposalOutput:
    """
    Generate waste upcycling feasibility report using AI agent.

    Args:
        water_data: FlexibleWaterProjectData with waste assessment questionnaire data
        client_metadata: Client metadata dict from user profile and project

    Returns:
        ProposalOutput: Complete waste upcycling feasibility report with business recommendations
    """
    if client_metadata is None:
        client_metadata = {}

    try:
        logger.info("🧠 Starting proposal generation...")

        # ═══════════════════════════════════════════════════════════════════
        # 🔍 LOG CLEAN DATA SENT TO AI AGENT
        # ═══════════════════════════════════════════════════════════════════
        logger.info("╔══════════════════════════════════════════════════════════════╗")
        logger.info("║         📨 CLEAN DATA SENT TO AI AGENT (No Metadata)         ║")
        logger.info("╚══════════════════════════════════════════════════════════════╝")

        # 1. Extract and log clean AI context
        ai_context = water_data.to_ai_context()
        ai_context_json = json.dumps(ai_context, indent=2, ensure_ascii=False)

        logger.info("🎯 CLEAN AI CONTEXT:")
        logger.info(f"\n{ai_context_json}")

        # 2. Show formatted string preview (what actually gets injected)
        formatted_context = water_data.format_ai_context_to_string(ai_context)
        logger.info("\n📝 FORMATTED CONTEXT (for prompt injection):")
        logger.info(
            f"\n{formatted_context[:500]}..."
            if len(formatted_context) > 500
            else f"\n{formatted_context}"
        )

        # 3. Log client metadata
        metadata_json = json.dumps(client_metadata, indent=2, ensure_ascii=False)
        logger.info("\n🏢 CLIENT METADATA:")
        logger.info(f"\n{metadata_json}")

        # 4. Token efficiency info
        full_json = water_data.model_dump_json(exclude_none=True)
        logger.info("\n💡 EFFICIENCY:")
        logger.info(f"  Full serialization: {len(full_json)} chars")
        logger.info(f"  Clean context: {len(formatted_context)} chars")
        logger.info(
            f"  Reduction: {round((1 - len(formatted_context) / len(full_json)) * 100, 1)}%"
        )

        logger.info("════════════════════════════════════════════════════════════════")

        # Create context - data will be injected via @instructions
        context = ProposalContext(
            water_data=water_data,
            client_metadata=client_metadata,
        )

        # Run agent with usage limits (no tools = faster, lower token count)
        result = await proposal_agent.run(
            "Generate a comprehensive waste upcycling feasibility report analyzing waste streams, recovery opportunities, ROI, and environmental impact.",
            deps=context,
            usage_limits=UsageLimits(
                request_limit=5,       # No tools needed - just LLM reasoning
                total_tokens_limit=100000,  # Lower limit - simpler business analysis
            ),
        )

        # Log success with token usage
        usage = result.usage()
        if usage:
            logger.info("✅ Report generated successfully")
            logger.info(
                f"📊 Token usage: {usage.total_tokens:,} / 100,000 ({usage.total_tokens / 1000:.1f}%)"
            )
            # Note: RunUsage doesn't have request_count attribute in pydantic-ai
            # Use usage.requests if available or skip logging request count
            try:
                if hasattr(usage, "requests"):
                    logger.info(f"📊 API requests: {len(usage.requests)}")
            except:
                pass

            # Warn if approaching limit
            if usage.total_tokens > 80000:
                logger.warning(
                    f"⚠️  HIGH TOKEN USAGE: {usage.total_tokens:,} tokens (>80K). "
                    f"Consider optimizing prompt or increasing limit."
                )

        # 🔍 INSPECT OUTPUT FOR TOKEN ANALYSIS
        try:
            markdown_chars = len(result.output.markdown_content)
            markdown_words = len(result.output.markdown_content.split())
            markdown_lines = len(result.output.markdown_content.split("\n"))

            logger.info("╔══════════════════════════════════════════════════════════════╗")
            logger.info("║          📝 MARKDOWN CONTENT ANALYSIS                        ║")
            logger.info("╠══════════════════════════════════════════════════════════════╣")
            logger.info(f"║ Characters: {markdown_chars:,}")
            logger.info(f"║ Words: {markdown_words:,}")
            logger.info(f"║ Lines: {markdown_lines}")
            logger.info(f"║ Est. tokens: {int(markdown_words * 1.3):,} (words × 1.3)")
            logger.info("╠══════════════════════════════════════════════════════════════╣")
            logger.info("║ First 500 characters:")
            logger.info(f"║ {result.output.markdown_content[:500]}")
            logger.info("╚══════════════════════════════════════════════════════════════╝")
        except Exception as inspect_error:
            logger.debug(f"Could not inspect markdown output: {inspect_error}")
        else:
            logger.info("✅ Report generated successfully")

        # No deviation analysis needed for waste upcycling (no proven cases)

        return result.output

    except Exception as e:
        logger.error(f"❌ Error generating proposal: {e}", exc_info=True)
        raise ProposalGenerationError(f"Failed to generate proposal: {e}")
