"""AI agent for analyzing intake notes (LLM-only)."""

import os
import time
from dataclasses import dataclass
from pathlib import Path

import structlog
from pydantic_ai import Agent, RunContext
from pydantic_ai.settings import ModelSettings

from app.core.config import settings
from app.models.notes_analysis_output import NotesAnalysisOutput

logger = structlog.get_logger(__name__)


class NotesAnalysisError(Exception):
    """Custom exception for notes analysis failures."""

    pass


@dataclass
class NotesContext:
    field_catalog: str


if not os.getenv("OPENAI_API_KEY") and settings.OPENAI_API_KEY:
    os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY


def load_notes_analysis_prompt() -> str:
    prompt_path = Path(__file__).parent.parent / "prompts" / "notes-analysis.md"
    try:
        content = prompt_path.read_text(encoding="utf-8").strip()
        if not content:
            raise ValueError(f"Prompt file is empty: {prompt_path}")
        logger.info("✅ Loaded notes analysis prompt", prompt=prompt_path.name)
        return content
    except FileNotFoundError:
        logger.error("❌ Prompt file not found", path=str(prompt_path))
        raise


notes_analysis_agent = Agent(
    settings.AI_TEXT_MODEL,
    deps_type=NotesContext,
    output_type=NotesAnalysisOutput,
    instructions=load_notes_analysis_prompt(),
    model_settings=ModelSettings(temperature=0.2),
    retries=2,
)


@notes_analysis_agent.instructions
def inject_field_catalog(ctx: RunContext[NotesContext]) -> str:
    return f"Allowed fields (use exact field_id values):\n{ctx.deps.field_catalog}"


async def analyze_notes(text: str, field_catalog: str) -> NotesAnalysisOutput:
    if not text:
        raise NotesAnalysisError("Empty intake notes")

    try:
        logger.info("notes_analysis_start", chars=len(text))
        started = time.perf_counter()
        context = NotesContext(field_catalog=field_catalog)
        result = await notes_analysis_agent.run(
            f"Analyze these intake notes:\n\n{text}",
            deps=context,
        )
        output = NotesAnalysisOutput.model_validate(result.output)
        duration_ms = (time.perf_counter() - started) * 1000
        logger.info(
            "notes_analysis_complete",
            duration_ms=round(duration_ms, 2),
            suggestions=len(output.suggestions),
            unmapped=len(output.unmapped),
        )
        return output
    except Exception as exc:
        logger.error("notes_analysis_failed", error=str(exc))
        raise NotesAnalysisError(str(exc)) from exc
