from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Literal
from uuid import UUID

import structlog
from sqlalchemy import delete, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.feedback import Feedback
from app.models.feedback_attachment import FeedbackAttachment
from app.models.file import ProjectFile
from app.models.incoming_material import IncomingMaterial
from app.models.intake_note import IntakeNote
from app.models.intake_suggestion import IntakeSuggestion
from app.models.intake_unmapped_note import IntakeUnmappedNote
from app.models.location import Location
from app.models.location_contact import LocationContact
from app.models.organization import Organization
from app.models.organization_purge_manifest import OrganizationPurgeManifest
from app.models.project import Project
from app.models.proposal import Proposal
from app.models.timeline import TimelineEvent
from app.models.user import User
from app.services.storage_delete_service import delete_storage_keys, validate_storage_keys
from app.utils.purge_utils import extract_pdf_paths

logger = structlog.get_logger(__name__)

PURGE_RETENTION_DAYS = 30


@dataclass(slots=True)
class OrganizationLifecycleError(Exception):
    status_code: int
    code: str
    message: str
    details: dict[str, object] = field(default_factory=dict)


@dataclass(slots=True)
class OrganizationPurgeResult:
    deleted_counts: dict[str, int]
    archived_at: datetime
    storage_paths: set[str]
    cleanup_manifest_id: UUID


@dataclass(slots=True)
class OrganizationArchiveResult:
    organization: Organization
    deactivated_users_count: int


def _lifecycle_error(
    *,
    status_code: int,
    code: str,
    message: str,
    details: dict[str, object] | None = None,
) -> OrganizationLifecycleError:
    return OrganizationLifecycleError(
        status_code=status_code,
        code=code,
        message=message,
        details=details or {},
    )


async def _lock_organization_for_update(
    db: AsyncSession,
    organization_id: UUID,
) -> Organization | None:
    result = await db.execute(
        select(Organization).where(Organization.id == organization_id).with_for_update()
    )
    return result.scalar_one_or_none()


async def archive_organization(
    *,
    db: AsyncSession,
    organization_id: UUID,
    actor_user_id: UUID,
    force_deactivate_users: bool = False,
) -> OrganizationArchiveResult:
    organization = await _lock_organization_for_update(db=db, organization_id=organization_id)
    if organization is None:
        raise _lifecycle_error(
            status_code=404,
            code="ORG_NOT_FOUND",
            message="Organization not found",
            details={"org_id": str(organization_id)},
        )

    if not organization.is_active and organization.archived_at is not None:
        await db.refresh(organization)
        return OrganizationArchiveResult(organization=organization, deactivated_users_count=0)

    active_user_count_result = await db.execute(
        select(func.count(User.id)).where(
            User.organization_id == organization_id,
            User.is_active.is_(True),
        )
    )
    active_user_count = int(active_user_count_result.scalar_one() or 0)

    deactivated_users_count = 0
    if force_deactivate_users:
        deactivated_users_count = active_user_count
        await db.execute(
            update(User)
            .where(
                User.organization_id == organization_id,
                User.is_active.is_(True),
            )
            .values(is_active=False)
        )
    elif active_user_count > 0:
        raise _lifecycle_error(
            status_code=409,
            code="ORG_ACTIVE_USERS_BLOCKED",
            message="Cannot archive organization with active users",
            details={"active_users_count": active_user_count},
        )

    current_timestamp_result = await db.execute(select(func.current_timestamp()))
    current_timestamp = current_timestamp_result.scalar_one()
    if not isinstance(current_timestamp, datetime):
        raise _lifecycle_error(
            status_code=500,
            code="ORG_DB_CLOCK_UNAVAILABLE",
            message="Database clock unavailable",
        )

    archived_at = organization.archived_at or current_timestamp
    organization.is_active = False
    organization.archived_at = archived_at
    organization.archived_by_user_id = actor_user_id

    await db.commit()
    await db.refresh(organization)
    return OrganizationArchiveResult(
        organization=organization,
        deactivated_users_count=deactivated_users_count,
    )


