"""add processing lease fields for intake worker

Revision ID: 20260203_1200
Revises: 20260202_1200
Create Date: 2026-02-03 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260203_1200"
down_revision = "20260202_1200"
branch_labels = None
depends_on = None


LEASE_SECONDS = 300


def upgrade() -> None:
    op.add_column(
        "project_files",
        sa.Column("processing_started_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "project_files",
        sa.Column("processing_available_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.execute(
        """
        UPDATE project_files
        SET processing_available_at = CURRENT_TIMESTAMP
        WHERE processing_status = 'queued'
          AND processing_available_at IS NULL
        """
    )
    op.execute(
        f"""
        UPDATE project_files
        SET processing_available_at = CURRENT_TIMESTAMP + INTERVAL '{LEASE_SECONDS} seconds'
        WHERE processing_status = 'processing'
          AND processing_available_at IS NULL
        """
    )

    op.create_index(
        "ix_project_files_claim_queue",
        "project_files",
        ["processing_available_at", "created_at"],
        unique=False,
        postgresql_where=sa.text("processing_status = 'queued'"),
    )
    op.create_index(
        "ix_project_files_processing_lease",
        "project_files",
        ["processing_available_at"],
        unique=False,
        postgresql_where=sa.text("processing_status = 'processing'"),
    )


def downgrade() -> None:
    op.drop_index("ix_project_files_processing_lease", table_name="project_files")
    op.drop_index("ix_project_files_claim_queue", table_name="project_files")
    op.drop_column("project_files", "processing_available_at")
    op.drop_column("project_files", "processing_started_at")
