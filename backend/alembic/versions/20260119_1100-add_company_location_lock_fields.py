"""add_company_location_lock_fields

Revision ID: 20260119_1100
Revises: 0147eedda887
Create Date: 2026-01-19 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20260119_1100"
down_revision = "0147eedda887"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "companies",
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "companies",
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "companies",
        sa.Column("locked_by_user_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "companies",
        sa.Column("lock_reason", sa.String(length=255), nullable=True),
    )
    op.create_index(
        op.f("ix_companies_created_by_user_id"),
        "companies",
        ["created_by_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_companies_created_by_user",
        "companies",
        "users",
        ["created_by_user_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_companies_locked_by_user",
        "companies",
        "users",
        ["locked_by_user_id"],
        ["id"],
    )

    op.add_column(
        "locations",
        sa.Column("created_by_user_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "locations",
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "locations",
        sa.Column("locked_by_user_id", sa.UUID(), nullable=True),
    )
    op.add_column(
        "locations",
        sa.Column("lock_reason", sa.String(length=255), nullable=True),
    )
    op.create_index(
        op.f("ix_locations_created_by_user_id"),
        "locations",
        ["created_by_user_id"],
        unique=False,
    )
    op.create_foreign_key(
        "fk_locations_created_by_user",
        "locations",
        "users",
        ["created_by_user_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_locations_locked_by_user",
        "locations",
        "users",
        ["locked_by_user_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_locations_locked_by_user", "locations", type_="foreignkey")
    op.drop_constraint("fk_locations_created_by_user", "locations", type_="foreignkey")
    op.drop_index(op.f("ix_locations_created_by_user_id"), table_name="locations")
    op.drop_column("locations", "lock_reason")
    op.drop_column("locations", "locked_by_user_id")
    op.drop_column("locations", "locked_at")
    op.drop_column("locations", "created_by_user_id")

    op.drop_constraint("fk_companies_locked_by_user", "companies", type_="foreignkey")
    op.drop_constraint("fk_companies_created_by_user", "companies", type_="foreignkey")
    op.drop_index(op.f("ix_companies_created_by_user_id"), table_name="companies")
    op.drop_column("companies", "lock_reason")
    op.drop_column("companies", "locked_by_user_id")
    op.drop_column("companies", "locked_at")
    op.drop_column("companies", "created_by_user_id")
