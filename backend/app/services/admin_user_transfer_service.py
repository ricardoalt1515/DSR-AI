from dataclasses import dataclass, field
from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.project import Project
from app.models.user import User, UserRole
from app.schemas.admin_user_transfer import (
    TransferUserOrganizationRequest,
    TransferUserOrganizationResponse,
)


@dataclass(slots=True)
class TransferOrganizationError(Exception):
    status_code: int
    code: str
    message: str
    details: dict[str, object] = field(default_factory=dict)


def _transfer_error(
    *,
    status_code: int,
    code: str,
    message: str,
    details: dict[str, object] | None = None,
) -> TransferOrganizationError:
    return TransferOrganizationError(
        status_code=status_code,
        code=code,
        message=message,
        details=details or {},
    )


async def transfer_user_organization(
    *,
    db: AsyncSession,
    user_id: UUID,
    payload: TransferUserOrganizationRequest,
) -> TransferUserOrganizationResponse:
    initial_target_user = await db.get(User, user_id)
    if initial_target_user is None:
        raise _transfer_error(
            status_code=404,
            code="USER_NOT_FOUND",
            message="User not found",
            details={"user_id": str(user_id)},
        )

    if initial_target_user.is_superuser:
        raise _transfer_error(
            status_code=400,
            code="SUPERUSER_TRANSFER_BLOCKED",
            message="Cannot transfer superuser",
            details={"user_id": str(user_id)},
        )

    from_org_id = initial_target_user.organization_id
    if from_org_id is None:
        raise _transfer_error(
            status_code=400,
            code="SOURCE_ORG_REQUIRED",
            message="User must belong to an organization to transfer",
            details={"user_id": str(user_id)},
        )

    target_org_result = await db.execute(
        select(Organization)
        .where(Organization.id == payload.target_organization_id)
        .with_for_update()
    )
    target_org = target_org_result.scalar_one_or_none()
    if target_org is None:
        raise _transfer_error(
            status_code=404,
            code="TARGET_ORG_NOT_FOUND",
            message="Target organization not found",
            details={"target_organization_id": str(payload.target_organization_id)},
        )

    if not target_org.is_active:
        raise _transfer_error(
            status_code=400,
            code="TARGET_ORG_INACTIVE",
            message="Target organization is inactive",
            details={"target_organization_id": str(payload.target_organization_id)},
        )

    if from_org_id == target_org.id:
        raise _transfer_error(
            status_code=400,
            code="SAME_ORGANIZATION",
            message="Target organization must be different from source organization",
            details={"organization_id": str(from_org_id)},
        )

    org_users_result = await db.execute(
        select(User.id, User.role, User.is_active)
        .where(User.organization_id == from_org_id)
        .order_by(User.id)
        .with_for_update()
    )
    active_org_admin_ids = [
        org_user_id
        for org_user_id, role, is_active in org_users_result.all()
        if is_active and role == UserRole.ORG_ADMIN.value
    ]

    target_user_result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .execution_options(populate_existing=True)
        .with_for_update()
    )
    target_user = target_user_result.scalar_one_or_none()
    if target_user is None:
        raise _transfer_error(
            status_code=404,
            code="USER_NOT_FOUND",
            message="User not found",
            details={"user_id": str(user_id)},
        )

    if target_user.is_superuser:
        raise _transfer_error(
            status_code=400,
            code="SUPERUSER_TRANSFER_BLOCKED",
            message="Cannot transfer superuser",
            details={"user_id": str(user_id)},
        )

    if target_user.organization_id != from_org_id:
        raise _transfer_error(
            status_code=409,
            code="TRANSFER_STATE_CONFLICT",
            message="User organization changed during transfer",
            details={"user_id": str(user_id)},
        )

    if (
        target_user.is_active
        and target_user.role == UserRole.ORG_ADMIN.value
        and target_user.id in active_org_admin_ids
        and len(active_org_admin_ids) <= 1
    ):
        raise _transfer_error(
            status_code=400,
            code="LAST_ORG_ADMIN_BLOCKED",
            message="Cannot transfer the last active org admin",
            details={"organization_id": str(from_org_id), "user_id": str(user_id)},
        )

    active_project_result = await db.execute(
        select(Project.id)
        .where(Project.organization_id == from_org_id)
        .where(Project.user_id == user_id)
        .where(Project.archived_at.is_(None))
        .with_for_update()
    )
    active_project_ids = [row[0] for row in active_project_result.all()]
    active_project_count = len(active_project_ids)

    if payload.reassign_to_user_id == target_user.id:
        raise _transfer_error(
            status_code=400,
            code="REASSIGN_INVALID",
            message="reassign_to_user_id cannot be the same as transferred user",
            details={"reassign_to_user_id": str(payload.reassign_to_user_id)},
        )

    if active_project_count > 0:
        if payload.reassign_to_user_id is None:
            raise _transfer_error(
                status_code=400,
                code="REASSIGN_REQUIRED",
                message="User has active projects; provide reassign_to_user_id",
                details={"active_projects_count": active_project_count},
            )

        reassign_user_result = await db.execute(
            select(User).where(User.id == payload.reassign_to_user_id).with_for_update()
        )
        reassign_user = reassign_user_result.scalar_one_or_none()
        if reassign_user is None:
            raise _transfer_error(
                status_code=404,
                code="REASSIGN_USER_NOT_FOUND",
                message="Reassign user not found",
                details={"reassign_to_user_id": str(payload.reassign_to_user_id)},
            )

        is_valid_reassign_user = (
            reassign_user.organization_id == from_org_id
            and reassign_user.is_active
            and reassign_user.role == UserRole.ORG_ADMIN.value
        )
        if not is_valid_reassign_user:
            raise _transfer_error(
                status_code=400,
                code="REASSIGN_INVALID",
                message=(
                    "reassign_to_user_id must be an active org_admin from source organization"
                ),
                details={"reassign_to_user_id": str(payload.reassign_to_user_id)},
            )

        await db.execute(
            update(Project)
            .where(Project.id.in_(active_project_ids))
            .values(user_id=reassign_user.id)
        )

    target_user.organization_id = target_org.id
    transferred_at = datetime.now(UTC)
    await db.flush()

    return TransferUserOrganizationResponse(
        user_id=target_user.id,
        from_organization_id=from_org_id,
        to_organization_id=target_org.id,
        reassigned_projects_count=active_project_count,
        transferred_at=transferred_at,
    )
