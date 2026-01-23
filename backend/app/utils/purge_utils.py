"""Helpers for purge confirmation and AI metadata paths."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.file import ProjectFile
from app.models.proposal import Proposal


def extract_confirm_name(payload: dict[str, str] | None) -> str | None:
    if not payload:
        return None
    confirm_name = payload.get("confirm_name")
    if not isinstance(confirm_name, str):
        return None
    return confirm_name.strip()


def extract_pdf_paths(ai_metadata: object) -> list[str]:
    if not isinstance(ai_metadata, dict):
        return []
    metadata = {str(key): value for key, value in ai_metadata.items()}
    pdf_paths = metadata.get("pdfPaths")
    if not isinstance(pdf_paths, dict):
        return []
    return [path for path in pdf_paths.values() if isinstance(path, str) and path]


async def collect_project_storage_paths(
    db: AsyncSession,
    org_id: UUID,
    project_id: UUID,
) -> set[str]:
    """Collect all S3 storage paths for a project (files + proposal PDFs)."""
    storage_paths: set[str] = set()

    file_rows = await db.execute(
        select(ProjectFile.file_path).where(
            ProjectFile.organization_id == org_id,
            ProjectFile.project_id == project_id,
        )
    )
    storage_paths.update({row.file_path for row in file_rows if row.file_path})

    proposal_rows = await db.execute(
        select(Proposal.pdf_path, Proposal.ai_metadata).where(
            Proposal.organization_id == org_id,
            Proposal.project_id == project_id,
        )
    )
    for pdf_path, ai_metadata in proposal_rows:
        if pdf_path:
            storage_paths.add(pdf_path)
        storage_paths.update(extract_pdf_paths(ai_metadata))

    return storage_paths
