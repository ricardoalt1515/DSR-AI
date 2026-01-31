"""add incoming materials table

Revision ID: 20260130_1200
Revises: 20260123_1200
Create Date: 2026-01-30 12:00:00.000000

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = "20260130_1200"
down_revision = "20260123_1200"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create enum type for incoming material category.
    #
    # NOTE: SQLAlchemy/Alembic may emit CREATE TYPE for enums during CREATE TABLE.
    # To avoid "DuplicateObject" within a single migration transaction and make
    # the migration re-runnable, we create the enum via an idempotent DO block
    # and tell SQLAlchemy not to auto-create it.
    incoming_material_category = postgresql.ENUM(
        "chemicals",
        "metals",
        "wood",
        "oil",
        "packaging",
        "plastics",
        "glass",
        "paper",
        "textiles",
        "other",
        name="incoming_material_category",
        create_type=False,
    )
    op.execute(
        """
        DO $$
        BEGIN
            CREATE TYPE incoming_material_category AS ENUM (
                'chemicals',
                'metals',
                'wood',
                'oil',
                'packaging',
                'plastics',
                'glass',
                'paper',
                'textiles',
                'other'
            );
        EXCEPTION
            WHEN duplicate_object THEN NULL;
        END $$;
        """
    )

    op.create_table(
        "incoming_materials",
        sa.Column("organization_id", sa.UUID(), nullable=False),
        sa.Column("location_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column(
            "category",
            incoming_material_category,
            nullable=False,
        ),
        sa.Column("volume_frequency", sa.String(length=255), nullable=False),
        sa.Column("quality_spec", sa.String(length=500), nullable=True),
        sa.Column("current_supplier", sa.String(length=255), nullable=True),
        sa.Column("notes", sa.String(length=1000), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["location_id", "organization_id"],
            ["locations.id", "locations.organization_id"],
            name="fk_incoming_materials_location_org",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_incoming_materials_id"),
        "incoming_materials",
        ["id"],
        unique=True,
    )
    op.create_index(
        op.f("ix_incoming_materials_location_id"),
        "incoming_materials",
        ["location_id"],
        unique=False,
    )
    op.create_index(
        "ix_incoming_materials_org_location",
        "incoming_materials",
        ["organization_id", "location_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_incoming_materials_organization_id"),
        "incoming_materials",
        ["organization_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_incoming_materials_organization_id"), table_name="incoming_materials")
    op.drop_index("ix_incoming_materials_org_location", table_name="incoming_materials")
    op.drop_index(op.f("ix_incoming_materials_location_id"), table_name="incoming_materials")
    op.drop_index(op.f("ix_incoming_materials_id"), table_name="incoming_materials")
    op.drop_table("incoming_materials")

    # Drop enum type
    op.execute("DROP TYPE IF EXISTS incoming_material_category")
