"""add feedback table

Revision ID: 20260202_1200
Revises: 20260130_1200
Create Date: 2026-02-02 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260202_1200"
down_revision = "20260130_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "feedback",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("feedback_type", sa.String(length=50), nullable=True),
        sa.Column("page_path", sa.String(length=512), nullable=True),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("resolved_by_user_id", sa.UUID(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("char_length(content) <= 4000", name="ck_feedback_content_length"),
        sa.CheckConstraint(
            "(resolved_at IS NOT NULL) OR (resolved_by_user_id IS NULL)",
            name="ck_feedback_resolved_fields_consistent",
        ),
        sa.CheckConstraint(
            "feedback_type IS NULL OR feedback_type IN "
            "('bug', 'incorrect_response', 'feature_request', 'general')",
            name="ck_feedback_type",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_feedback_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_feedback_user",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["resolved_by_user_id"],
            ["users.id"],
            name="fk_feedback_resolved_by_user",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_feedback_id"), "feedback", ["id"], unique=True)
    op.create_index(op.f("ix_feedback_organization_id"), "feedback", ["organization_id"], unique=False)
    op.create_index(op.f("ix_feedback_user_id"), "feedback", ["user_id"], unique=False)
    op.create_index("ix_feedback_org_created_at", "feedback", ["organization_id", "created_at"], unique=False)
    op.create_index("ix_feedback_org_resolved_at", "feedback", ["organization_id", "resolved_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_feedback_org_resolved_at", table_name="feedback")
    op.drop_index("ix_feedback_org_created_at", table_name="feedback")
    op.drop_index(op.f("ix_feedback_user_id"), table_name="feedback")
    op.drop_index(op.f("ix_feedback_organization_id"), table_name="feedback")
    op.drop_index(op.f("ix_feedback_id"), table_name="feedback")
    op.drop_table("feedback")
