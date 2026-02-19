"""Superadmin endpoints for proposal ratings."""

from datetime import datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select

from app.api.dependencies import AsyncDB, OrganizationContext, RateLimitUser60, SuperAdminOnly
from app.models.proposal import Proposal
from app.models.proposal_rating import ProposalRating
from app.schemas.common import ErrorResponse
from app.schemas.proposal_rating import (
    AdminProposalRatingComment,
    AdminProposalRatingDetailResponse,
    AdminProposalRatingListItem,
    AdminProposalRatingListResponse,
    ProposalRatingCriteriaAvg,
    ProposalRatingDistribution,
    ProposalRatingDistributions,
    ProposalRatingsAdminHasComments,
    ProposalRatingsAdminSort,
)

router = APIRouter()


def _round_two_decimals(value: float) -> float:
    return round(value, 2)


@router.get("", response_model=AdminProposalRatingListResponse)
async def list_admin_proposal_ratings(
    _current_admin: SuperAdminOnly,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser60,
    min_overall: Annotated[float | None, Query(alias="minOverall", ge=1, le=5)] = None,
    has_comments: Annotated[ProposalRatingsAdminHasComments, Query(alias="hasComments")] = "any",
    rated_from: Annotated[datetime | None, Query(alias="ratedFrom")] = None,
    rated_to: Annotated[datetime | None, Query(alias="ratedTo")] = None,
    sort: ProposalRatingsAdminSort = "recentlyRated",
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    aggregated = (
        select(
            ProposalRating.proposal_id.label("proposal_id"),
            func.count(ProposalRating.id).label("rating_count"),
            func.avg(ProposalRating.coverage_needs_score).label("coverage_needs_avg"),
            func.avg(ProposalRating.quality_info_score).label("quality_info_avg"),
            func.avg(ProposalRating.business_data_score).label("business_data_avg"),
            func.max(ProposalRating.updated_at).label("latest_rating_at"),
            func.count(ProposalRating.comment).label("comment_count"),
        )
        .where(ProposalRating.organization_id == org.id)
        .group_by(ProposalRating.proposal_id)
        .subquery()
    )

    overall_avg_expr = (
        (
            aggregated.c.coverage_needs_avg
            + aggregated.c.quality_info_avg
            + aggregated.c.business_data_avg
        )
        / 3.0
    ).label("overall_avg")

    filtered = select(
        aggregated.c.proposal_id,
        Proposal.project_id.label("project_id"),
        aggregated.c.rating_count,
        aggregated.c.coverage_needs_avg,
        aggregated.c.quality_info_avg,
        aggregated.c.business_data_avg,
        aggregated.c.latest_rating_at,
        aggregated.c.comment_count,
        overall_avg_expr,
    ).join(
        Proposal,
        (Proposal.id == aggregated.c.proposal_id) & (Proposal.organization_id == org.id),
    )

    if min_overall is not None:
        filtered = filtered.where(overall_avg_expr >= min_overall)

    if has_comments == "true":
        filtered = filtered.where(aggregated.c.comment_count > 0)
    elif has_comments == "false":
        filtered = filtered.where(aggregated.c.comment_count == 0)

    if rated_from is not None:
        filtered = filtered.where(aggregated.c.latest_rating_at >= rated_from)
    if rated_to is not None:
        filtered = filtered.where(aggregated.c.latest_rating_at <= rated_to)

    if sort == "highest":
        filtered = filtered.order_by(
            overall_avg_expr.desc(),
            aggregated.c.rating_count.desc(),
            aggregated.c.latest_rating_at.desc(),
            aggregated.c.proposal_id.asc(),
        )
    elif sort == "lowest":
        filtered = filtered.order_by(
            overall_avg_expr.asc(),
            aggregated.c.rating_count.desc(),
            aggregated.c.latest_rating_at.desc(),
            aggregated.c.proposal_id.asc(),
        )
    elif sort == "mostRated":
        filtered = filtered.order_by(
            aggregated.c.rating_count.desc(),
            overall_avg_expr.desc(),
            aggregated.c.latest_rating_at.desc(),
            aggregated.c.proposal_id.asc(),
        )
    else:
        filtered = filtered.order_by(
            aggregated.c.latest_rating_at.desc(),
            aggregated.c.rating_count.desc(),
            overall_avg_expr.desc(),
            aggregated.c.proposal_id.asc(),
        )

    total_result = await db.execute(
        select(func.count()).select_from(filtered.order_by(None).subquery())
    )
    total = int(total_result.scalar_one())

    rows_result = await db.execute(filtered.limit(limit).offset(offset))
    rows = rows_result.all()

    items = [
        AdminProposalRatingListItem(
            proposal_id=row.proposal_id,
            project_id=row.project_id,
            rating_count=int(row.rating_count),
            overall_avg=_round_two_decimals(float(row.overall_avg)),
            criteria_avg=ProposalRatingCriteriaAvg(
                coverage_needs_avg=_round_two_decimals(float(row.coverage_needs_avg)),
                quality_info_avg=_round_two_decimals(float(row.quality_info_avg)),
                business_data_avg=_round_two_decimals(float(row.business_data_avg)),
            ),
            latest_rating_at=row.latest_rating_at,
            comment_count=int(row.comment_count),
        )
        for row in rows
    ]

    return AdminProposalRatingListResponse(
        items=items,
        limit=limit,
        offset=offset,
        total=total,
    )


@router.get(
    "/{proposal_id}",
    response_model=AdminProposalRatingDetailResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_admin_proposal_rating_detail(
    proposal_id: UUID,
    _current_admin: SuperAdminOnly,
    org: OrganizationContext,
    db: AsyncDB,
    _rate_limit: RateLimitUser60,
):
    base_where = (
        ProposalRating.organization_id == org.id,
        ProposalRating.proposal_id == proposal_id,
    )

    # Aggregate query: scalars only — avoids loading full ORM objects into memory.
    # Two queries (aggregate + comments) are cheaper than one query returning N full rows.
    agg_result = await db.execute(
        select(
            Proposal.project_id,
            func.count(ProposalRating.id).label("rating_count"),
            func.avg(ProposalRating.coverage_needs_score).label("coverage_avg"),
            func.avg(ProposalRating.quality_info_score).label("quality_avg"),
            func.avg(ProposalRating.business_data_score).label("business_avg"),
            func.count(ProposalRating.coverage_needs_score)
            .filter(ProposalRating.coverage_needs_score == 1)
            .label("cov_1"),
            func.count(ProposalRating.coverage_needs_score)
            .filter(ProposalRating.coverage_needs_score == 2)
            .label("cov_2"),
            func.count(ProposalRating.coverage_needs_score)
            .filter(ProposalRating.coverage_needs_score == 3)
            .label("cov_3"),
            func.count(ProposalRating.coverage_needs_score)
            .filter(ProposalRating.coverage_needs_score == 4)
            .label("cov_4"),
            func.count(ProposalRating.coverage_needs_score)
            .filter(ProposalRating.coverage_needs_score == 5)
            .label("cov_5"),
            func.count(ProposalRating.quality_info_score)
            .filter(ProposalRating.quality_info_score == 1)
            .label("qual_1"),
            func.count(ProposalRating.quality_info_score)
            .filter(ProposalRating.quality_info_score == 2)
            .label("qual_2"),
            func.count(ProposalRating.quality_info_score)
            .filter(ProposalRating.quality_info_score == 3)
            .label("qual_3"),
            func.count(ProposalRating.quality_info_score)
            .filter(ProposalRating.quality_info_score == 4)
            .label("qual_4"),
            func.count(ProposalRating.quality_info_score)
            .filter(ProposalRating.quality_info_score == 5)
            .label("qual_5"),
            func.count(ProposalRating.business_data_score)
            .filter(ProposalRating.business_data_score == 1)
            .label("biz_1"),
            func.count(ProposalRating.business_data_score)
            .filter(ProposalRating.business_data_score == 2)
            .label("biz_2"),
            func.count(ProposalRating.business_data_score)
            .filter(ProposalRating.business_data_score == 3)
            .label("biz_3"),
            func.count(ProposalRating.business_data_score)
            .filter(ProposalRating.business_data_score == 4)
            .label("biz_4"),
            func.count(ProposalRating.business_data_score)
            .filter(ProposalRating.business_data_score == 5)
            .label("biz_5"),
        )
        .join(
            Proposal,
            (Proposal.id == ProposalRating.proposal_id)
            & (Proposal.organization_id == ProposalRating.organization_id),
        )
        .where(*base_where)
        .group_by(Proposal.project_id)
    )
    agg = agg_result.one_or_none()

    if agg is None or agg.rating_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Proposal ratings not found",
        )

    coverage_avg_raw = float(agg.coverage_avg)
    quality_avg_raw = float(agg.quality_avg)
    business_avg_raw = float(agg.business_avg)

    # Comments query: only rows with a comment, fetching only the two needed columns.
    comments_result = await db.execute(
        select(ProposalRating.comment, ProposalRating.updated_at)
        .where(*base_where, ProposalRating.comment.is_not(None))
        .order_by(ProposalRating.updated_at.desc(), ProposalRating.id.asc())
    )
    comments = [
        AdminProposalRatingComment(comment=row.comment, updated_at=row.updated_at)
        for row in comments_result.all()
        if row.comment is not None  # narrow type for type-checker
    ]

    return AdminProposalRatingDetailResponse(
        proposal_id=proposal_id,
        project_id=agg.project_id,
        rating_count=int(agg.rating_count),
        overall_avg=_round_two_decimals(
            (coverage_avg_raw + quality_avg_raw + business_avg_raw) / 3
        ),
        criteria_avg=ProposalRatingCriteriaAvg(
            coverage_needs_avg=_round_two_decimals(coverage_avg_raw),
            quality_info_avg=_round_two_decimals(quality_avg_raw),
            business_data_avg=_round_two_decimals(business_avg_raw),
        ),
        distributions=ProposalRatingDistributions(
            coverage_needs_score=ProposalRatingDistribution.model_validate(
                {"1": agg.cov_1, "2": agg.cov_2, "3": agg.cov_3, "4": agg.cov_4, "5": agg.cov_5}
            ),
            quality_info_score=ProposalRatingDistribution.model_validate(
                {
                    "1": agg.qual_1,
                    "2": agg.qual_2,
                    "3": agg.qual_3,
                    "4": agg.qual_4,
                    "5": agg.qual_5,
                }
            ),
            business_data_score=ProposalRatingDistribution.model_validate(
                {"1": agg.biz_1, "2": agg.biz_2, "3": agg.biz_3, "4": agg.biz_4, "5": agg.biz_5}
            ),
        ),
        comments=comments,
    )
