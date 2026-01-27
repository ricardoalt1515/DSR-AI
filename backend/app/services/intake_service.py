"""Service layer for intake panel operations."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, Literal, cast
from uuid import UUID

import structlog
from fastapi import HTTPException, status
from pydantic import ValidationError
from sqlalchemy import desc, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.intake_note import IntakeNote
from app.models.intake_suggestion import IntakeSuggestion
from app.models.intake_unmapped_note import IntakeUnmappedNote
from app.models.project import Project
from app.models.user import User
from app.schemas.intake import IntakeEvidence, IntakeSuggestionItem, IntakeUnmappedNoteItem
from app.services.project_data_service import ProjectDataService
from app.services.timeline_service import create_timeline_event

logger = structlog.get_logger(__name__)
UNMAPPED_NOTES_LIMIT = 10
LOW_CONFIDENCE_THRESHOLD = 70


class IntakeService:
    """Service for intake notes, suggestions, and unmapped notes."""

    @staticmethod
    async def get_intake(
        db: AsyncSession,
        project: Project,
    ) -> tuple[
        str | None,
        datetime | None,
        list[IntakeSuggestionItem],
        list[IntakeUnmappedNoteItem],
        int,
        int,
    ]:
        note_result = await db.execute(
            select(IntakeNote).where(
                IntakeNote.project_id == project.id,
                IntakeNote.organization_id == project.organization_id,
            )
        )
        note = note_result.scalar_one_or_none()

        suggestions_result = await db.execute(
            select(IntakeSuggestion).where(
                IntakeSuggestion.project_id == project.id,
                IntakeSuggestion.organization_id == project.organization_id,
            )
        )
        suggestions = suggestions_result.scalars().all()

        unmapped_result = await db.execute(
            select(IntakeUnmappedNote)
            .where(
                IntakeUnmappedNote.project_id == project.id,
                IntakeUnmappedNote.organization_id == project.organization_id,
                IntakeUnmappedNote.status == "open",
            )
            .order_by(desc(IntakeUnmappedNote.confidence), desc(IntakeUnmappedNote.created_at))
            .limit(UNMAPPED_NOTES_LIMIT)
        )
        unmapped = unmapped_result.scalars().all()

        unmapped_count = await IntakeService._count_unmapped_notes(db, project)
        processing_count = await IntakeService._count_processing_files(db, project)

        suggestion_items: list[IntakeSuggestionItem] = []
        for suggestion in suggestions:
            evidence = None
            if suggestion.evidence:
                try:
                    evidence = IntakeEvidence.model_validate(suggestion.evidence)
                except ValidationError:
                    logger.warning(
                        "invalid_intake_evidence",
                        suggestion_id=str(suggestion.id),
                    )
            value = _coerce_value(suggestion.value, suggestion.value_type)
            status = cast(Literal["pending", "applied", "rejected"], suggestion.status)
            suggestion_items.append(
                IntakeSuggestionItem(
                    id=suggestion.id,
                    field_id=suggestion.field_id,
                    field_label=suggestion.field_label,
                    section_id=suggestion.section_id,
                    section_title=suggestion.section_title,
                    value=value,
                    unit=suggestion.unit,
                    confidence=suggestion.confidence,
                    status=status,
                    source=suggestion.source,
                    source_file_id=suggestion.source_file_id,
                    evidence=evidence,
                )
            )

        unmapped_items = [
            IntakeUnmappedNoteItem(
                id=item.id,
                extracted_text=item.extracted_text,
                confidence=item.confidence,
                source_file=item.source_file,
                source_file_id=item.source_file_id,
            )
            for item in unmapped
        ]

        return (
            note.text if note else None,
            note.updated_at if note else None,
            suggestion_items,
            unmapped_items,
            unmapped_count,
            processing_count,
        )

    @staticmethod
    async def _count_processing_files(db: AsyncSession, project: Project) -> int:
        from app.models.file import ProjectFile

        result = await db.execute(
            select(func.count(ProjectFile.id)).where(
                ProjectFile.project_id == project.id,
                ProjectFile.organization_id == project.organization_id,
                ProjectFile.processing_status.in_(["queued", "processing"]),
            )
        )
        return int(result.scalar() or 0)

    @staticmethod
    async def _count_unmapped_notes(db: AsyncSession, project: Project) -> int:
        result = await db.execute(
            select(func.count(IntakeUnmappedNote.id)).where(
                IntakeUnmappedNote.project_id == project.id,
                IntakeUnmappedNote.organization_id == project.organization_id,
                IntakeUnmappedNote.status == "open",
            )
        )
        return int(result.scalar() or 0)

    @staticmethod
    async def save_notes(
        db: AsyncSession,
        project: Project,
        text: str,
        user_id: UUID | None,
    ) -> IntakeNote:
        stmt = (
            insert(IntakeNote)
            .values(
                organization_id=project.organization_id,
                project_id=project.id,
                text=text,
                created_by_user_id=user_id,
                updated_at=datetime.now(UTC),
            )
            .on_conflict_do_update(
                index_elements=["project_id", "organization_id"],
                set_={
                    "text": text,
                    "updated_at": datetime.now(UTC),
                    "created_by_user_id": user_id,
                },
            )
            .returning(IntakeNote)
        )
        result = await db.execute(stmt)
        note = result.scalar_one()
        return note

    @staticmethod
    async def apply_suggestion(
        db: AsyncSession,
        project: Project,
        suggestion_id: UUID,
        current_user: User,
    ) -> IntakeSuggestion:
        now = datetime.now(UTC)
        suggestion_result = await db.execute(
            select(IntakeSuggestion).where(
                IntakeSuggestion.id == suggestion_id,
                IntakeSuggestion.project_id == project.id,
                IntakeSuggestion.organization_id == project.organization_id,
            )
        )
        suggestion = suggestion_result.scalar_one_or_none()
        if not suggestion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Suggestion not found",
            )
        if suggestion.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Suggestion not pending",
            )

        replaced_result = await db.execute(
            update(IntakeSuggestion)
            .where(
                IntakeSuggestion.project_id == project.id,
                IntakeSuggestion.organization_id == project.organization_id,
                IntakeSuggestion.section_id == suggestion.section_id,
                IntakeSuggestion.field_id == suggestion.field_id,
                IntakeSuggestion.status == "applied",
                IntakeSuggestion.id != suggestion.id,
            )
            .values(status="rejected", updated_at=now)
            .returning(IntakeSuggestion.id)
        )
        replaced_ids = [str(row[0]) for row in replaced_result.all()]

        update_stmt = (
            update(IntakeSuggestion)
            .where(
                IntakeSuggestion.id == suggestion_id,
                IntakeSuggestion.project_id == project.id,
                IntakeSuggestion.organization_id == project.organization_id,
                IntakeSuggestion.status == "pending",
            )
            .values(status="applied", updated_at=now)
            .returning(IntakeSuggestion)
        )
        result = await db.execute(update_stmt)
        suggestion = result.scalar_one_or_none()

        if not suggestion:
            await IntakeService._raise_if_missing_or_invalid(db, project, suggestion_id)
            raise AssertionError("Unreachable: suggestion missing")
        assert suggestion is not None

        await IntakeService._apply_to_project_data(db, project, suggestion, current_user)

        auto_rejected_ids = await IntakeService._auto_reject_siblings(
            db,
            project,
            suggestion,
            now,
        )
        if replaced_ids:
            auto_rejected_ids.extend(replaced_ids)

        await create_timeline_event(
            db=db,
            project_id=project.id,
            organization_id=project.organization_id,
            event_type="intake_suggestion_applied",
            title="Suggestion applied",
            actor=current_user.email,
            description=f"Applied {suggestion.field_label}",
            metadata={
                "suggestion_id": str(suggestion.id),
                "section_id": suggestion.section_id,
                "field_id": suggestion.field_id,
                "auto_rejected_ids": auto_rejected_ids,
            },
        )

        logger.info(
            "intake_apply_project_data",
            project_id=str(project.id),
            organization_id=str(project.organization_id),
            user_id=str(current_user.id),
            suggestion_id=str(suggestion.id),
            section_id=suggestion.section_id,
            field_id=suggestion.field_id,
            value_type=suggestion.value_type,
        )

        return suggestion

    @staticmethod
    async def reject_suggestion(
        db: AsyncSession,
        project: Project,
        suggestion_id: UUID,
        current_user: User,
    ) -> IntakeSuggestion:
        now = datetime.now(UTC)
        update_stmt = (
            update(IntakeSuggestion)
            .where(
                IntakeSuggestion.id == suggestion_id,
                IntakeSuggestion.project_id == project.id,
                IntakeSuggestion.organization_id == project.organization_id,
                IntakeSuggestion.status == "pending",
            )
            .values(status="rejected", updated_at=now)
            .returning(IntakeSuggestion)
        )
        result = await db.execute(update_stmt)
        suggestion = result.scalar_one_or_none()

        if not suggestion:
            await IntakeService._raise_if_missing_or_invalid(db, project, suggestion_id)
            raise AssertionError("Unreachable: suggestion missing")
        assert suggestion is not None

        await create_timeline_event(
            db=db,
            project_id=project.id,
            organization_id=project.organization_id,
            event_type="intake_suggestion_rejected",
            title="Suggestion rejected",
            actor=current_user.email,
            description=f"Rejected {suggestion.field_label}",
            metadata={
                "suggestion_id": str(suggestion.id),
                "section_id": suggestion.section_id,
                "field_id": suggestion.field_id,
            },
        )

        return suggestion

    @staticmethod
    async def map_unmapped_note(
        db: AsyncSession,
        project: Project,
        note_id: UUID,
        field_id: str,
        section_id: str,
        field_label: str,
        section_title: str,
        current_user: User,
    ) -> tuple[IntakeUnmappedNote, IntakeSuggestion]:
        now = datetime.now(UTC)
        update_stmt = (
            update(IntakeUnmappedNote)
            .where(
                IntakeUnmappedNote.id == note_id,
                IntakeUnmappedNote.project_id == project.id,
                IntakeUnmappedNote.organization_id == project.organization_id,
                IntakeUnmappedNote.status == "open",
            )
            .values(status="mapped", updated_at=now)
            .returning(IntakeUnmappedNote)
        )
        result = await db.execute(update_stmt)
        note = result.scalar_one_or_none()

        if not note:
            await IntakeService._raise_if_note_missing_or_invalid(db, project, note_id)
            raise AssertionError("Unreachable: note missing")
        assert note is not None

        evidence_payload = None
        source = "notes"
        if note.source_file_id:
            source = "file"
            filename = note.source_file
            if not filename:
                from app.models.file import ProjectFile

                file_result = await db.execute(
                    select(ProjectFile).where(
                        ProjectFile.id == note.source_file_id,
                        ProjectFile.project_id == project.id,
                        ProjectFile.organization_id == project.organization_id,
                    )
                )
                file_row = file_result.scalar_one_or_none()
                filename = file_row.filename if file_row else ""
            if filename:
                evidence_payload = IntakeEvidence(
                    file_id=note.source_file_id,
                    filename=filename,
                    excerpt=_truncate_excerpt(note.extracted_text),
                ).model_dump(mode="json")
            else:
                source = "notes"

        suggestion = IntakeSuggestion(
            organization_id=project.organization_id,
            project_id=project.id,
            source_file_id=note.source_file_id if source != "notes" else None,
            field_id=field_id,
            field_label=field_label,
            section_id=section_id,
            section_title=section_title,
            value=note.extracted_text,
            value_type="string",
            unit=None,
            confidence=note.confidence,
            status="pending",
            source=source,
            evidence=evidence_payload,
            created_by_user_id=current_user.id,
        )
        db.add(suggestion)
        await db.flush()

        note.mapped_to_suggestion_id = suggestion.id
        note.updated_at = now

        return note, suggestion

    @staticmethod
    async def dismiss_unmapped_note(
        db: AsyncSession,
        project: Project,
        note_id: UUID,
    ) -> IntakeUnmappedNote:
        update_stmt = (
            update(IntakeUnmappedNote)
            .where(
                IntakeUnmappedNote.id == note_id,
                IntakeUnmappedNote.project_id == project.id,
                IntakeUnmappedNote.organization_id == project.organization_id,
                IntakeUnmappedNote.status == "open",
            )
            .values(status="dismissed", updated_at=datetime.now(UTC))
            .returning(IntakeUnmappedNote)
        )
        result = await db.execute(update_stmt)
        note = result.scalar_one_or_none()
        if not note:
            await IntakeService._raise_if_note_missing_or_invalid(db, project, note_id)
            raise AssertionError("Unreachable: note missing")
        assert note is not None
        return note

    @staticmethod
    async def dismiss_all_unmapped(
        db: AsyncSession,
        project: Project,
    ) -> int:
        result = await db.execute(
            update(IntakeUnmappedNote)
            .where(
                IntakeUnmappedNote.project_id == project.id,
                IntakeUnmappedNote.organization_id == project.organization_id,
                IntakeUnmappedNote.status == "open",
            )
            .values(status="dismissed", updated_at=datetime.now(UTC))
        )
        return int(result.rowcount or 0)

    @staticmethod
    async def dismiss_unmapped_by_confidence(
        db: AsyncSession,
        project: Project,
        max_confidence: int = LOW_CONFIDENCE_THRESHOLD,
    ) -> int:
        result = await db.execute(
            update(IntakeUnmappedNote)
            .where(
                IntakeUnmappedNote.project_id == project.id,
                IntakeUnmappedNote.organization_id == project.organization_id,
                IntakeUnmappedNote.status == "open",
                IntakeUnmappedNote.confidence < max_confidence,
            )
            .values(status="dismissed", updated_at=datetime.now(UTC))
        )
        return int(result.rowcount or 0)

    @staticmethod
    async def dismiss_unmapped_by_file(
        db: AsyncSession,
        project: Project,
        source_file_id: UUID | None,
    ) -> int:
        stmt = update(IntakeUnmappedNote).where(
            IntakeUnmappedNote.project_id == project.id,
            IntakeUnmappedNote.organization_id == project.organization_id,
            IntakeUnmappedNote.status == "open",
        )
        if source_file_id is None:
            stmt = stmt.where(IntakeUnmappedNote.source_file_id.is_(None))
        else:
            stmt = stmt.where(IntakeUnmappedNote.source_file_id == source_file_id)
        result = await db.execute(stmt.values(status="dismissed", updated_at=datetime.now(UTC)))
        return int(result.rowcount or 0)

    @staticmethod
    async def _apply_to_project_data(
        db: AsyncSession,
        project: Project,
        suggestion: IntakeSuggestion,
        current_user: User,
    ) -> None:
        result = await db.execute(
            select(Project)
            .where(
                Project.id == project.id,
                Project.organization_id == project.organization_id,
            )
            .with_for_update()
        )
        locked_project = result.scalar_one_or_none()
        if not locked_project:
            raise HTTPException(404, "Project not found")

        current_data = locked_project.project_data or {}
        sections_raw = current_data.get("technical_sections")
        if not isinstance(sections_raw, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Project technical sections not found",
            )

        sections_filtered = [section for section in sections_raw if isinstance(section, dict)]
        sections = cast(list[dict[str, Any]], sections_filtered)
        updated = False
        for section in sections:
            if section.get("id") != suggestion.section_id:
                continue
            fields = section.get("fields")
            if not isinstance(fields, list):
                continue
            for field in fields:
                if not isinstance(field, dict):
                    continue
                if field.get("id") == suggestion.field_id:
                    coerced_value = _coerce_value(suggestion.value, suggestion.value_type)
                    if field.get("type") == "tags":
                        if coerced_value in ("", None):
                            field["value"] = []
                        elif isinstance(coerced_value, list):
                            field["value"] = coerced_value
                        else:
                            field["value"] = [str(coerced_value)]
                    else:
                        field["value"] = coerced_value
                    if suggestion.unit is not None:
                        field["unit"] = suggestion.unit
                    updated = True
                    break
            if updated:
                break

        if not updated:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Suggestion target field not found in project data",
            )

        updates: dict[str, Any] = {"technical_sections": sections}
        await ProjectDataService.update_project_data(
            db=db,
            project_id=project.id,
            current_user=current_user,
            org_id=project.organization_id,
            updates=updates,
            merge=True,
            commit=False,
        )

    @staticmethod
    async def _auto_reject_siblings(
        db: AsyncSession,
        project: Project,
        suggestion: IntakeSuggestion,
        now: datetime,
    ) -> list[str]:
        update_stmt = (
            update(IntakeSuggestion)
            .where(
                IntakeSuggestion.project_id == project.id,
                IntakeSuggestion.organization_id == project.organization_id,
                IntakeSuggestion.section_id == suggestion.section_id,
                IntakeSuggestion.field_id == suggestion.field_id,
                IntakeSuggestion.status == "pending",
                IntakeSuggestion.id != suggestion.id,
            )
            .values(status="rejected", updated_at=now)
            .returning(IntakeSuggestion.id)
        )
        result = await db.execute(update_stmt)
        return [str(row[0]) for row in result.all()]

    @staticmethod
    async def _raise_if_missing_or_invalid(
        db: AsyncSession,
        project: Project,
        suggestion_id: UUID,
    ) -> None:
        result = await db.execute(
            select(IntakeSuggestion).where(
                IntakeSuggestion.id == suggestion_id,
                IntakeSuggestion.project_id == project.id,
                IntakeSuggestion.organization_id == project.organization_id,
            )
        )
        suggestion = result.scalar_one_or_none()
        if not suggestion:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Suggestion not found"
            )
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Suggestion not pending")

    @staticmethod
    async def _raise_if_note_missing_or_invalid(
        db: AsyncSession,
        project: Project,
        note_id: UUID,
    ) -> None:
        result = await db.execute(
            select(IntakeUnmappedNote).where(
                IntakeUnmappedNote.id == note_id,
                IntakeUnmappedNote.project_id == project.id,
                IntakeUnmappedNote.organization_id == project.organization_id,
            )
        )
        note = result.scalar_one_or_none()
        if not note:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Note not open")


def _coerce_value(value: str, value_type: str | None) -> str | float:
    if value_type == "number":
        try:
            parsed = float(value)
            if parsed.is_integer():
                return int(parsed)
            return parsed
        except (TypeError, ValueError):
            return value
    return value


def _truncate_excerpt(text: str) -> str:
    if len(text) <= 500:
        return text
    return text[:500]


class BatchSuggestionResult:
    """Result of a batch suggestion operation."""

    id: UUID
    success: bool
    status: Literal["applied", "rejected"] | None
    error: str | None

    def __init__(
        self,
        id: UUID,
        success: bool,
        status: Literal["applied", "rejected"] | None = None,
        error: str | None = None,
    ) -> None:
        self.id = id
        self.success = success
        self.status = status
        self.error = error


class IntakeBatchService:
    """Service for batch intake operations."""

    @staticmethod
    async def batch_update_suggestions(
        db: AsyncSession,
        project: Project,
        suggestion_ids: list[UUID],
        target_status: Literal["applied", "rejected"],
        current_user: User,
    ) -> list[BatchSuggestionResult]:
        """Apply or reject multiple suggestions in a single transaction.

        For 'applied' status, also updates project_data and auto-rejects siblings.
        """
        results: list[BatchSuggestionResult] = []
        now = datetime.now(UTC)

        for suggestion_id in suggestion_ids:
            try:
                if target_status == "applied":
                    suggestion = await IntakeService.apply_suggestion(
                        db=db,
                        project=project,
                        suggestion_id=suggestion_id,
                        current_user=current_user,
                    )
                    results.append(
                        BatchSuggestionResult(
                            id=suggestion.id,
                            success=True,
                            status="applied",
                        )
                    )
                else:
                    suggestion = await IntakeService.reject_suggestion(
                        db=db,
                        project=project,
                        suggestion_id=suggestion_id,
                        current_user=current_user,
                    )
                    results.append(
                        BatchSuggestionResult(
                            id=suggestion.id,
                            success=True,
                            status="rejected",
                        )
                    )
            except IntegrityError:
                await db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Some suggestions could not be updated",
                ) from None
            except HTTPException as e:
                results.append(
                    BatchSuggestionResult(
                        id=suggestion_id,
                        success=False,
                        error=e.detail,
                    )
                )

        return results
