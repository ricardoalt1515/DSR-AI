"""add lifecycle state and archiving flags to projects

Revision ID: f2c3d4e5f6a7
Revises: d5e6f7g8h9i0
Create Date: 2025-11-14 09:07:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "f2c3d4e5f6a7"
down_revision = "d5e6f7g8h9i0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add lifecycle grouping and archive metadata to projects."""

    # Add columns with temporary nullability for backfill
    op.add_column(
        "projects",
        sa.Column(
            "lifecycle_state",
            sa.String(length=20),
            nullable=True,
            server_default="active",
            comment="Lifecycle grouping (active/pipeline/completed/archived)",
        ),
    )
    op.add_column(
        "projects",
        sa.Column(
            "is_archived",
            sa.Boolean(),
            nullable=True,
            server_default=sa.text("false"),
            comment="Flag indicating the project is archived",
        ),
    )
    op.add_column(
        "projects",
        sa.Column(
            "archived_at",
            sa.DateTime(timezone=True),
            nullable=True,
            comment="Timestamp when the project was archived",
        ),
    )

    # Backfill lifecycle_state based on status
    op.execute(
        """
        UPDATE projects
        SET lifecycle_state = CASE
            WHEN status IN ('Proposal Ready', 'Completed') THEN 'completed'
            WHEN status IN ('Draft', 'On Hold') THEN 'pipeline'
            ELSE 'active'
        END
        WHERE lifecycle_state IS NULL
        """
    )

    # Default existing rows to not archived
    op.execute(
        """
        UPDATE projects
        SET is_archived = false
        WHERE is_archived IS NULL
        """
    )

    # Enforce NOT NULL after backfill
    op.alter_column(
        "projects",
        "lifecycle_state",
        existing_type=sa.String(length=20),
        nullable=False,
        server_default="active",
    )
    op.alter_column(
        "projects",
        "is_archived",
        existing_type=sa.Boolean(),
        nullable=False,
        server_default=sa.text("false"),
    )

    # Create indexes for filtering
    op.create_index(
        "ix_projects_lifecycle_state",
        "projects",
        ["lifecycle_state"],
        unique=False,
    )
    op.create_index(
        "ix_projects_is_archived",
        "projects",
        ["is_archived"],
        unique=False,
    )


def downgrade() -> None:
    """Remove lifecycle and archiving metadata."""

    op.drop_index("ix_projects_is_archived", table_name="projects")
    op.drop_index("ix_projects_lifecycle_state", table_name="projects")

    op.drop_column("projects", "archived_at")
    op.drop_column("projects", "is_archived")
    op.drop_column("projects", "lifecycle_state")
