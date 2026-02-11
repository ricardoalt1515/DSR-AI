"""add bulk import staging tables

Revision ID: 20260210_1200
Revises: 20260207_1200
Create Date: 2026-02-10 12:00:00.000000

"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260210_1200"
down_revision = "20260207_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "import_runs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("entrypoint_type", sa.String(length=20), nullable=False),
        sa.Column("entrypoint_id", sa.UUID(), nullable=False),
        sa.Column("source_file_path", sa.String(length=1024), nullable=False),
        sa.Column("source_filename", sa.String(length=255), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="uploaded"),
        sa.Column("progress_step", sa.String(length=64), nullable=True),
        sa.Column("processing_error", sa.Text(), nullable=True),
        sa.Column("processing_attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("processing_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_available_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("total_items", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("accepted_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rejected_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("amended_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("invalid_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("duplicate_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
        sa.Column("finalized_by_user_id", sa.UUID(), nullable=True),
        sa.Column("finalized_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("summary_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("artifacts_purged_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "entrypoint_type IN ('company', 'location')",
            name="ck_import_runs_entrypoint_type",
        ),
        sa.CheckConstraint(
            "status IN ('uploaded', 'processing', 'review_ready', 'finalizing', 'completed', 'failed', 'no_data')",
            name="ck_import_runs_status",
        ),
        sa.CheckConstraint("processing_attempts >= 0", name="ck_import_runs_processing_attempts"),
        sa.CheckConstraint("total_items >= 0", name="ck_import_runs_total_items"),
        sa.CheckConstraint("accepted_count >= 0", name="ck_import_runs_accepted_count"),
        sa.CheckConstraint("rejected_count >= 0", name="ck_import_runs_rejected_count"),
        sa.CheckConstraint("amended_count >= 0", name="ck_import_runs_amended_count"),
        sa.CheckConstraint("invalid_count >= 0", name="ck_import_runs_invalid_count"),
        sa.CheckConstraint("duplicate_count >= 0", name="ck_import_runs_duplicate_count"),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_import_runs_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name="fk_import_runs_created_by",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["finalized_by_user_id"],
            ["users.id"],
            name="fk_import_runs_finalized_by",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("id", "organization_id", name="uq_import_runs_id_org"),
    )
    op.create_index("ix_import_runs_org_status", "import_runs", ["organization_id", "status"], unique=False)
    op.create_index(
        "ix_import_runs_entrypoint",
        "import_runs",
        ["entrypoint_type", "entrypoint_id"],
        unique=False,
    )
    op.create_index(
        "ix_import_runs_status_created",
        "import_runs",
        ["status", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_import_runs_claim_queue",
        "import_runs",
        ["processing_available_at", "created_at"],
        unique=False,
        postgresql_where=sa.text("status = 'uploaded'"),
    )
    op.create_index(
        "ix_import_runs_processing_lease",
        "import_runs",
        ["processing_available_at"],
        unique=False,
        postgresql_where=sa.text("status = 'processing'"),
    )

    op.create_table(
        "import_items",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("run_id", sa.UUID(), nullable=False),
        sa.Column("item_type", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending_review"),
        sa.Column("needs_review", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("confidence", sa.Integer(), nullable=True),
        sa.Column("extracted_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("normalized_data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("user_amendments", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("duplicate_candidates", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("confirm_create_new", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("parent_item_id", sa.UUID(), nullable=True),
        sa.Column("created_location_id", sa.UUID(), nullable=True),
        sa.Column("created_project_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("item_type IN ('location', 'project')", name="ck_import_items_item_type"),
        sa.CheckConstraint(
            "status IN ('pending_review', 'accepted', 'amended', 'rejected', 'invalid')",
            name="ck_import_items_status",
        ),
        sa.CheckConstraint(
            "confidence IS NULL OR (confidence >= 0 AND confidence <= 100)",
            name="ck_import_items_confidence",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_import_items_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["run_id", "organization_id"],
            ["import_runs.id", "import_runs.organization_id"],
            name="fk_import_items_run_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["parent_item_id"],
            ["import_items.id"],
            name="fk_import_items_parent",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_location_id"],
            ["locations.id"],
            name="fk_import_items_created_location",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["created_project_id"],
            ["projects.id"],
            name="fk_import_items_created_project",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_import_items_run_status", "import_items", ["run_id", "status"], unique=False)
    op.create_index(
        "ix_import_items_run_created_id",
        "import_items",
        ["run_id", "created_at", "id"],
        unique=False,
    )
    op.create_index(
        "ix_import_items_org_status",
        "import_items",
        ["organization_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_import_items_type_status",
        "import_items",
        ["item_type", "status"],
        unique=False,
    )
    op.create_index("ix_import_items_parent", "import_items", ["parent_item_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_import_items_parent", table_name="import_items")
    op.drop_index("ix_import_items_type_status", table_name="import_items")
    op.drop_index("ix_import_items_org_status", table_name="import_items")
    op.drop_index("ix_import_items_run_created_id", table_name="import_items")
    op.drop_index("ix_import_items_run_status", table_name="import_items")
    op.drop_table("import_items")

    op.drop_index("ix_import_runs_processing_lease", table_name="import_runs")
    op.drop_index("ix_import_runs_claim_queue", table_name="import_runs")
    op.drop_index("ix_import_runs_status_created", table_name="import_runs")
    op.drop_index("ix_import_runs_entrypoint", table_name="import_runs")
    op.drop_index("ix_import_runs_org_status", table_name="import_runs")
    op.drop_table("import_runs")
