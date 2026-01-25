"""Structured output model for document analysis agent."""

from typing import Literal, cast

from pydantic import Field

from app.schemas.common import BaseSchema


class DocumentEvidence(BaseSchema):
    page: int | None = Field(default=None, description="1-based page number")
    excerpt: str | None = Field(default=None, max_length=500)


class DocumentSuggestion(BaseSchema):
    field_id: str
    value: str
    unit: str | None = None
    confidence: int
    evidence: DocumentEvidence | None = None


class DocumentUnmapped(BaseSchema):
    extracted_text: str
    confidence: int


class DocumentAnalysisOutput(BaseSchema):
    summary: str
    key_facts: list[str]
    suggestions: list[DocumentSuggestion]
    unmapped: list[DocumentUnmapped]

    @staticmethod
    def normalize_value(value: str) -> str:
        return str(value)

    @staticmethod
    def normalize_confidence(confidence: int) -> int:
        return max(0, min(100, int(confidence)))

    @staticmethod
    def normalize_doc_type(doc_type: str) -> Literal["sds", "lab", "general"]:
        if doc_type in {"sds", "lab", "general"}:
            return cast(Literal["sds", "lab", "general"], doc_type)
        return "general"
