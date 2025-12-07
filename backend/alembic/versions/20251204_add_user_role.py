"""Add user role field.

Revision ID: 20251204_add_role
Revises: 20251114_0907_add_project_lifecycle_archiving
Create Date: 2024-12-04

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251204_add_role'
# Link to previous migration's revision id (add_project_lifecycle_archiving)
down_revision = 'f2c3d4e5f6a7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add role column with default 'field_agent'
    op.add_column(
        'users',
        sa.Column(
            'role',
            sa.String(20),
            nullable=False,
            server_default='field_agent',
            comment='User role: admin, field_agent, contractor, compliance, sales'
        )
    )
    
    # Create index for role queries
    op.create_index('ix_users_role', 'users', ['role'])
    
    # Set existing superusers to admin role
    op.execute("""
        UPDATE users 
        SET role = 'admin' 
        WHERE is_superuser = true
    """)


def downgrade() -> None:
    op.drop_index('ix_users_role', 'users')
    op.drop_column('users', 'role')
