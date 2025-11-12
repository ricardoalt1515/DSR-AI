"""add template system with versioning

Revision ID: a1b2c3d4e5f6
Revises: ed0d521e91b8
Create Date: 2025-10-31 01:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = 'ed0d521e91b8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create template system with two-table design:
    1. templates - Master records with current version
    2. template_versions - Immutable version history
    3. project_template_usage - Analytics tracking

    Also adds project_data_schema_version to projects table.
    """

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TABLE 1: templates (master records)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    op.create_table(
        'templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),

        # Identity
        sa.Column('slug', sa.String(255), unique=True, nullable=False,
                  comment='URL-safe identifier (e.g., base, industrial-oil-gas)'),
        sa.Column('name', sa.String(255), nullable=False,
                  comment='Human-readable name'),
        sa.Column('description', sa.Text, nullable=True),

        # Targeting
        sa.Column('sector', sa.String(100), nullable=True,
                  comment='Target sector: municipal, industrial, commercial, residential'),
        sa.Column('subsector', sa.String(100), nullable=True,
                  comment='Target subsector: oil_gas, food_processing, etc.'),

        # Configuration (JSONB)
        sa.Column('sections', postgresql.JSONB, nullable=False,
                  comment='Array of SectionConfig objects with ONLY field IDs'),

        # Versioning
        sa.Column('current_version', sa.Integer, default=1, nullable=False,
                  comment='Current version number (increments on update)'),

        # Inheritance
        sa.Column('extends_slug', sa.String(255), nullable=True,
                  comment='Parent template slug for inheritance'),

        # Metadata
        sa.Column('is_system', sa.Boolean, default=False, nullable=False,
                  comment='System template (protected)'),
        sa.Column('is_active', sa.Boolean, default=True, nullable=False,
                  comment='Active templates shown in UI'),
        sa.Column('icon', sa.String(50), nullable=True,
                  comment='Emoji or icon identifier'),
        sa.Column('tags', postgresql.JSON, default=[],
                  comment='Searchable tags'),
        sa.Column('complexity', sa.String(20), default='standard',
                  comment='simple | standard | advanced'),
        sa.Column('estimated_time', sa.Integer, nullable=True,
                  comment='Estimated minutes to complete'),

        # Audit
        sa.Column('created_by', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True,
                  comment='Creator user (null = system template)'),

        # Soft delete
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True,
                  comment='Soft delete timestamp'),
    )

    # Indexes for templates table
    op.create_index('ix_template_slug', 'templates', ['slug'])
    op.create_index('ix_template_name', 'templates', ['name'])
    op.create_index('ix_template_sector', 'templates', ['sector'])
    op.create_index('ix_template_subsector', 'templates', ['subsector'])
    op.create_index('ix_template_sector_subsector', 'templates', ['sector', 'subsector'])
    op.create_index('ix_template_is_system', 'templates', ['is_system'])
    op.create_index('ix_template_active', 'templates', ['is_active', 'deleted_at'])
    op.create_index('ix_template_sections_gin', 'templates', ['sections'], postgresql_using='gin')

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TABLE 2: template_versions (version history)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    op.create_table(
        'template_versions',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),

        # Version identity
        sa.Column('template_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('templates.id', ondelete='CASCADE'), nullable=False,
                  comment='Parent template reference'),
        sa.Column('version_number', sa.Integer, nullable=False,
                  comment='Sequential version number (1, 2, 3, ...)'),

        # Snapshot
        sa.Column('sections', postgresql.JSONB, nullable=False,
                  comment='Complete snapshot of sections at this version'),

        # Change tracking
        sa.Column('change_summary', sa.Text, nullable=True,
                  comment='Human-readable summary of changes'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True,
                  comment='User who created this version'),
    )

    # Indexes and constraints for template_versions
    op.create_index('ix_template_version_template_id', 'template_versions', ['template_id'])
    op.create_index('ix_template_version_lookup', 'template_versions', ['template_id', 'version_number'])
    op.create_unique_constraint('uq_template_version', 'template_versions', ['template_id', 'version_number'])

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TABLE 3: project_template_usage (analytics)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    op.create_table(
        'project_template_usage',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),

        sa.Column('project_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('projects.id', ondelete='CASCADE'), nullable=False,
                  comment='Project that received template'),
        sa.Column('template_id', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('templates.id', ondelete='SET NULL'), nullable=True,
                  comment='Template that was applied'),
        sa.Column('template_slug', sa.String(255), nullable=False,
                  comment='Template slug (preserved even if template deleted)'),
        sa.Column('template_version', sa.Integer, nullable=False,
                  comment='Version number at time of application'),
        sa.Column('applied_by', postgresql.UUID(as_uuid=True),
                  sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True,
                  comment='User who applied template (null = automatic)'),
    )

    # Indexes for project_template_usage
    op.create_index('ix_template_usage_project', 'project_template_usage', ['project_id'])
    op.create_index('ix_template_usage_template', 'project_template_usage', ['template_id', 'template_version'])

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # UPDATE projects table: Add schema versioning
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    op.add_column('projects',
        sa.Column('project_data_schema_version', sa.Integer, 
                  server_default='1', nullable=False,
                  comment='Schema version for project_data structure')
    )


def downgrade() -> None:
    """
    Rollback template system.

    WARNING: This will delete all template data!
    Use with caution in production.
    """
    # Remove schema version column from projects
    op.drop_column('projects', 'project_data_schema_version')

    # Drop tables in reverse order (respect foreign keys)
    op.drop_table('project_template_usage')
    op.drop_table('template_versions')
    op.drop_table('templates')
