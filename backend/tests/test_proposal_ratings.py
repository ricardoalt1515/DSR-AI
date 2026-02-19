import uuid
from datetime import UTC, datetime, timedelta

import pytest
from conftest import (
    create_company,
    create_location,
    create_org,
    create_project,
    create_user,
)
from httpx import AsyncClient
from sqlalchemy import func, select, update

from app.models.project import Project
from app.models.proposal import Proposal
from app.models.proposal_rating import ProposalRating
from app.models.user import User, UserRole

COMMENT_MISSING = object()


def rating_payload(
    coverage: int,
    quality: int,
    business: int,
    comment: str | None | object = COMMENT_MISSING,
) -> dict[str, object]:
    payload: dict[str, object] = {
        "coverageNeedsScore": coverage,
        "qualityInfoScore": quality,
        "businessDataScore": business,
    }
    if comment is not COMMENT_MISSING:
        payload["comment"] = comment
    return payload


async def create_proposal(
    *,
    db_session,
    organization_id,
    project_id,
    title: str,
    status: str = "Current",
) -> Proposal:
    proposal = Proposal(
        organization_id=organization_id,
        project_id=project_id,
        version="v1.0",
        title=title,
        proposal_type="Technical",
        status=status,
        author="H2O Allegiant AI",
        capex=1000.0,
        opex=100.0,
        executive_summary="Summary",
        technical_approach="Approach",
        ai_metadata={"proposal": {"headline": "ok"}},
    )
    db_session.add(proposal)
    await db_session.commit()
    await db_session.refresh(proposal)
    return proposal


async def create_user_project_and_proposal(
    *,
    db_session,
    email_prefix: str,
    role: str,
    org_name: str,
    org_slug: str,
    proposal_title: str,
    project_name: str,
) -> tuple[User, Proposal, Project]:
    org = await create_org(db_session, org_name, org_slug)
    user = await create_user(
        db_session,
        email=f"{email_prefix}-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=role,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name=f"{org_name} Company")
    location = await create_location(
        db_session,
        org_id=org.id,
        company_id=company.id,
        name=f"{org_name} Plant",
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name=project_name,
    )
    proposal = await create_proposal(
        db_session=db_session,
        organization_id=org.id,
        project_id=project.id,
        title=proposal_title,
    )
    return user, proposal, project


@pytest.mark.asyncio
async def test_user_can_create_rating(client: AsyncClient, db_session, set_current_user):
    user, proposal, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-user-create",
        role=UserRole.FIELD_AGENT.value,
        org_name="Org Ratings Create",
        org_slug="org-ratings-create",
        proposal_title="Proposal A",
        project_name="Project A",
    )
    set_current_user(user)

    response = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(4, 5, 3, "Buen resumen, faltan fuentes."),
    )

    assert response.status_code == 200
    data = response.json()
    assert data["rating"]["coverageNeedsScore"] == 4
    assert data["rating"]["qualityInfoScore"] == 5
    assert data["rating"]["businessDataScore"] == 3
    assert data["rating"]["comment"] == "Buen resumen, faltan fuentes."
    assert data["rating"]["updatedAt"] is not None

    stored = await db_session.scalar(
        select(ProposalRating).where(
            ProposalRating.organization_id == user.organization_id,
            ProposalRating.proposal_id == proposal.id,
            ProposalRating.user_id == user.id,
        )
    )
    assert stored is not None
    assert stored.coverage_needs_score == 4


@pytest.mark.asyncio
async def test_same_user_updates_rating_upsert_no_duplicate(
    client: AsyncClient, db_session, set_current_user
):
    user, proposal, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-user-upsert",
        role=UserRole.FIELD_AGENT.value,
        org_name="Org Ratings Upsert",
        org_slug="org-ratings-upsert",
        proposal_title="Proposal Upsert",
        project_name="Project Upsert",
    )
    set_current_user(user)

    first = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(2, 2, 2, "Initial"),
    )
    assert first.status_code == 200

    second = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(5, 4, 3, "Updated"),
    )
    assert second.status_code == 200
    second_data = second.json()["rating"]
    assert second_data["coverageNeedsScore"] == 5
    assert second_data["comment"] == "Updated"

    count = await db_session.scalar(
        select(func.count(ProposalRating.id)).where(
            ProposalRating.organization_id == user.organization_id,
            ProposalRating.proposal_id == proposal.id,
            ProposalRating.user_id == user.id,
        )
    )
    assert int(count or 0) == 1


