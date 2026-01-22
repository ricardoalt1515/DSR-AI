"""add archive fields to company/location/project

Revision ID: 20260121_1200
Revises: 20260119_1100
Create Date: 2026-01-21 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20260121_1200"
down_revision = "20260119_1100"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "companies",
        sa.Column("archived_by_user_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_companies_archived_by_user",
        "companies",
        "users",
        ["archived_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_companies_org_archived_at",
        "companies",
        ["organization_id", "archived_at"],
        unique=False,
    )

    op.add_column(
        "locations",
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "locations",
        sa.Column("archived_by_user_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "locations",
        sa.Column("archived_by_parent_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_locations_archived_by_user",
        "locations",
        "users",
        ["archived_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_locations_archived_by_parent",
        "locations",
        "companies",
        ["archived_by_parent_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_locations_org_archived_at",
        "locations",
        ["organization_id", "archived_at"],
        unique=False,
    )
    op.create_index(
        "ix_locations_org_archived_by_parent",
        "locations",
        ["organization_id", "archived_by_parent_id"],
        unique=False,
    )

    op.add_column(
        "projects",
        sa.Column("archived_by_user_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "projects",
        sa.Column("archived_by_parent_id", sa.UUID(), nullable=True),
    )
    op.create_foreign_key(
        "fk_projects_archived_by_user",
        "projects",
        "users",
        ["archived_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_projects_archived_by_parent",
        "projects",
        "locations",
        ["archived_by_parent_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_projects_org_archived_at",
        "projects",
        ["organization_id", "archived_at"],
        unique=False,
    )
    op.create_index(
        "ix_projects_org_archived_by_parent",
        "projects",
        ["organization_id", "archived_by_parent_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_projects_org_archived_by_parent", table_name="projects")
    op.drop_index("ix_projects_org_archived_at", table_name="projects")
    op.drop_constraint("fk_projects_archived_by_parent", "projects", type_="foreignkey")
    op.drop_constraint("fk_projects_archived_by_user", "projects", type_="foreignkey")
    op.drop_column("projects", "archived_by_parent_id")
    op.drop_column("projects", "archived_by_user_id")

    op.drop_index("ix_locations_org_archived_by_parent", table_name="locations")
    op.drop_index("ix_locations_org_archived_at", table_name="locations")
    op.drop_constraint("fk_locations_archived_by_parent", "locations", type_="foreignkey")
    op.drop_constraint("fk_locations_archived_by_user", "locations", type_="foreignkey")
    op.drop_column("locations", "archived_by_parent_id")
    op.drop_column("locations", "archived_by_user_id")
    op.drop_column("locations", "archived_at")

    op.drop_index("ix_companies_org_archived_at", table_name="companies")
    op.drop_constraint("fk_companies_archived_by_user", "companies", type_="foreignkey")
    op.drop_column("companies", "archived_by_user_id")
    op.drop_column("companies", "archived_at")
