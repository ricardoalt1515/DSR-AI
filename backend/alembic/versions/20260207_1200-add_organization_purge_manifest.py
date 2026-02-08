"""add organization purge manifest

Revision ID: 20260207_1200
Revises: 20260206_1200
Create Date: 2026-02-07 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260207_1200"
down_revision = "20260206_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "organization_purge_manifests",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("storage_keys", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_org_purge_manifest_organization",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_organization_purge_manifests_id"),
        "organization_purge_manifests",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_organization_purge_manifests_organization_id"),
        "organization_purge_manifests",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_organization_purge_manifests_status"),
        "organization_purge_manifests",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_organization_purge_manifests_status"), table_name="organization_purge_manifests")
    op.drop_index(
        op.f("ix_organization_purge_manifests_organization_id"),
        table_name="organization_purge_manifests",
    )
    op.drop_index(op.f("ix_organization_purge_manifests_id"), table_name="organization_purge_manifests")
    op.drop_table("organization_purge_manifests")
