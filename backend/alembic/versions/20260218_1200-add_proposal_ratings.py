"""add proposal ratings table

Revision ID: 20260218_1200
Revises: 20260210_1200
Create Date: 2026-02-18 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision = "20260218_1200"
down_revision = "20260210_1200"
branch_labels = None
depends_on = None


PROPOSALS_UNIQUE_FOR_RATINGS = "uq_proposals_id_org_for_ratings"


def _is_equivalent_id_org_columns(columns: Sequence[str | None]) -> bool:
    normalized = [column for column in columns if isinstance(column, str)]
    return len(normalized) == 2 and set(normalized) == {"id", "organization_id"}


def _has_unique_constraint_on_proposals_id_org(bind: sa.engine.Connection) -> bool:
    inspector = sa.inspect(bind)
    for unique_constraint in inspector.get_unique_constraints("proposals"):
        columns = unique_constraint.get("column_names") or []
        if _is_equivalent_id_org_columns(columns):
            return True

    for index in inspector.get_indexes("proposals"):
        if not index.get("unique"):
            continue
        columns = index.get("column_names") or []
        if _is_equivalent_id_org_columns(columns):
            return True

    return False


def _has_constraint(bind: sa.engine.Connection, table_name: str, constraint_name: str) -> bool:
    rows = bind.execute(
        sa.text(
            """
            SELECT 1
            FROM pg_constraint
            WHERE conname = :constraint_name
              AND conrelid = :table_name::regclass
            LIMIT 1
            """
        ),
        {"constraint_name": constraint_name, "table_name": table_name},
    )
    return rows.first() is not None


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_unique_constraint_on_proposals_id_org(bind):
        op.create_unique_constraint(
            PROPOSALS_UNIQUE_FOR_RATINGS,
            "proposals",
            ["id", "organization_id"],
        )

    op.create_table(
        "proposal_ratings",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("proposal_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("coverage_needs_score", sa.SmallInteger(), nullable=False),
        sa.Column("quality_info_score", sa.SmallInteger(), nullable=False),
        sa.Column("business_data_score", sa.SmallInteger(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.CheckConstraint(
            "coverage_needs_score >= 1 AND coverage_needs_score <= 5",
            name="ck_proposal_ratings_coverage_needs_score",
        ),
        sa.CheckConstraint(
            "quality_info_score >= 1 AND quality_info_score <= 5",
            name="ck_proposal_ratings_quality_info_score",
        ),
        sa.CheckConstraint(
            "business_data_score >= 1 AND business_data_score <= 5",
            name="ck_proposal_ratings_business_data_score",
        ),
        sa.CheckConstraint(
            "comment IS NULL OR char_length(comment) <= 1000",
            name="ck_proposal_ratings_comment_length",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_proposal_ratings_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["proposal_id", "organization_id"],
            ["proposals.id", "proposals.organization_id"],
            name="fk_proposal_ratings_proposal_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_proposal_ratings_user",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "organization_id",
            "proposal_id",
            "user_id",
            name="uq_proposal_ratings_org_proposal_user",
        ),
    )
    op.create_index(
        "ix_proposal_ratings_org_user",
        "proposal_ratings",
        ["organization_id", "user_id"],
        unique=False,
    )
    op.create_index(
        "ix_proposal_ratings_org_updated_at",
        "proposal_ratings",
        ["organization_id", "updated_at"],
        unique=False,
    )


def downgrade() -> None:
    bind = op.get_bind()

    op.drop_index("ix_proposal_ratings_org_updated_at", table_name="proposal_ratings")
    op.drop_index("ix_proposal_ratings_org_user", table_name="proposal_ratings")
    op.drop_table("proposal_ratings")

    if _has_constraint(bind, "proposals", PROPOSALS_UNIQUE_FOR_RATINGS):
        op.drop_constraint(
            PROPOSALS_UNIQUE_FOR_RATINGS,
            "proposals",
            type_="unique",
        )
