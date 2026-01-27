"""Structured output model for intake notes analysis agent."""

from pydantic import Field

from app.models.document_analysis_output import DocumentUnmapped
from app.schemas.common import BaseSchema


class NotesSuggestion(BaseSchema):
    """Suggestion extracted from intake notes (no evidence allowed)."""

    field_id: str
    value: str
    unit: str | None = None
    confidence: int = Field(ge=0, le=100)


class NotesAnalysisOutput(BaseSchema):
    suggestions: list[NotesSuggestion] = Field(max_length=20)
    unmapped: list[DocumentUnmapped] = Field(max_length=10)

    @staticmethod
    def normalize_confidence(confidence: int) -> int:
        return max(0, min(100, int(confidence)))
