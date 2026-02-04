"""Document analysis pipeline seam for future OCR/Textract."""

from __future__ import annotations

from app.agents.document_analysis_agent import analyze_document
from app.models.document_analysis_output import DocumentAnalysisOutput


async def analyze_project_file_document(
    *,
    file_bytes: bytes,
    filename: str,
    doc_type: str,
    field_catalog: str,
    media_type: str,
) -> DocumentAnalysisOutput:
    return await analyze_document(
        document_bytes=file_bytes,
        filename=filename,
        doc_type=doc_type,
        field_catalog=field_catalog,
        media_type=media_type,
    )
