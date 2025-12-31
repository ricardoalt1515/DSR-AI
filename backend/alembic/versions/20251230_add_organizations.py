"""add organizations and multi-tenant scoping

Revision ID: 20251230_add_organizations
Revises: 20251204_add_role
Create Date: 2025-12-30

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# revision identifiers, used by Alembic.
revision = "20251230_add_organizations"
down_revision = "20251204_add_role"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TABLE: organizations
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("contact_phone", sa.String(50), nullable=True),
        sa.Column("settings", postgresql.JSONB, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.UniqueConstraint("slug", name="uq_organizations_slug"),
    )
    op.create_index("ix_organizations_name", "organizations", ["name"], unique=False)
    op.create_index("ix_organizations_is_active", "organizations", ["is_active"], unique=False)

    # Seed initial org (DSR)
    dsr_org_id = uuid.uuid4()
    org_table = sa.table(
        "organizations",
        sa.column("id", postgresql.UUID(as_uuid=True)),
        sa.column("name", sa.String),
        sa.column("slug", sa.String),
        sa.column("contact_email", sa.String),
        sa.column("contact_phone", sa.String),
        sa.column("settings", postgresql.JSONB),
        sa.column("is_active", sa.Boolean),
    )
    op.bulk_insert(
        org_table,
        [
            {
                "id": dsr_org_id,
                "name": "DSR",
                "slug": "dsr",
                "contact_email": None,
                "contact_phone": None,
                "settings": {},
                "is_active": True,
            }
        ],
    )

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Add organization_id columns (nullable for backfill)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    op.add_column("users", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("companies", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("locations", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("projects", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("proposals", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("project_files", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("timeline_events", sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=True))

    # Backfill existing data to DSR org
    op.execute(sa.text("UPDATE companies SET organization_id = :org_id").bindparams(org_id=dsr_org_id))
    op.execute(sa.text("UPDATE locations SET organization_id = :org_id").bindparams(org_id=dsr_org_id))
    op.execute(sa.text("UPDATE projects SET organization_id = :org_id").bindparams(org_id=dsr_org_id))
    op.execute(sa.text("UPDATE proposals SET organization_id = :org_id").bindparams(org_id=dsr_org_id))
    op.execute(sa.text("UPDATE project_files SET organization_id = :org_id").bindparams(org_id=dsr_org_id))
    op.execute(sa.text("UPDATE timeline_events SET organization_id = :org_id").bindparams(org_id=dsr_org_id))
    op.execute(
        sa.text(
            "UPDATE users SET organization_id = :org_id WHERE is_superuser = false"
        ).bindparams(org_id=dsr_org_id)
    )

    # Enforce NOT NULL (except users)
    op.alter_column("companies", "organization_id", nullable=False)
    op.alter_column("locations", "organization_id", nullable=False)
    op.alter_column("projects", "organization_id", nullable=False)
    op.alter_column("proposals", "organization_id", nullable=False)
    op.alter_column("project_files", "organization_id", nullable=False)
    op.alter_column("timeline_events", "organization_id", nullable=False)

    # Indexes on organization_id
    op.create_index("ix_users_organization_id", "users", ["organization_id"], unique=False)
    op.create_index("ix_companies_organization_id", "companies", ["organization_id"], unique=False)
    op.create_index("ix_locations_organization_id", "locations", ["organization_id"], unique=False)
    op.create_index("ix_projects_organization_id", "projects", ["organization_id"], unique=False)
    op.create_index("ix_proposals_organization_id", "proposals", ["organization_id"], unique=False)
    op.create_index("ix_project_files_organization_id", "project_files", ["organization_id"], unique=False)
    op.create_index("ix_timeline_events_organization_id", "timeline_events", ["organization_id"], unique=False)

    # Unique constraints for composite FKs
    op.create_unique_constraint("uq_companies_id_org", "companies", ["id", "organization_id"])
    op.create_unique_constraint("uq_locations_id_org", "locations", ["id", "organization_id"])
    op.create_unique_constraint("uq_projects_id_org", "projects", ["id", "organization_id"])

    # Drop existing FKs before adding composite
    op.drop_constraint("locations_company_id_fkey", "locations", type_="foreignkey")
    op.drop_constraint("fk_projects_location", "projects", type_="foreignkey")
    op.drop_constraint("proposals_project_id_fkey", "proposals", type_="foreignkey")
    op.drop_constraint("project_files_project_id_fkey", "project_files", type_="foreignkey")
    op.drop_constraint("timeline_events_project_id_fkey", "timeline_events", type_="foreignkey")

    # Foreign keys to organizations
    op.create_foreign_key("fk_users_org", "users", "organizations", ["organization_id"], ["id"])
    op.create_foreign_key("fk_companies_org", "companies", "organizations", ["organization_id"], ["id"])
    op.create_foreign_key("fk_locations_org", "locations", "organizations", ["organization_id"], ["id"])
    op.create_foreign_key("fk_projects_org", "projects", "organizations", ["organization_id"], ["id"])
    op.create_foreign_key("fk_proposals_org", "proposals", "organizations", ["organization_id"], ["id"])
    op.create_foreign_key("fk_project_files_org", "project_files", "organizations", ["organization_id"], ["id"])
    op.create_foreign_key("fk_timeline_events_org", "timeline_events", "organizations", ["organization_id"], ["id"])

    # Composite FKs (org-scoped)
    op.create_foreign_key(
        "fk_location_company_org",
        "locations",
        "companies",
        ["company_id", "organization_id"],
        ["id", "organization_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_project_location_org",
        "projects",
        "locations",
        ["location_id", "organization_id"],
        ["id", "organization_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_proposal_project_org",
        "proposals",
        "projects",
        ["project_id", "organization_id"],
        ["id", "organization_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_file_project_org",
        "project_files",
        "projects",
        ["project_id", "organization_id"],
        ["id", "organization_id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_timeline_project_org",
        "timeline_events",
        "projects",
        ["project_id", "organization_id"],
        ["id", "organization_id"],
        ondelete="CASCADE",
    )

    # Composite indexes for join performance
    op.create_index("ix_locations_company_org", "locations", ["company_id", "organization_id"], unique=False)
    op.create_index("ix_projects_location_org", "projects", ["location_id", "organization_id"], unique=False)
    op.create_index("ix_proposals_project_org", "proposals", ["project_id", "organization_id"], unique=False)
    op.create_index("ix_project_files_project_org", "project_files", ["project_id", "organization_id"], unique=False)
    op.create_index("ix_timeline_events_project_org", "timeline_events", ["project_id", "organization_id"], unique=False)

    # Users org assignment constraint
    op.create_check_constraint(
        "ck_users_org_assignment",
        "users",
        sa.text(
            "(is_superuser IS TRUE AND organization_id IS NULL) OR "
            "(is_superuser IS FALSE AND organization_id IS NOT NULL)"
        ),
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_org_assignment", "users", type_="check")

    op.drop_index("ix_timeline_events_project_org", table_name="timeline_events")
    op.drop_index("ix_project_files_project_org", table_name="project_files")
    op.drop_index("ix_proposals_project_org", table_name="proposals")
    op.drop_index("ix_projects_location_org", table_name="projects")
    op.drop_index("ix_locations_company_org", table_name="locations")

    op.drop_constraint("fk_timeline_project_org", "timeline_events", type_="foreignkey")
    op.drop_constraint("fk_file_project_org", "project_files", type_="foreignkey")
    op.drop_constraint("fk_proposal_project_org", "proposals", type_="foreignkey")
    op.drop_constraint("fk_project_location_org", "projects", type_="foreignkey")
    op.drop_constraint("fk_location_company_org", "locations", type_="foreignkey")

    op.drop_constraint("fk_timeline_events_org", "timeline_events", type_="foreignkey")
    op.drop_constraint("fk_project_files_org", "project_files", type_="foreignkey")
    op.drop_constraint("fk_proposals_org", "proposals", type_="foreignkey")
    op.drop_constraint("fk_projects_org", "projects", type_="foreignkey")
    op.drop_constraint("fk_locations_org", "locations", type_="foreignkey")
    op.drop_constraint("fk_companies_org", "companies", type_="foreignkey")
    op.drop_constraint("fk_users_org", "users", type_="foreignkey")

    op.create_foreign_key(
        "timeline_events_project_id_fkey",
        "timeline_events",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "project_files_project_id_fkey",
        "project_files",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "proposals_project_id_fkey",
        "proposals",
        "projects",
        ["project_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "fk_projects_location",
        "projects",
        "locations",
        ["location_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_foreign_key(
        "locations_company_id_fkey",
        "locations",
        "companies",
        ["company_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("uq_projects_id_org", "projects", type_="unique")
    op.drop_constraint("uq_locations_id_org", "locations", type_="unique")
    op.drop_constraint("uq_companies_id_org", "companies", type_="unique")

    op.drop_index("ix_timeline_events_organization_id", table_name="timeline_events")
    op.drop_index("ix_project_files_organization_id", table_name="project_files")
    op.drop_index("ix_proposals_organization_id", table_name="proposals")
    op.drop_index("ix_projects_organization_id", table_name="projects")
    op.drop_index("ix_locations_organization_id", table_name="locations")
    op.drop_index("ix_companies_organization_id", table_name="companies")
    op.drop_index("ix_users_organization_id", table_name="users")

    op.drop_column("timeline_events", "organization_id")
    op.drop_column("project_files", "organization_id")
    op.drop_column("proposals", "organization_id")
    op.drop_column("projects", "organization_id")
    op.drop_column("locations", "organization_id")
    op.drop_column("companies", "organization_id")
    op.drop_column("users", "organization_id")

    op.drop_index("ix_organizations_is_active", table_name="organizations")
    op.drop_index("ix_organizations_name", table_name="organizations")
    op.drop_table("organizations")
