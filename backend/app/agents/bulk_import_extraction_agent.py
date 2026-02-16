"""AI agent for bulk import extraction (PDF/XLSX/DOCX)."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

import structlog
from pydantic_ai import Agent, BinaryContent, RunContext
from pydantic_ai.settings import ModelSettings

from app.core.config import settings
from app.models.bulk_import_ai_output import BulkImportAIOutput

logger = structlog.get_logger(__name__)


class BulkImportExtractionAgentError(Exception):
    """Raised when bulk import extraction agent fails."""


@dataclass
class BulkImportExtractionContext:
    filename: str
    extension: str


if not os.getenv("OPENAI_API_KEY") and settings.OPENAI_API_KEY:
    os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY


def load_bulk_import_extraction_prompt() -> str:
    prompt_path = Path(__file__).parent.parent / "prompts" / "bulk-import-extraction.md"
    try:
        content = prompt_path.read_text(encoding="utf-8").strip()
        if not content:
            raise ValueError(f"Prompt file is empty: {prompt_path}")
        logger.info("prompt_loaded", prompt=prompt_path.name)
        return content
    except FileNotFoundError:
        logger.error("prompt_missing", path=str(prompt_path))
        raise


_BASE_PROMPT = load_bulk_import_extraction_prompt()


bulk_import_extraction_agent = Agent(
    settings.AI_DOCUMENT_MODEL,
    deps_type=BulkImportExtractionContext,
    output_type=BulkImportAIOutput,
    model_settings=ModelSettings(temperature=0.1),
    retries=2,
    system_prompt=_BASE_PROMPT,
)


@bulk_import_extraction_agent.system_prompt
def inject_context(ctx: RunContext[BulkImportExtractionContext]) -> str:
    return (
        f"Filename: {ctx.deps.filename}\n"
        f"Extension: {ctx.deps.extension}\n"
        "Extract locations and waste streams as strict schema output."
    )


async def run_bulk_import_extraction_agent(
    *,
    file_bytes: bytes,
    filename: str,
    media_type: str,
) -> BulkImportAIOutput:
    if not file_bytes:
        raise BulkImportExtractionAgentError("empty_file")

    context = BulkImportExtractionContext(
        filename=filename,
        extension=Path(filename).suffix.casefold(),
    )

    try:
        result = await bulk_import_extraction_agent.run(
            [
                "Extract bulk import locations and waste streams from this file:",
                BinaryContent(data=file_bytes, media_type=media_type),
            ],
            deps=context,
        )
        return BulkImportAIOutput.model_validate(result.output)
    except Exception as exc:
        raise BulkImportExtractionAgentError("agent_run_failed") from exc


async def run_bulk_import_extraction_agent_on_text(
    *,
    extracted_text: str,
    filename: str,
) -> BulkImportAIOutput:
    if not extracted_text.strip():
        raise BulkImportExtractionAgentError("empty_text")

    context = BulkImportExtractionContext(
        filename=filename,
        extension=Path(filename).suffix.casefold(),
    )

    try:
        result = await bulk_import_extraction_agent.run(
            [
                "Extract bulk import locations and waste streams from this text:",
                extracted_text,
            ],
            deps=context,
        )
        return BulkImportAIOutput.model_validate(result.output)
    except Exception as exc:
        raise BulkImportExtractionAgentError("agent_run_failed") from exc
