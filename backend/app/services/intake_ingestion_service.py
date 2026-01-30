"""Intake ingestion service for AI extraction and persistence."""

from __future__ import annotations

import re
from datetime import UTC, datetime
from typing import Any, Literal

import structlog
from pydantic import ValidationError
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.document_analysis_agent import DocumentAnalysisError, analyze_document
from app.agents.image_analysis_agent import ImageAnalysisError, analyze_image
from app.agents.notes_analysis_agent import analyze_notes
from app.models.document_analysis_output import DocumentAnalysisOutput, DocumentUnmapped
from app.models.file import ProjectFile
from app.models.intake_note import IntakeNote
from app.models.intake_suggestion import IntakeSuggestion
from app.models.intake_unmapped_note import IntakeUnmappedNote
from app.models.notes_analysis_output import NotesAnalysisOutput
from app.models.project import Project
from app.schemas.intake import IntakeEvidence
from app.services.intake_field_catalog import (
    FieldRegistryItem,
    build_questionnaire_registry,
    format_catalog_for_prompt,
    normalize_suggestions,
)
from app.services.s3_service import download_file_content

logger = structlog.get_logger(__name__)

DocType = Literal["sds", "lab", "general"]
MAX_PROCESSING_ATTEMPTS = 3
MAX_UNMAPPED_ITEMS = 10
MIN_UNMAPPED_CONFIDENCE = 60
_METADATA_PATTERNS = [
    re.compile(r"^(page|p\.)\s*\d+\b", re.IGNORECASE),
    re.compile(r"\b(table of contents|contents)\b", re.IGNORECASE),
    re.compile(r"\b(rev|revision|version|doc(ument)?\s*(no|id))\b", re.IGNORECASE),
    re.compile(r"\b(tel|phone|fax|email)\b", re.IGNORECASE),
    re.compile(r"\bwww\.\S+|https?://\S+\b", re.IGNORECASE),
    re.compile(r"\b(confidential|all rights reserved|copyright|prepared by|issued)\b", re.IGNORECASE),
]


def determine_doc_type(category: str | None) -> DocType:
    if category == "analysis":
        return "lab"
    if category == "regulatory":
        return "sds"
    if category in {"technical", "general"}:
        return "general"
    return "general"


def determine_image_route(category: str | None) -> Literal["image", "document"]:
    if category == "photos":
        return "image"
    if category in {"analysis", "regulatory", "technical", "general"}:
        return "document"
    return "image"