async def restore_organization(
    *,
    db: AsyncSession,
    organization_id: UUID,
) -> Organization:
    organization = await _lock_organization_for_update(db=db, organization_id=organization_id)
    if organization is None:
        raise _lifecycle_error(
            status_code=404,
            code="ORG_NOT_FOUND",
            message="Organization not found",
            details={"org_id": str(organization_id)},
        )

    if organization.is_active and organization.archived_at is None:
        await db.refresh(organization)
        return organization

    organization.is_active = True
    organization.archived_at = None
    organization.archived_by_user_id = None

    await db.commit()
    await db.refresh(organization)
    return organization


EXPLICIT_PURGE_TABLES: tuple[tuple[str, type[Any]], ...] = (
    ("feedback_attachments", FeedbackAttachment),
    ("feedback", Feedback),
    ("intake_unmapped_notes", IntakeUnmappedNote),
    ("intake_suggestions", IntakeSuggestion),
    ("intake_notes", IntakeNote),
    ("timeline_events", TimelineEvent),
    ("project_files", ProjectFile),
    ("proposals", Proposal),
    ("projects", Project),
    ("location_contacts", LocationContact),
    ("incoming_materials", IncomingMaterial),
    ("locations", Location),
    ("companies", Company),
    ("users", User),
)


async def _collect_organization_storage_paths(
    *,
    db: AsyncSession,
    organization_id: UUID,
) -> set[str]:
    storage_paths: set[str] = set()

    file_rows = await db.execute(
        select(ProjectFile.file_path).where(ProjectFile.organization_id == organization_id)
    )
    storage_paths.update({row.file_path for row in file_rows if row.file_path})

    proposal_rows = await db.execute(
        select(Proposal.pdf_path, Proposal.ai_metadata).where(
            Proposal.organization_id == organization_id
        )
    )
    for pdf_path, ai_metadata in proposal_rows:
        if pdf_path:
            storage_paths.add(pdf_path)
        storage_paths.update(extract_pdf_paths(ai_metadata))

    feedback_attachment_rows = await db.execute(
        select(FeedbackAttachment.storage_key).where(
            FeedbackAttachment.organization_id == organization_id
        )
    )
    storage_paths.update(
        {
            storage_key
            for storage_key in feedback_attachment_rows.scalars()
            if isinstance(storage_key, str) and storage_key
        }
    )

    return storage_paths


