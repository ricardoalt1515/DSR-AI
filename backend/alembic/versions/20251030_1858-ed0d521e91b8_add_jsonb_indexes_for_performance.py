"""add_jsonb_indexes_for_performance

Revision ID: ed0d521e91b8
Revises: 1e92062db9b3
Create Date: 2025-10-30 18:58:41.202056

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ed0d521e91b8'
down_revision = '1e92062db9b3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    1. Convert ai_metadata from JSON to JSONB for better performance
    2. Add GIN indexes on JSONB columns for improved query performance
    
    JSONB vs JSON:
    - JSONB is binary, more efficient for indexing and querying
    - Supports GIN indexes for fast path-based queries
    - Slightly slower on insert (binary conversion) but much faster on read
    
    GIN (Generalized Inverted Index) is optimal for JSONB queries:
    - Supports containment operators (@>, ?, ?&, ?|)
    - Enables fast path-based queries (e.g., ->, ->>)
    - Significantly improves query performance (10-50x faster)
    
    Indexes created:
    1. idx_proposal_confidence_level: For filtering by confidence level
    2. idx_proposal_technologies: For searching by selected technologies
    3. idx_proposal_proven_cases: For querying proven cases data
    4. idx_proposal_technical_data: For general technical data queries
    """
    # Step 1: Convert JSON to JSONB (safe, data is automatically converted)
    op.execute("""
        ALTER TABLE proposals 
        ALTER COLUMN ai_metadata TYPE JSONB USING ai_metadata::JSONB
    """)
    
    # Step 2: Create GIN indexes on JSONB paths
    
    # Index for confidence level queries (used in filters/reports)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_proposal_confidence_level 
        ON proposals USING gin ((ai_metadata->'proposal'->'confidenceLevel'))
    """)
    
    # Index for technology selection queries (used in search/filtering)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_proposal_technologies 
        ON proposals USING gin ((ai_metadata->'proposal'->'technicalData'->'technologySelection'))
    """)
    
    # Index for proven cases queries (used in audit/transparency views)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_proposal_proven_cases 
        ON proposals USING gin ((ai_metadata->'transparency'->'provenCases'))
    """)
    
    # Index for technical data queries (general purpose)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_proposal_technical_data 
        ON proposals USING gin ((ai_metadata->'proposal'->'technicalData'))
    """)
    
    # Step 3: Analyze table to update statistics
    op.execute("ANALYZE proposals")


def downgrade() -> None:
    """
    Remove GIN indexes and revert JSONB to JSON.
    """
    # Step 1: Drop indexes
    op.execute("DROP INDEX IF EXISTS idx_proposal_confidence_level")
    op.execute("DROP INDEX IF EXISTS idx_proposal_technologies")
    op.execute("DROP INDEX IF EXISTS idx_proposal_proven_cases")
    op.execute("DROP INDEX IF EXISTS idx_proposal_technical_data")
    
    # Step 2: Revert JSONB back to JSON
    op.execute("""
        ALTER TABLE proposals 
        ALTER COLUMN ai_metadata TYPE JSON USING ai_metadata::JSON
    """)