@pytest.mark.asyncio
async def test_cross_org_rating_blocked_returns_404(
    client: AsyncClient, db_session, set_current_user
):
    user_a, _, _ = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-cross-a",
        role=UserRole.FIELD_AGENT.value,
        org_name="Org Ratings A",
        org_slug="org-ratings-a",
        proposal_title="Proposal A",
        project_name="Project A",
    )
    _, proposal_b, project_b = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-cross-b",
        role=UserRole.FIELD_AGENT.value,
        org_name="Org Ratings B",
        org_slug="org-ratings-b",
        proposal_title="Proposal B",
        project_name="Project B",
    )

    set_current_user(user_a)

    response = await client.put(
        f"/api/v1/ai/proposals/{project_b.id}/proposals/{proposal_b.id}/rating",
        json=rating_payload(4, 4, 4),
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_regular_user_cannot_access_admin_endpoints(
    client: AsyncClient, db_session, set_current_user
):
    user, proposal, _ = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-non-admin",
        role=UserRole.FIELD_AGENT.value,
        org_name="Org Ratings Non Admin",
        org_slug="org-ratings-non-admin",
        proposal_title="Proposal Non Admin",
        project_name="Project Non Admin",
    )
    set_current_user(user)

    list_response = await client.get("/api/v1/admin/proposal-ratings")
    assert list_response.status_code == 403

    detail_response = await client.get(f"/api/v1/admin/proposal-ratings/{proposal.id}")
    assert detail_response.status_code == 403


@pytest.mark.asyncio
async def test_stats_hidden_when_rating_count_less_than_three(
    client: AsyncClient, db_session, set_current_user
):
    owner, proposal, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-hidden-owner",
        role=UserRole.ORG_ADMIN.value,
        org_name="Org Ratings Hidden",
        org_slug="org-ratings-hidden",
        proposal_title="Proposal Hidden",
        project_name="Project Hidden",
    )
    reviewer_2 = await create_user(
        db_session,
        email=f"ratings-hidden-r2-{uuid.uuid4().hex[:8]}@example.com",
        org_id=owner.organization_id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    set_current_user(owner)
    response_1 = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(4, 4, 4),
    )
    assert response_1.status_code == 200

    set_current_user(reviewer_2)
    response_2 = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(3, 3, 3),
    )
    assert response_2.status_code == 200

    stats_response = await client.get(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating/stats"
    )
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["visible"] is False
    assert stats["ratingCount"] == 2
    assert stats["minimumRequiredCount"] == 3
    assert stats["overallAvg"] is None
    assert stats["criteriaAvg"] is None