class IntakeIngestionService:
    """Ingestion service for intake panel."""

    def __init__(self, registry: dict[str, FieldRegistryItem] | None = None) -> None:
        self.registry = registry or build_questionnaire_registry()

    async def enqueue_ingestion(self, db: AsyncSession, file: ProjectFile) -> None:
        if file.processing_status == "completed" and file.file_hash:
            return
        if file.processing_status in {"queued", "processing"}:
            return
        file.processing_status = "queued"
        file.processing_error = None
        await db.flush()

    async def claim_next_file(self, db: AsyncSession) -> ProjectFile | None:
        result = await db.execute(
            select(ProjectFile)
            .where(ProjectFile.processing_status == "queued")
            .where(ProjectFile.processing_attempts < MAX_PROCESSING_ATTEMPTS)
            .with_for_update(skip_locked=True)
            .limit(1)
        )
        file = result.scalar_one_or_none()
        if not file:
            return None
        file.processing_status = "processing"
        file.processing_attempts += 1
        await db.flush()
        logger.info(
            "intake_ingestion_started",
            file_id=str(file.id),
            project_id=str(file.project_id),
            attempt=file.processing_attempts,
        )
        return file

    async def fail_exhausted_files(self, db: AsyncSession) -> int:
        result = await db.execute(
            select(ProjectFile)
            .where(ProjectFile.processing_status == "queued")
            .where(ProjectFile.processing_attempts >= MAX_PROCESSING_ATTEMPTS)
            .with_for_update(skip_locked=True)
        )
        files = result.scalars().all()
        if not files:
            return 0
        for file in files:
            await self._mark_failed(db, file, "max_attempts_reached")
            logger.warning("max_attempts_reached", file_id=str(file.id))
        return len(files)

    async def process_file(self, db: AsyncSession, file: ProjectFile) -> None:
        if file.file_hash and file.processed_at and (file.ai_analysis or file.processed_text):
            file.processing_status = "completed"
            file.processing_error = None
            await db.flush()
            return

        if file.file_hash:
            existing_stmt = (
                select(ProjectFile)
                .where(ProjectFile.file_hash == file.file_hash)
                .where(ProjectFile.organization_id == file.organization_id)
                .where(ProjectFile.project_id == file.project_id)
                .where(ProjectFile.processing_status == "completed")
                .where(ProjectFile.id != file.id)
                .order_by(ProjectFile.processed_at.desc().nullslast())
                .limit(1)
            )
            existing = await db.execute(existing_stmt)
            cached = existing.scalar_one_or_none()
            if cached and (cached.ai_analysis or cached.processed_text):
                file.ai_analysis = cached.ai_analysis
                file.processed_text = cached.processed_text
                await self._clone_cached_outputs(db, file, cached)
                await self._mark_completed(db, file)
                return

        try:
            file_bytes = await download_file_content(file.file_path)
            file_type = (file.file_type or "").lower()

            if file_type in {"jpg", "jpeg", "png"}:
                await self._process_image_or_document(db, file, file_bytes)
            elif file_type == "pdf":
                await self._process_document(db, file, file_bytes)
            else:
                await self._mark_completed(db, file)
        except Exception as exc:
            await self._mark_failed(db, file, str(exc))
            raise

    async def analyze_notes_text(
        self,
        db: AsyncSession,
        project: Project,
        notes_updated_at: datetime,
    ) -> tuple[int, int, bool]:
        current_note = await self._get_intake_note(db, project)
        if not current_note or not current_note.text.strip():
            raise ValueError("intake_notes_missing")
        if len(current_note.text.strip()) < 20:
            raise ValueError("intake_notes_too_short")
        if current_note and not _timestamps_equal(current_note.updated_at, notes_updated_at):
            logger.info("notes_analysis_precheck_stale", project_id=str(project.id))
            return 0, 0, True

        truncated = (
            current_note.text[-8000:]
            if len(current_note.text) > 8000
            else current_note.text
        )

        # Use new field catalog with type metadata
        field_catalog = format_catalog_for_prompt(self.registry)
        analysis = await analyze_notes(truncated, field_catalog)

        # Normalize suggestions: dedupe, validate field_ids, handle multi-value fields
        valid_suggestions, extra_unmapped = normalize_suggestions(
            [s.model_dump() for s in analysis.suggestions],
            self.registry,
            source="notes",
        )

        current_note = await self._get_intake_note(db, project)
        if not current_note or not _timestamps_equal(
            current_note.updated_at, notes_updated_at
        ):
            logger.info("notes_analysis_postcheck_stale", project_id=str(project.id))
            return 0, 0, True

        async with db.begin_nested():
            await db.execute(
                text("SELECT pg_advisory_xact_lock(hashtext(:lock_key))"),
                {"lock_key": f"notes_analysis:{project.id}"},
            )
            await db.execute(
                delete(IntakeSuggestion)
                .where(IntakeSuggestion.project_id == project.id)
                .where(IntakeSuggestion.organization_id == project.organization_id)
                .where(IntakeSuggestion.source == "notes")
                .where(IntakeSuggestion.status == "pending")
            )
            await db.execute(
                delete(IntakeUnmappedNote)
                .where(IntakeUnmappedNote.project_id == project.id)
                .where(IntakeUnmappedNote.organization_id == project.organization_id)
                .where(IntakeUnmappedNote.source_file_id.is_(None))
                .where(IntakeUnmappedNote.source_file.is_(None))
                .where(IntakeUnmappedNote.status == "open")
            )

            # Persist valid suggestions
            for suggestion_data in valid_suggestions:
                field_id = suggestion_data["field_id"]
                registry_item = self.registry.get(field_id)
                if not registry_item:
                    continue

                value = suggestion_data.get("value", "")
                value_type = "number" if _is_number_like(str(value)) else "string"
                intake_suggestion = IntakeSuggestion(
                    organization_id=project.organization_id,
                    project_id=project.id,
                    source_file_id=None,
                    field_id=registry_item.field_id,
                    field_label=registry_item.field_label,
                    section_id=registry_item.section_id,
                    section_title=registry_item.section_title,
                    value=str(value),
                    value_type=value_type,
                    unit=suggestion_data.get("unit"),
                    confidence=NotesAnalysisOutput.normalize_confidence(
                        suggestion_data.get("confidence", 50)
                    ),
                    status="pending",
                    source="notes",
                    evidence=None,
                    created_by_user_id=None,
                )
                db.add(intake_suggestion)

            # Persist unmapped from analysis + extra from normalization
            for unmapped in analysis.unmapped:
                await self._persist_unmapped_from_notes(
                    db,
                    project,
                    unmapped.extracted_text,
                    unmapped.confidence,
                )

            for unmapped_data in extra_unmapped:
                await self._persist_unmapped_from_notes(
                    db,
                    project,
                    unmapped_data.get("extracted_text", ""),
                    unmapped_data.get("confidence", 50),
                )

        return len(valid_suggestions), len(analysis.unmapped) + len(extra_unmapped), False

    async def _process_image_or_document(
        self,
        db: AsyncSession,
        file: ProjectFile,
        file_bytes: bytes,
    ) -> None:
        route = determine_image_route(file.category)
        if route == "image":
            await self._process_image(db, file, file_bytes)
            return
        await self._process_document(db, file, file_bytes)

    async def _process_image(
        self,
        db: AsyncSession,
        file: ProjectFile,
        file_bytes: bytes,
    ) -> None:
        try:
            result = await analyze_image(
                image_data=file_bytes,
                filename=file.filename,
                media_type=file.mime_type or "image/jpeg",
            )
        except ImageAnalysisError as exc:
            await self._mark_failed(db, file, str(exc))
            return

        file.ai_analysis = result.model_dump()
        file.processed_text = result.summary

        await self._delete_pending_for_source(db, file)
        await self._persist_unmapped_from_image(db, file, result.summary)
        await self._mark_completed(db, file)

    async def _persist_unmapped_from_image(
        self, db: AsyncSession, file: ProjectFile, summary: str
    ) -> None:
        if not summary:
            return

        unmapped = IntakeUnmappedNote(
            organization_id=file.organization_id,
            project_id=file.project_id,
            extracted_text=summary,
            confidence=50,
            source_file_id=file.id,
            source_file=file.filename,
            status="open",
        )
        db.add(unmapped)

    async def _process_document(
        self,
        db: AsyncSession,
        file: ProjectFile,
        file_bytes: bytes,
    ) -> None:
        doc_type = determine_doc_type(file.category)
        try:
            field_catalog = self._build_field_catalog()
            analysis = await analyze_document(
                document_bytes=file_bytes,
                filename=file.filename,
                doc_type=doc_type,
                field_catalog=field_catalog,
                media_type=file.mime_type or "application/pdf",
            )
        except DocumentAnalysisError as exc:
            await self._mark_failed(db, file, str(exc))
            return

        await self._persist_document_analysis(db, file, analysis, doc_type)
        await self._mark_completed(db, file)

    async def _persist_document_analysis(
        self,
        db: AsyncSession,
        file: ProjectFile,
        analysis: DocumentAnalysisOutput,
        doc_type: DocType,
    ) -> None:
        file.ai_analysis = {
            "summary": analysis.summary,
            "key_facts": analysis.key_facts,
            "doc_type": doc_type,
        }
        file.processed_text = analysis.summary

        await self._delete_pending_for_source(db, file)

        # Normalize suggestions: dedupe, validate field_ids, handle multi-value fields
        valid_suggestions, extra_unmapped = normalize_suggestions(
            [s.model_dump() for s in analysis.suggestions],
            self.registry,
            source="document",
        )

        for suggestion_data in valid_suggestions:
            field_id = suggestion_data["field_id"]
            registry_item = self.registry.get(field_id)
            if not registry_item:
                continue

            # Check for evidence - documents require evidence
            evidence_data = suggestion_data.get("evidence")
            if not evidence_data:
                await self._persist_unmapped(db, file, suggestion_data.get("value", ""), suggestion_data.get("confidence", 50))
                continue

            evidence_payload: dict[str, Any] | None = None
            page = _normalize_page(evidence_data.get("page"))
            evidence_payload = IntakeEvidence(
                file_id=file.id,
                filename=file.filename,
                page=page,
                excerpt=evidence_data.get("excerpt", ""),
            ).model_dump(mode="json")

            value = suggestion_data.get("value", "")
            value_type = "number" if _is_number_like(str(value)) else "string"
            intake_suggestion = IntakeSuggestion(
                organization_id=file.organization_id,
                project_id=file.project_id,
                source_file_id=file.id,
                field_id=registry_item.field_id,
                field_label=registry_item.field_label,
                section_id=registry_item.section_id,
                section_title=registry_item.section_title,
                value=str(value),
                value_type=value_type,
                unit=suggestion_data.get("unit"),
                confidence=analysis.normalize_confidence(suggestion_data.get("confidence", 50)),
                status="pending",
                source="file" if doc_type == "general" else doc_type,
                evidence=evidence_payload,
                created_by_user_id=None,
            )
            db.add(intake_suggestion)

        # Persist unmapped from analysis + extra from normalization
        filtered_unmapped = _filter_unmapped_items(analysis.unmapped)
        all_unmapped = list(filtered_unmapped) + [DocumentUnmapped(**u) for u in extra_unmapped]
        for item in all_unmapped[:MAX_UNMAPPED_ITEMS]:
            await self._persist_unmapped(db, file, item.extracted_text, item.confidence)

    async def _delete_pending_for_source(self, db: AsyncSession, file: ProjectFile) -> None:
        await db.execute(
            delete(IntakeSuggestion)
            .where(IntakeSuggestion.project_id == file.project_id)
            .where(IntakeSuggestion.organization_id == file.organization_id)
            .where(IntakeSuggestion.source_file_id == file.id)
            .where(IntakeSuggestion.status == "pending")
        )
        await db.execute(
            delete(IntakeUnmappedNote)
            .where(IntakeUnmappedNote.project_id == file.project_id)
            .where(IntakeUnmappedNote.organization_id == file.organization_id)
            .where(IntakeUnmappedNote.source_file_id == file.id)
            .where(IntakeUnmappedNote.status == "open")
        )

    async def _persist_unmapped(
        self, db: AsyncSession, file: ProjectFile, text: str, confidence: int
    ) -> None:
        unmapped = IntakeUnmappedNote(
            organization_id=file.organization_id,
            project_id=file.project_id,
            extracted_text=text,
            confidence=DocumentAnalysisOutput.normalize_confidence(confidence),
            source_file_id=file.id,
            source_file=file.filename,
            status="open",
        )
        db.add(unmapped)

    async def _clone_cached_outputs(
        self,
        db: AsyncSession,
        file: ProjectFile,
        cached: ProjectFile,
    ) -> None:
        await self._delete_pending_for_source(db, file)

        suggestions_result = await db.execute(
            select(IntakeSuggestion).where(
                IntakeSuggestion.project_id == file.project_id,
                IntakeSuggestion.organization_id == file.organization_id,
                IntakeSuggestion.source_file_id == cached.id,
                IntakeSuggestion.status == "pending",
            )
        )
        cached_suggestions = suggestions_result.scalars().all()
        for suggestion in cached_suggestions:
            evidence_payload: dict[str, Any] | None = None
            if suggestion.evidence:
                try:
                    evidence = IntakeEvidence.model_validate(suggestion.evidence)
                except ValidationError:
                    logger.warning(
                        "invalid_intake_evidence_clone",
                        suggestion_id=str(suggestion.id),
                    )
                    await self._persist_unmapped(db, file, suggestion.value, suggestion.confidence)
                    continue
                if evidence:
                    evidence_payload = IntakeEvidence(
                        file_id=file.id,
                        filename=file.filename,
                        page=_normalize_page(evidence.page),
                        excerpt=evidence.excerpt,
                    ).model_dump(mode="json")
            else:
                await self._persist_unmapped(db, file, suggestion.value, suggestion.confidence)
                continue

            clone = IntakeSuggestion(
                organization_id=file.organization_id,
                project_id=file.project_id,
                source_file_id=file.id,
                field_id=suggestion.field_id,
                field_label=suggestion.field_label,
                section_id=suggestion.section_id,
                section_title=suggestion.section_title,
                value=suggestion.value,
                value_type=suggestion.value_type,
                unit=suggestion.unit,
                confidence=suggestion.confidence,
                status="pending",
                source=suggestion.source,
                evidence=evidence_payload,
                created_by_user_id=None,
            )
            db.add(clone)

        unmapped_result = await db.execute(
            select(IntakeUnmappedNote).where(
                IntakeUnmappedNote.project_id == file.project_id,
                IntakeUnmappedNote.organization_id == file.organization_id,
                IntakeUnmappedNote.source_file_id == cached.id,
                IntakeUnmappedNote.status == "open",
            )
        )
        cached_unmapped = unmapped_result.scalars().all()
        for note in cached_unmapped:
            unmapped = IntakeUnmappedNote(
                organization_id=file.organization_id,
                project_id=file.project_id,
                extracted_text=note.extracted_text,
                confidence=note.confidence,
                source_file_id=file.id,
                source_file=file.filename,
                status="open",
            )
            db.add(unmapped)

    async def _mark_completed(self, db: AsyncSession, file: ProjectFile) -> None:
        file.processing_status = "completed"
        file.processing_error = None
        file.processed_at = datetime.now(UTC)
        await db.flush()
        logger.info("intake_ingestion_completed", file_id=str(file.id))

    async def _mark_failed(self, db: AsyncSession, file: ProjectFile, error: str) -> None:
        file.processing_status = "failed"
        file.processing_error = error
        file.processed_at = datetime.now(UTC)
        await db.flush()

    def _build_field_catalog(self) -> str:
        """Build field catalog for prompts using the new formatter.

        Deprecated: Use format_catalog_for_prompt() directly from intake_field_catalog module.
        Kept for backward compatibility.
        """
        return format_catalog_for_prompt(self.registry)

    async def _persist_unmapped_from_notes(
        self,
        db: AsyncSession,
        project: Project,
        text: str,
        confidence: int,
    ) -> None:
        unmapped = IntakeUnmappedNote(
            organization_id=project.organization_id,
            project_id=project.id,
            extracted_text=text,
            confidence=NotesAnalysisOutput.normalize_confidence(confidence),
            source_file_id=None,
            source_file=None,
            status="open",
        )
        db.add(unmapped)

    async def _get_intake_note(
        self, db: AsyncSession, project: Project
    ) -> IntakeNote | None:
        result = await db.execute(
            select(IntakeNote).where(
                IntakeNote.project_id == project.id,
                IntakeNote.organization_id == project.organization_id,
            )
        )
        return result.scalar_one_or_none()


