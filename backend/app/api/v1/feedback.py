"""Feedback endpoints."""

from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from urllib.parse import urlparse
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.api.dependencies import (
    AsyncDB,
    CurrentUser,
    CurrentUserOrganization,
    OrganizationContext,
    RateLimitUser30,
    RateLimitUser60,
    SuperAdminOnly,
)
from app.models.feedback import Feedback
from app.schemas.feedback import FeedbackCreate, FeedbackRead, FeedbackType, FeedbackUpdate

router = APIRouter()
admin_router = APIRouter()

FeedbackTypeFilter = Annotated[
    FeedbackType | None,
    Query(
        description="Filter by feedback type",
        examples=["bug", "incorrect_response", "feature_request", "general"],
    ),
]


def _sanitize_page_path(page_path: str | None) -> str | None:
    if page_path is None:
        return None
    parsed = urlparse(page_path)
    if parsed.scheme and parsed.scheme not in ("http", "https"):
        return None
    path = parsed.path
    if not path:
        return None
    if not path.startswith("/"):
        path = f"/{path}"
    if len(path) > 512:
        return None
    return path


@router.post("", response_model=FeedbackRead, status_code=status.HTTP_201_CREATED)
async def create_feedback(
    payload: FeedbackCreate,
    current_user: CurrentUser,
    org: CurrentUserOrganization,
    db: AsyncDB,
    _rate_limit: RateLimitUser30,
):
    feedback = Feedback(
        organization_id=org.id,
        user_id=current_user.id,
        content=payload.content,
        feedback_type=payload.feedback_type,
        page_path=_sanitize_page_path(payload.page_path),
    )
    db.add(feedback)
    await db.commit()
    await db.refresh(feedback)
    return feedback


@admin_router.get("", response_model=list[FeedbackRead])
async def list_feedback(
    current_admin: SuperAdminOnly,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser60,
    days: Annotated[
        Literal[7, 30] | None,
        Query(description="Filter by recency", examples=[7, 30]),
    ] = None,
    resolved: Annotated[bool | None, Query(description="Filter by resolved status")] = None,
    feedback_type: FeedbackTypeFilter = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
):
    query = select(Feedback).where(Feedback.organization_id == org.id)

    if days:
        cutoff = datetime.now(UTC) - timedelta(days=days)
        query = query.where(Feedback.created_at >= cutoff)

    if resolved is not None:
        query = query.where(
            Feedback.resolved_at.isnot(None) if resolved else Feedback.resolved_at.is_(None)
        )

    if feedback_type:
        query = query.where(Feedback.feedback_type == feedback_type)

    query = query.order_by(Feedback.created_at.desc()).limit(limit)
    result = await db.execute(query)
    feedback_items = result.scalars().all()
    return feedback_items


@admin_router.patch("/{feedback_id}", response_model=FeedbackRead)
async def update_feedback(
    feedback_id: UUID,
    payload: FeedbackUpdate,
    current_admin: SuperAdminOnly,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser30,
):
    result = await db.execute(
        select(Feedback)
        .where(Feedback.id == feedback_id, Feedback.organization_id == org.id)
        .with_for_update()
    )
    feedback = result.scalar_one_or_none()
    if not feedback:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Feedback not found")

    if payload.resolved:
        feedback.resolved_at = datetime.now(UTC)
        feedback.resolved_by_user_id = current_admin.id
    else:
        feedback.resolved_at = None
        feedback.resolved_by_user_id = None

    await db.commit()
    await db.refresh(feedback)
    return feedback