async def purge_force_organization(
    *,
    db: AsyncSession,
    organization_id: UUID,
    confirm_name: str,
    confirm_phrase: str,
) -> OrganizationPurgeResult:
    await db.execute(text("SET LOCAL lock_timeout = '5s'"))
    await db.execute(text("SET LOCAL statement_timeout = '30s'"))

    organization = await _lock_organization_for_update(db=db, organization_id=organization_id)
    if organization is None:
        raise _lifecycle_error(
            status_code=404,
            code="ORG_NOT_FOUND",
            message="Organization not found",
            details={"org_id": str(organization_id)},
        )

    if organization.archived_at is None or organization.is_active:
        raise _lifecycle_error(
            status_code=409,
            code="ORG_NOT_ARCHIVED",
            message="Organization must be archived before purge",
            details={"org_id": str(organization_id)},
        )

    if confirm_name.strip() != organization.name:
        raise _lifecycle_error(
            status_code=400,
            code="PURGE_CONFIRM_NAME_MISMATCH",
            message="confirm_name does not match organization name",
            details={"org_id": str(organization_id)},
        )

    expected_phrase = f"PURGE {organization.slug}"
    if confirm_phrase != expected_phrase:
        raise _lifecycle_error(
            status_code=400,
            code="PURGE_CONFIRM_PHRASE_MISMATCH",
            message="confirm_phrase does not match required phrase",
            details={"expected": expected_phrase},
        )

    current_timestamp_result = await db.execute(select(func.current_timestamp()))
    current_timestamp = current_timestamp_result.scalar_one()
    if not isinstance(current_timestamp, datetime):
        raise _lifecycle_error(
            status_code=500,
            code="PURGE_DB_CLOCK_UNAVAILABLE",
            message="Database clock unavailable",
        )

    retention_cutoff = current_timestamp - timedelta(days=PURGE_RETENTION_DAYS)
    if organization.archived_at > retention_cutoff:
        raise _lifecycle_error(
            status_code=409,
            code="ORG_RETENTION_NOT_MET",
            message="Organization retention window not met",
            details={
                "archived_at": organization.archived_at.isoformat(),
                "retention_days": PURGE_RETENTION_DAYS,
            },
        )

    storage_paths = await _collect_organization_storage_paths(
        db=db, organization_id=organization_id
    )
    try:
        validate_storage_keys(storage_paths)
    except ValueError as exc:
        raise _lifecycle_error(
            status_code=400,
            code="ORG_STORAGE_KEYS_INVALID",
            message="Invalid storage keys for purge cleanup",
            details={"org_id": str(organization_id)},
        ) from exc

    cleanup_manifest = OrganizationPurgeManifest(
        organization_id=organization.id,
        status="pending",
        storage_keys=sorted(storage_paths),
        attempts=0,
        last_error=None,
    )
    db.add(cleanup_manifest)
    await db.flush()

    deleted_counts: dict[str, int] = {}
    for table_name, model in EXPLICIT_PURGE_TABLES:
        count_result = await db.execute(
            select(func.count()).select_from(model).where(model.organization_id == organization_id)
        )
        deleted_counts[table_name] = int(count_result.scalar_one() or 0)
        await db.execute(delete(model).where(model.organization_id == organization_id))

    org_count_result = await db.execute(
        select(func.count(Organization.id)).where(Organization.id == organization_id)
    )
    deleted_counts["organizations"] = int(org_count_result.scalar_one() or 0)

    await db.execute(delete(Organization).where(Organization.id == organization_id))

    await db.commit()

    return OrganizationPurgeResult(
        deleted_counts=deleted_counts,
        archived_at=organization.archived_at,
        storage_paths=storage_paths,
        cleanup_manifest_id=cleanup_manifest.id,
    )


async def cleanup_purged_organization_storage(
    *,
    db: AsyncSession,
    organization_id: UUID,
    cleanup_manifest_id: UUID,
    storage_paths: set[str],
) -> Literal["completed", "failed"]:
    cleanup_manifest = await db.get(OrganizationPurgeManifest, cleanup_manifest_id)
    if cleanup_manifest is None:
        raise _lifecycle_error(
            status_code=500,
            code="ORG_PURGE_MANIFEST_NOT_FOUND",
            message="Purge cleanup manifest missing",
            details={"manifest_id": str(cleanup_manifest_id)},
        )

    if not storage_paths:
        cleanup_manifest.status = "completed"
        cleanup_manifest.attempts = 1
        cleanup_manifest.last_error = None
        await db.commit()
        return "completed"

    attempts = 3
    for attempt in range(1, attempts + 1):
        try:
            await delete_storage_keys(storage_paths)
            cleanup_manifest.status = "completed"
            cleanup_manifest.attempts = attempt
            cleanup_manifest.last_error = None
            await db.commit()
            return "completed"
        except Exception as exc:
            cleanup_manifest.attempts = attempt
            cleanup_manifest.last_error = str(exc)
            logger.warning(
                "organization_purge_force_storage_cleanup_retry",
                org_id=str(organization_id),
                manifest_id=str(cleanup_manifest_id),
                attempt=attempt,
                max_attempts=attempts,
                error=str(exc),
            )
            if attempt == attempts:
                cleanup_manifest.status = "failed"
                await db.commit()
                return "failed"
            await asyncio.sleep(float(attempt))

    raise RuntimeError("unreachable: cleanup loop must return completed or failed")
