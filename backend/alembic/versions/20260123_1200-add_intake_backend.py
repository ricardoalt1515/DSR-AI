"""add intake backend tables and file processing fields

Revision ID: 20260123_1200
Revises: 20260121_1200
Create Date: 2026-01-23 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260123_1200"
down_revision = "20260121_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "intake_notes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_intake_notes_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["project_id", "organization_id"],
            ["projects.id", "projects.organization_id"],
            name="fk_intake_notes_project_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name="fk_intake_notes_created_by",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id", "organization_id", name="uq_intake_notes_project_org"),
    )

    op.create_table(
        "intake_suggestions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("source_file_id", sa.UUID(), nullable=True),
        sa.Column("field_id", sa.Text(), nullable=False),
        sa.Column("field_label", sa.Text(), nullable=False),
        sa.Column("section_id", sa.Text(), nullable=False),
        sa.Column("section_title", sa.Text(), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("value_type", sa.Text(), nullable=True),
        sa.Column("unit", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Integer(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("source", sa.Text(), nullable=False),
        sa.Column("evidence", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 100",
            name="ck_intake_suggestions_confidence",
        ),
        sa.CheckConstraint(
            "status IN ('pending', 'applied', 'rejected')",
            name="ck_intake_suggestions_status",
        ),
        sa.CheckConstraint(
            "source IN ('notes', 'file', 'image', 'sds', 'lab')",
            name="ck_intake_suggestions_source",
        ),
        sa.CheckConstraint(
            "value_type IS NULL OR value_type IN ('string', 'number')",
            name="ck_intake_suggestions_value_type",
        ),
        sa.CheckConstraint(
            "(source = 'notes' AND evidence IS NULL AND source_file_id IS NULL) OR "
            "(source != 'notes' AND evidence IS NOT NULL AND source_file_id IS NOT NULL)",
            name="ck_intake_suggestions_evidence_source",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_intake_suggestions_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["project_id", "organization_id"],
            ["projects.id", "projects.organization_id"],
            name="fk_intake_suggestions_project_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name="fk_intake_suggestions_created_by",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["source_file_id"],
            ["project_files.id"],
            name="fk_intake_suggestions_source_file",
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_intake_suggestions_project_org",
        "intake_suggestions",
        ["project_id", "organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_intake_suggestions_project_section_field_status",
        "intake_suggestions",
        ["project_id", "section_id", "field_id", "status"],
        unique=False,
    )
    op.create_index(
        "ix_intake_suggestions_pending",
        "intake_suggestions",
        ["project_id", "section_id", "field_id"],
        unique=False,
        postgresql_where=sa.text("status = 'pending'"),
    )
    op.create_index(
        "uq_intake_suggestions_applied_field",
        "intake_suggestions",
        ["project_id", "section_id", "field_id"],
        unique=True,
        postgresql_where=sa.text("status = 'applied'"),
    )

    op.create_table(
        "intake_unmapped_notes",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("extracted_text", sa.Text(), nullable=False),
        sa.Column("confidence", sa.Integer(), nullable=False),
        sa.Column("source_file_id", sa.UUID(), nullable=True),
        sa.Column("source_file", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("mapped_to_suggestion_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "confidence >= 0 AND confidence <= 100",
            name="ck_intake_unmapped_notes_confidence",
        ),
        sa.CheckConstraint(
            "status IN ('open', 'mapped', 'dismissed')",
            name="ck_intake_unmapped_notes_status",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_intake_unmapped_notes_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["project_id", "organization_id"],
            ["projects.id", "projects.organization_id"],
            name="fk_intake_unmapped_notes_project_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["source_file_id"],
            ["project_files.id"],
            name="fk_intake_unmapped_notes_source_file",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["mapped_to_suggestion_id"],
            ["intake_suggestions.id"],
            name="fk_intake_unmapped_notes_mapped_suggestion",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_intake_unmapped_notes_project_org",
        "intake_unmapped_notes",
        ["project_id", "organization_id"],
        unique=False,
    )

    op.add_column(
        "project_files",
        sa.Column(
            "processing_status",
            sa.String(length=20),
            server_default="completed",
            nullable=False,
        ),
    )
    op.add_column(
        "project_files",
        sa.Column("processing_error", sa.Text(), nullable=True),
    )
    op.add_column(
        "project_files",
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "project_files",
        sa.Column(
            "processing_attempts",
            sa.Integer(),
            server_default="0",
            nullable=False,
        ),
    )
    op.alter_column("project_files", "processing_status", server_default=None)
    op.alter_column("project_files", "processing_attempts", server_default=None)
    op.add_column(
        "project_files",
        sa.Column("file_hash", sa.String(length=64), nullable=True),
    )
    op.create_check_constraint(
        "ck_project_files_processing_status",
        "project_files",
        "processing_status IN ('queued', 'processing', 'completed', 'failed')",
    )


def downgrade() -> None:
    op.drop_constraint("ck_project_files_processing_status", "project_files", type_="check")
    op.drop_column("project_files", "file_hash")
    op.drop_column("project_files", "processing_attempts")
    op.drop_column("project_files", "processed_at")
    op.drop_column("project_files", "processing_error")
    op.drop_column("project_files", "processing_status")

    op.drop_index("ix_intake_unmapped_notes_project_org", table_name="intake_unmapped_notes")
    op.drop_table("intake_unmapped_notes")

    op.drop_index("ix_intake_suggestions_pending", table_name="intake_suggestions")
    op.drop_index("uq_intake_suggestions_applied_field", table_name="intake_suggestions")
    op.drop_index(
        "ix_intake_suggestions_project_section_field_status",
        table_name="intake_suggestions",
    )
    op.drop_index("ix_intake_suggestions_project_org", table_name="intake_suggestions")
    op.drop_table("intake_suggestions")

    op.drop_table("intake_notes")