def _is_number_like(value: str) -> bool:
    try:
        float(value)
        return True
    except (TypeError, ValueError):
        return False


def _normalize_page(page: int | None) -> int | None:
    if not page or page < 1:
        return None
    return page


def _timestamps_equal(db_ts: datetime, request_ts: datetime) -> bool:
    """Compare timestamps floored to milliseconds.

    Invariant: both timestamps must be timezone-aware UTC.
    """
    if db_ts.tzinfo is None or request_ts.tzinfo is None:
        raise ValueError("Timestamps must be timezone-aware")

    def floor_to_ms(dt: datetime) -> datetime:
        return dt.replace(microsecond=(dt.microsecond // 1000) * 1000)

    db_utc = db_ts.astimezone(UTC)
    request_utc = request_ts.astimezone(UTC)
    return floor_to_ms(db_utc) == floor_to_ms(request_utc)


def _filter_unmapped_items(items: list[DocumentUnmapped]) -> list[DocumentUnmapped]:
    cleaned: list[DocumentUnmapped] = []
    seen: set[str] = set()
    sorted_items = sorted(
        items,
        key=lambda item: DocumentAnalysisOutput.normalize_confidence(item.confidence),
        reverse=True,
    )
    for item in sorted_items:
        text = _normalize_unmapped_text(item.extracted_text)
        if not text:
            continue
        if _is_metadata_like(text):
            continue
        confidence = DocumentAnalysisOutput.normalize_confidence(item.confidence)
        if confidence < MIN_UNMAPPED_CONFIDENCE:
            continue
        dedupe_key = text.casefold()
        if dedupe_key in seen:
            continue
        if _is_trivial_number(text):
            continue
        seen.add(dedupe_key)
        cleaned.append(DocumentUnmapped(extracted_text=text, confidence=confidence))
        if len(cleaned) >= MAX_UNMAPPED_ITEMS:
            break
    return cleaned


def _normalize_unmapped_text(text: str) -> str:
    return " ".join(text.split()).strip()


def _is_trivial_number(text: str) -> bool:
    if any(char.isalpha() for char in text):
        return False
    stripped = text.strip()
    if len(stripped) < 6:
        return True
    return False


def _is_metadata_like(text: str) -> bool:
    lowered = text.casefold()
    if "cas" in lowered:
        return False
    for pattern in _METADATA_PATTERNS:
        if pattern.search(text):
            return True
    return False