@pytest.mark.asyncio
async def test_aggregate_math_correct_for_three_or_more_ratings(
    client: AsyncClient, db_session, set_current_user
):
    owner, proposal, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-aggregate-owner",
        role=UserRole.ORG_ADMIN.value,
        org_name="Org Ratings Aggregate",
        org_slug="org-ratings-aggregate",
        proposal_title="Proposal Aggregate",
        project_name="Project Aggregate",
    )
    reviewer_2 = await create_user(
        db_session,
        email=f"ratings-aggregate-r2-{uuid.uuid4().hex[:8]}@example.com",
        org_id=owner.organization_id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    reviewer_3 = await create_user(
        db_session,
        email=f"ratings-aggregate-r3-{uuid.uuid4().hex[:8]}@example.com",
        org_id=owner.organization_id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    for user, scores in [
        (owner, (5, 4, 3)),
        (reviewer_2, (4, 3, 2)),
        (reviewer_3, (3, 2, 1)),
    ]:
        set_current_user(user)
        response = await client.put(
            f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
            json=rating_payload(scores[0], scores[1], scores[2]),
        )
        assert response.status_code == 200

    stats_response = await client.get(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating/stats"
    )
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["visible"] is True
    assert stats["ratingCount"] == 3
    assert stats["criteriaAvg"] == {
        "coverageNeedsAvg": 4.0,
        "qualityInfoAvg": 3.0,
        "businessDataAvg": 2.0,
    }
    assert stats["overallAvg"] == 3.0


@pytest.mark.asyncio
async def test_get_rating_returns_null_when_user_never_rated(
    client: AsyncClient, db_session, set_current_user
):
    user, proposal, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-never-rated",
        role=UserRole.FIELD_AGENT.value,
        org_name="Org Ratings Never",
        org_slug="org-ratings-never",
        proposal_title="Proposal Never",
        project_name="Project Never",
    )
    set_current_user(user)

    response = await client.get(f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating")
    assert response.status_code == 200
    assert response.json()["rating"] is None


@pytest.mark.asyncio
async def test_comment_semantics_omit_keep_null_and_empty_clear_whitespace_reject(
    client: AsyncClient, db_session, set_current_user
):
    user, proposal, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-comment-semantics",
        role=UserRole.FIELD_AGENT.value,
        org_name="Org Ratings Comments",
        org_slug="org-ratings-comments",
        proposal_title="Proposal Comments",
        project_name="Project Comments",
    )
    set_current_user(user)

    create_response = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(3, 3, 3, "Original comment"),
    )
    assert create_response.status_code == 200
    assert create_response.json()["rating"]["comment"] == "Original comment"

    omit_response = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(4, 4, 4),
    )
    assert omit_response.status_code == 200
    assert omit_response.json()["rating"]["comment"] == "Original comment"

    null_response = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(4, 4, 4, None),
    )
    assert null_response.status_code == 200
    assert null_response.json()["rating"]["comment"] is None

    empty_response = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(4, 4, 4, ""),
    )
    assert empty_response.status_code == 200
    assert empty_response.json()["rating"]["comment"] is None

    whitespace_response = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(4, 4, 4, "   "),
    )
    assert whitespace_response.status_code == 422


