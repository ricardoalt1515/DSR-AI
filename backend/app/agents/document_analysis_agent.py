"""AI agent for analyzing documents (LLM-only MVP)."""

import os
from dataclasses import dataclass
from pathlib import Path

import structlog
from pydantic_ai import Agent, BinaryContent, RunContext
from pydantic_ai.settings import ModelSettings

from app.core.config import settings
from app.models.document_analysis_output import DocumentAnalysisOutput

logger = structlog.get_logger(__name__)


class DocumentAnalysisError(Exception):
    """Custom exception for document analysis failures."""

    pass


@dataclass
class DocumentContext:
    filename: str
    doc_type: str
    field_catalog: str


if not os.getenv("OPENAI_API_KEY") and settings.OPENAI_API_KEY:
    os.environ["OPENAI_API_KEY"] = settings.OPENAI_API_KEY


def load_document_analysis_prompt() -> str:
    prompt_path = Path(__file__).parent.parent / "prompts" / "document-analysis.md"
    try:
        content = prompt_path.read_text(encoding="utf-8").strip()
        if not content:
            raise ValueError(f"Prompt file is empty: {prompt_path}")
        logger.info("✅ Loaded document analysis prompt", prompt=prompt_path.name)
        return content
    except FileNotFoundError:
        logger.error("❌ Prompt file not found", path=str(prompt_path))
        raise


document_analysis_agent = Agent(
    settings.AI_DOCUMENT_MODEL,
    deps_type=DocumentContext,
    output_type=DocumentAnalysisOutput,
    instructions=load_document_analysis_prompt(),
    model_settings=ModelSettings(temperature=0.2),
    retries=2,
)


@document_analysis_agent.instructions
def inject_doc_type(ctx: RunContext[DocumentContext]) -> str:
    return f"Document type: {ctx.deps.doc_type}"


@document_analysis_agent.instructions
def inject_field_catalog(ctx: RunContext[DocumentContext]) -> str:
    return f"Allowed fields (use exact field_id values):\n{ctx.deps.field_catalog}"


async def analyze_document(
    document_bytes: bytes,
    filename: str,
    doc_type: str,
    field_catalog: str,
    media_type: str = "application/pdf",
) -> DocumentAnalysisOutput:
    if not document_bytes:
        raise DocumentAnalysisError(f"Empty document: {filename}")

    try:
        context = DocumentContext(
            filename=filename,
            doc_type=doc_type,
            field_catalog=field_catalog,
        )
        result = await document_analysis_agent.run(
            [
                "Analyze this document and extract facts with evidence:",
                BinaryContent(data=document_bytes, media_type=media_type),
            ],
            deps=context,
        )

        output = DocumentAnalysisOutput.model_validate(result.output)
        return output
    except Exception as exc:
        logger.error("document_analysis_failed", filename=filename, error=str(exc))
        raise DocumentAnalysisError(str(exc)) from exc
