"""add company and location tables

Revision ID: c1d2e3f4g5h6
Revises: b2c3d4e5f6g7
Create Date: 2024-11-04 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid

# revision identifiers, used by Alembic.
revision = 'c1d2e3f4g5h6'
down_revision = 'b2c3d4e5f6g7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add Company and Location models:
    - companies: Client organizations
    - locations: Physical sites within companies
    - projects.location_id: FK to locations
    
    Keep projects.client and projects.location for backward compatibility.
    """
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TABLE 1: companies
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    op.create_table(
        'companies',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        
        # Basic info
        sa.Column('name', sa.String(255), nullable=False, index=True),
        sa.Column('industry', sa.String(100), nullable=False, comment='Automotive, Food & Beverage, etc.'),
        
        # Contact
        sa.Column('contact_name', sa.String(255), nullable=True),
        sa.Column('contact_email', sa.String(255), nullable=True),
        sa.Column('contact_phone', sa.String(50), nullable=True),
        
        # Additional
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('tags', postgresql.JSON, nullable=True, server_default='[]'),
    )
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TABLE 2: locations
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    op.create_table(
        'locations',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        
        # FK to company
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        
        # Location info
        sa.Column('name', sa.String(255), nullable=False, comment='Plant name or identifier'),
        sa.Column('city', sa.String(100), nullable=False, index=True),
        sa.Column('state', sa.String(100), nullable=False, index=True),
        sa.Column('address', sa.String(500), nullable=True),
        
        # Coordinates
        sa.Column('latitude', sa.Float, nullable=True),
        sa.Column('longitude', sa.Float, nullable=True),
        
        # Additional
        sa.Column('notes', sa.String(1000), nullable=True),
    )
    
    # Index for common queries
    op.create_index('ix_locations_company_city', 'locations', ['company_id', 'city'])
    
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TABLE 3: Update projects table
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # Add location_id column (nullable for now)
    op.add_column('projects', 
        sa.Column('location_id', postgresql.UUID(as_uuid=True), nullable=True, index=True,
                  comment='FK to Location - company site where waste is generated')
    )
    
    # Make client and location nullable (they're legacy fields now)
    op.alter_column('projects', 'client', nullable=True, 
                    comment='LEGACY - use location.company.name')
    op.alter_column('projects', 'location', nullable=True,
                    comment='LEGACY - use location.name')
    
    # Add FK constraint
    op.create_foreign_key(
        'fk_projects_location',
        'projects', 'locations',
        ['location_id'], ['id'],
        ondelete='CASCADE'
    )


def downgrade() -> None:
    """Revert changes."""
    
    # Drop FK from projects
    op.drop_constraint('fk_projects_location', 'projects', type_='foreignkey')
    op.drop_column('projects', 'location_id')
    
    # Restore client and location as required
    op.alter_column('projects', 'client', nullable=False)
    op.alter_column('projects', 'location', nullable=False)
    
    # Drop indexes
    op.drop_index('ix_locations_company_city')
    
    # Drop tables (cascade will handle FKs)
    op.drop_table('locations')
    op.drop_table('companies')