@pytest.mark.asyncio
async def test_admin_filters_and_sorts_minimal(client: AsyncClient, db_session, set_current_user):
    owner, proposal_high, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-admin-filter-owner",
        role=UserRole.ORG_ADMIN.value,
        org_name="Org Ratings Admin Filter",
        org_slug="org-ratings-admin-filter",
        proposal_title="Proposal High",
        project_name="Project Filter",
    )
    proposal_low = await create_proposal(
        db_session=db_session,
        organization_id=owner.organization_id,
        project_id=project.id,
        title="Proposal Low",
    )
    reviewer_2 = await create_user(
        db_session,
        email=f"ratings-admin-filter-r2-{uuid.uuid4().hex[:8]}@example.com",
        org_id=owner.organization_id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    set_current_user(owner)
    response_1 = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal_high.id}/rating",
        json=rating_payload(5, 5, 5, "Excelente"),
    )
    assert response_1.status_code == 200

    set_current_user(reviewer_2)
    response_2 = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal_high.id}/rating",
        json=rating_payload(4, 4, 4),
    )
    assert response_2.status_code == 200

    response_3 = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal_low.id}/rating",
        json=rating_payload(1, 1, 1),
    )
    assert response_3.status_code == 200

    superadmin = await create_user(
        db_session,
        email=f"ratings-admin-filter-super-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superadmin)

    response = await client.get(
        "/api/v1/admin/proposal-ratings",
        params={"minOverall": 4, "hasComments": "true", "sort": "highest"},
        headers={"X-Organization-Id": str(owner.organization_id)},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["proposalId"] == str(proposal_high.id)
    assert data["items"][0]["projectId"] == str(project.id)
    assert data["items"][0]["commentCount"] == 1


@pytest.mark.asyncio
async def test_admin_sort_tie_breaker_stable_across_pagination(
    client: AsyncClient, db_session, set_current_user
):
    owner, proposal_a, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-admin-tie-owner",
        role=UserRole.ORG_ADMIN.value,
        org_name="Org Ratings Admin Tie",
        org_slug="org-ratings-admin-tie",
        proposal_title="Proposal A",
        project_name="Project Tie",
    )
    proposal_b = await create_proposal(
        db_session=db_session,
        organization_id=owner.organization_id,
        project_id=project.id,
        title="Proposal B",
    )

    set_current_user(owner)
    response_a = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal_a.id}/rating",
        json=rating_payload(4, 4, 4),
    )
    assert response_a.status_code == 200

    response_b = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal_b.id}/rating",
        json=rating_payload(4, 4, 4),
    )
    assert response_b.status_code == 200

    fixed_time = datetime(2026, 2, 18, 12, 0, tzinfo=UTC)
    await db_session.execute(
        update(ProposalRating)
        .where(ProposalRating.proposal_id.in_([proposal_a.id, proposal_b.id]))
        .values(updated_at=fixed_time)
    )
    await db_session.commit()

    superadmin = await create_user(
        db_session,
        email=f"ratings-admin-tie-super-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superadmin)

    first_page = await client.get(
        "/api/v1/admin/proposal-ratings",
        params={"sort": "highest", "limit": 1, "offset": 0},
        headers={"X-Organization-Id": str(owner.organization_id)},
    )
    assert first_page.status_code == 200

    second_page = await client.get(
        "/api/v1/admin/proposal-ratings",
        params={"sort": "highest", "limit": 1, "offset": 1},
        headers={"X-Organization-Id": str(owner.organization_id)},
    )
    assert second_page.status_code == 200

    first_id = first_page.json()["items"][0]["proposalId"]
    second_id = second_page.json()["items"][0]["proposalId"]
    assert first_id < second_id


@pytest.mark.asyncio
@pytest.mark.parametrize("archive_target", ["project", "proposal"])
async def test_upsert_rating_rejects_archived_project_or_proposal(
    archive_target: str,
    client: AsyncClient,
    db_session,
    set_current_user,
):
    user, proposal, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-archived",
        role=UserRole.FIELD_AGENT.value,
        org_name="Org Ratings Archived",
        org_slug="org-ratings-archived",
        proposal_title="Proposal Archived",
        project_name="Project Archived",
    )
    set_current_user(user)

    if archive_target == "project":
        await db_session.execute(
            update(Project).where(Project.id == project.id).values(archived_at=datetime.now(UTC))
        )
    else:
        await db_session.execute(
            update(Proposal).where(Proposal.id == proposal.id).values(status="Archived")
        )
    await db_session.commit()

    response = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(4, 4, 4),
    )

    assert response.status_code == 409
    assert response.json()["error"]["message"] == "Project or proposal is archived"


@pytest.mark.asyncio
async def test_superadmin_forbidden_from_user_rating_endpoints(
    client: AsyncClient, db_session, set_current_user
):
    _, proposal, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-superuser-forbidden",
        role=UserRole.FIELD_AGENT.value,
        org_name="Org Ratings Superuser Forbidden",
        org_slug="org-ratings-superuser-forbidden",
        proposal_title="Proposal Superuser Forbidden",
        project_name="Project Superuser Forbidden",
    )

    superadmin = await create_user(
        db_session,
        email=f"ratings-superuser-forbidden-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superadmin)

    put_response = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(4, 4, 4),
    )
    assert put_response.status_code == 403
    assert (
        put_response.json()["error"]["message"] == "Superadmin cannot access user rating endpoints"
    )

    get_response = await client.get(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating"
    )
    assert get_response.status_code == 403
    assert (
        get_response.json()["error"]["message"] == "Superadmin cannot access user rating endpoints"
    )

    stats_response = await client.get(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating/stats"
    )
    assert stats_response.status_code == 403
    assert (
        stats_response.json()["error"]["message"]
        == "Superadmin cannot access user rating endpoints"
    )


