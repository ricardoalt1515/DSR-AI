"""remove_legacy_proposal_columns

Revision ID: 1e92062db9b3
Revises: bc0d679af70e
Create Date: 2025-10-30 17:45:55.508544

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1e92062db9b3'
down_revision = 'bc0d679af70e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Remove legacy JSONB columns from proposals table.
    All data is now stored in ai_metadata with structure:
    {
        "proposal": {...},      # AI output
        "transparency": {...}   # Audit metadata
    }
    """
    # Drop legacy JSONB columns (data already in ai_metadata)
    op.drop_column('proposals', 'equipment_list')
    op.drop_column('proposals', 'treatment_efficiency')
    op.drop_column('proposals', 'cost_breakdown')
    op.drop_column('proposals', 'risks')
    
    # Drop legacy TEXT column
    op.drop_column('proposals', 'implementation_plan')


def downgrade() -> None:
    """
    Restore legacy columns (for rollback only - data will be empty).
    """
    # Restore legacy columns
    op.add_column('proposals', sa.Column('equipment_list', sa.dialects.postgresql.JSONB(), nullable=True))
    op.add_column('proposals', sa.Column('treatment_efficiency', sa.dialects.postgresql.JSONB(), nullable=True))
    op.add_column('proposals', sa.Column('cost_breakdown', sa.dialects.postgresql.JSONB(), nullable=True))
    op.add_column('proposals', sa.Column('risks', sa.dialects.postgresql.JSONB(), nullable=True))
    op.add_column('proposals', sa.Column('implementation_plan', sa.Text(), nullable=True))
