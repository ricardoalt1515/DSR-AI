"""add organization lifecycle archive metadata and invariant

Revision ID: 20260206_1200
Revises: 20260205_1200
Create Date: 2026-02-06 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op


# revision identifiers, used by Alembic.
revision = "20260206_1200"
down_revision = "20260205_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "organizations",
        sa.Column("archived_by_user_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_organizations_archived_by_user",
        "organizations",
        "users",
        ["archived_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_organizations_archived_at",
        "organizations",
        ["archived_at"],
        unique=False,
    )
    op.create_index(
        "ix_organizations_is_active_archived_at",
        "organizations",
        ["is_active", "archived_at"],
        unique=False,
    )

    op.execute(
        """
        UPDATE organizations
        SET is_active = FALSE
        WHERE archived_at IS NOT NULL AND is_active = TRUE
        """
    )
    op.execute(
        """
        UPDATE organizations
        SET archived_at = CURRENT_TIMESTAMP
        WHERE is_active = FALSE AND archived_at IS NULL
        """
    )

    op.create_check_constraint(
        "ck_organizations_lifecycle_state",
        "organizations",
        "(is_active = true AND archived_at IS NULL) OR (is_active = false AND archived_at IS NOT NULL)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_organizations_lifecycle_state", "organizations", type_="check")
    op.drop_index("ix_organizations_is_active_archived_at", table_name="organizations")
    op.drop_index("ix_organizations_archived_at", table_name="organizations")
    op.drop_constraint("fk_organizations_archived_by_user", "organizations", type_="foreignkey")
    op.drop_column("organizations", "archived_by_user_id")
    op.drop_column("organizations", "archived_at")
