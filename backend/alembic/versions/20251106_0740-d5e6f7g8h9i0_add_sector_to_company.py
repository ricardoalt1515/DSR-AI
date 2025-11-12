"""add sector and subsector to companies

Revision ID: d5e6f7g8h9i0
Revises: c1d2e3f4g5h6
Create Date: 2025-11-06 07:40:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'd5e6f7g8h9i0'
down_revision = 'c1d2e3f4g5h6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add sector and subsector columns to companies table.
    
    This allows filtering and categorization at the company level
    rather than per-assessment, which is more logical since a company's
    sector typically doesn't change across assessments.
    """
    
    # Add sector column (nullable initially for backfill)
    op.add_column(
        'companies',
        sa.Column(
            'sector',
            sa.String(50),
            nullable=True,  # Temporarily nullable
            comment='commercial, industrial, residential, municipal, other'
        )
    )
    
    # Add subsector column (nullable initially for backfill)
    op.add_column(
        'companies',
        sa.Column(
            'subsector',
            sa.String(100),
            nullable=True,  # Temporarily nullable
            comment='Specific subsector within the sector (e.g., food_processing, hotel)'
        )
    )
    
    # Backfill existing companies with default 'other' sector
    # This ensures data integrity for existing records
    op.execute("""
        UPDATE companies 
        SET 
            sector = 'other',
            subsector = 'other'
        WHERE sector IS NULL
    """)
    
    # Now make columns non-nullable (fail fast on missing data)
    op.alter_column('companies', 'sector', nullable=False)
    op.alter_column('companies', 'subsector', nullable=False)
    
    # Add index for filtering by sector (common query pattern)
    op.create_index(
        'ix_companies_sector',
        'companies',
        ['sector'],
        unique=False
    )


def downgrade() -> None:
    """Revert sector changes."""
    
    # Drop index first
    op.drop_index('ix_companies_sector', table_name='companies')
    
    # Drop columns
    op.drop_column('companies', 'subsector')
    op.drop_column('companies', 'sector')