@pytest.mark.asyncio
async def test_admin_endpoints_require_org_header_for_superadmin(
    client: AsyncClient, db_session, set_current_user
):
    _, proposal, _ = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-superadmin-header",
        role=UserRole.FIELD_AGENT.value,
        org_name="Org Ratings Header",
        org_slug="org-ratings-header",
        proposal_title="Proposal Header",
        project_name="Project Header",
    )
    superadmin = await create_user(
        db_session,
        email=f"ratings-superadmin-header-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superadmin)

    list_response = await client.get("/api/v1/admin/proposal-ratings")
    assert list_response.status_code == 400
    assert (
        list_response.json()["error"]["message"]
        == "Super admin must select organization via X-Organization-Id header"
    )

    detail_response = await client.get(f"/api/v1/admin/proposal-ratings/{proposal.id}")
    assert detail_response.status_code == 400
    assert (
        detail_response.json()["error"]["message"]
        == "Super admin must select organization via X-Organization-Id header"
    )


@pytest.mark.asyncio
async def test_admin_detail_payload_includes_distribution_and_comments(
    client: AsyncClient, db_session, set_current_user
):
    owner, proposal, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-admin-detail-owner",
        role=UserRole.ORG_ADMIN.value,
        org_name="Org Ratings Admin Detail",
        org_slug="org-ratings-admin-detail",
        proposal_title="Proposal Admin Detail",
        project_name="Project Admin Detail",
    )
    reviewer_2 = await create_user(
        db_session,
        email=f"ratings-admin-detail-r2-{uuid.uuid4().hex[:8]}@example.com",
        org_id=owner.organization_id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )

    set_current_user(owner)
    owner_response = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(5, 4, 3, "Detailed comment"),
    )
    assert owner_response.status_code == 200

    set_current_user(reviewer_2)
    reviewer_response = await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(1, 2, 3),
    )
    assert reviewer_response.status_code == 200

    superadmin = await create_user(
        db_session,
        email=f"ratings-admin-detail-super-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superadmin)

    detail_response = await client.get(
        f"/api/v1/admin/proposal-ratings/{proposal.id}",
        headers={"X-Organization-Id": str(owner.organization_id)},
    )
    assert detail_response.status_code == 200

    payload = detail_response.json()
    assert payload["proposalId"] == str(proposal.id)
    assert payload["projectId"] == str(project.id)
    assert payload["ratingCount"] == 2
    assert payload["overallAvg"] == 3.0
    assert payload["criteriaAvg"] == {
        "coverageNeedsAvg": 3.0,
        "qualityInfoAvg": 3.0,
        "businessDataAvg": 3.0,
    }
    assert payload["distributions"]["coverageNeedsScore"] == {
        "1": 1,
        "2": 0,
        "3": 0,
        "4": 0,
        "5": 1,
    }
    assert payload["distributions"]["qualityInfoScore"] == {
        "1": 0,
        "2": 1,
        "3": 0,
        "4": 1,
        "5": 0,
    }
    assert payload["distributions"]["businessDataScore"] == {
        "1": 0,
        "2": 0,
        "3": 2,
        "4": 0,
        "5": 0,
    }
    assert len(payload["comments"]) == 1
    assert payload["comments"][0]["comment"] == "Detailed comment"
    assert payload["comments"][0]["updatedAt"] is not None


@pytest.mark.asyncio
async def test_admin_filter_has_comments_false_returns_only_no_comment_proposals(
    client: AsyncClient, db_session, set_current_user
):
    """hasComments=false must exclude proposals where any rating has a comment."""
    owner, proposal_with_comment, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-hcfalse-owner",
        role=UserRole.ORG_ADMIN.value,
        org_name="Org Ratings HCFalse",
        org_slug="org-ratings-hcfalse",
        proposal_title="Proposal With Comment",
        project_name="Project HCFalse",
    )
    proposal_without_comment = await create_proposal(
        db_session=db_session,
        organization_id=owner.organization_id,
        project_id=project.id,
        title="Proposal Without Comment",
    )

    set_current_user(owner)
    await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal_with_comment.id}/rating",
        json=rating_payload(3, 3, 3, "I have a comment"),
    )
    await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal_without_comment.id}/rating",
        json=rating_payload(4, 4, 4),
    )

    superadmin = await create_user(
        db_session,
        email=f"ratings-hcfalse-super-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superadmin)

    response = await client.get(
        "/api/v1/admin/proposal-ratings",
        params={"hasComments": "false"},
        headers={"X-Organization-Id": str(owner.organization_id)},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    ids = [item["proposalId"] for item in data["items"]]
    assert str(proposal_without_comment.id) in ids
    assert str(proposal_with_comment.id) not in ids


@pytest.mark.asyncio
async def test_admin_filter_rated_from_is_inclusive(
    client: AsyncClient, db_session, set_current_user
):
    """ratedFrom boundary is inclusive: ratings AT ratedFrom must be included."""
    owner, proposal, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-rfrom-owner",
        role=UserRole.ORG_ADMIN.value,
        org_name="Org Ratings RFrom",
        org_slug="org-ratings-rfrom",
        proposal_title="Proposal RFrom",
        project_name="Project RFrom",
    )

    set_current_user(owner)
    await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(3, 3, 3),
    )

    boundary = datetime(2026, 1, 1, 0, 0, tzinfo=UTC)
    await db_session.execute(
        update(ProposalRating)
        .where(ProposalRating.proposal_id == proposal.id)
        .values(updated_at=boundary)
    )
    await db_session.commit()

    superadmin = await create_user(
        db_session,
        email=f"ratings-rfrom-super-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superadmin)

    # Exactly at boundary → included
    inclusive = await client.get(
        "/api/v1/admin/proposal-ratings",
        params={"ratedFrom": boundary.isoformat()},
        headers={"X-Organization-Id": str(owner.organization_id)},
    )
    assert inclusive.status_code == 200
    assert inclusive.json()["total"] == 1

    # One second after boundary → excluded
    after = await client.get(
        "/api/v1/admin/proposal-ratings",
        params={"ratedFrom": (boundary + timedelta(seconds=1)).isoformat()},
        headers={"X-Organization-Id": str(owner.organization_id)},
    )
    assert after.status_code == 200
    assert after.json()["total"] == 0


@pytest.mark.asyncio
async def test_admin_filter_rated_to_is_inclusive(
    client: AsyncClient, db_session, set_current_user
):
    """ratedTo boundary is inclusive: ratings AT ratedTo must be included."""
    owner, proposal, project = await create_user_project_and_proposal(
        db_session=db_session,
        email_prefix="ratings-rto-owner",
        role=UserRole.ORG_ADMIN.value,
        org_name="Org Ratings RTo",
        org_slug="org-ratings-rto",
        proposal_title="Proposal RTo",
        project_name="Project RTo",
    )

    set_current_user(owner)
    await client.put(
        f"/api/v1/ai/proposals/{project.id}/proposals/{proposal.id}/rating",
        json=rating_payload(3, 3, 3),
    )

    boundary = datetime(2026, 1, 1, 0, 0, tzinfo=UTC)
    await db_session.execute(
        update(ProposalRating)
        .where(ProposalRating.proposal_id == proposal.id)
        .values(updated_at=boundary)
    )
    await db_session.commit()

    superadmin = await create_user(
        db_session,
        email=f"ratings-rto-super-{uuid.uuid4().hex[:8]}@example.com",
        org_id=None,
        role=UserRole.ADMIN.value,
        is_superuser=True,
    )
    set_current_user(superadmin)

    # Exactly at boundary → included
    inclusive = await client.get(
        "/api/v1/admin/proposal-ratings",
        params={"ratedTo": boundary.isoformat()},
        headers={"X-Organization-Id": str(owner.organization_id)},
    )
    assert inclusive.status_code == 200
    assert inclusive.json()["total"] == 1

    # One second before boundary → excluded
    before = await client.get(
        "/api/v1/admin/proposal-ratings",
        params={"ratedTo": (boundary - timedelta(seconds=1)).isoformat()},
        headers={"X-Organization-Id": str(owner.organization_id)},
    )
    assert before.status_code == 200
    assert before.json()["total"] == 0
