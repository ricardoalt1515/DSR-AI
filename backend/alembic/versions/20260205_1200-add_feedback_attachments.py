"""add feedback attachments

Revision ID: 20260205_1200
Revises: 20260203_1200
Create Date: 2026-02-05 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260205_1200"
down_revision = "20260203_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_unique_constraint("uq_feedback_id_org", "feedback", ["id", "organization_id"])

    op.create_table(
        "feedback_attachments",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("feedback_id", sa.UUID(), nullable=False),
        sa.Column("storage_key", sa.Text(), nullable=False),
        sa.Column("original_filename", sa.Text(), nullable=False),
        sa.Column("content_type", sa.Text(), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("is_previewable", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("uploaded_by_user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_feedback_attachments_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["feedback_id", "organization_id"],
            ["feedback.id", "feedback.organization_id"],
            name="fk_feedback_attachments_feedback_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["uploaded_by_user_id"],
            ["users.id"],
            name="fk_feedback_attachments_uploaded_by",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("storage_key", name="uq_feedback_attachments_storage_key"),
    )
    op.create_index(
        op.f("ix_feedback_attachments_organization_id"),
        "feedback_attachments",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_feedback_attachments_feedback_id"),
        "feedback_attachments",
        ["feedback_id"],
        unique=False,
    )
    op.create_index(
        "ix_feedback_attachments_org_feedback",
        "feedback_attachments",
        ["organization_id", "feedback_id"],
        unique=False,
    )
    op.create_index(
        "ix_feedback_attachments_org_created_at",
        "feedback_attachments",
        ["organization_id", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_feedback_attachments_org_created_at", table_name="feedback_attachments")
    op.drop_index("ix_feedback_attachments_org_feedback", table_name="feedback_attachments")
    op.drop_index(op.f("ix_feedback_attachments_feedback_id"), table_name="feedback_attachments")
    op.drop_index(op.f("ix_feedback_attachments_organization_id"), table_name="feedback_attachments")
    op.drop_table("feedback_attachments")
    op.drop_constraint("uq_feedback_id_org", "feedback", type_="unique")
