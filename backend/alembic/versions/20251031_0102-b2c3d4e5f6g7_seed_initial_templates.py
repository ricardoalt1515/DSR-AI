"""seed initial templates (base, industrial, oil-gas)

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2025-10-31 01:02:00.000000

"""
from alembic import op
import sqlalchemy as sa
import json
from datetime import datetime

# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6g7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


# Template IDs (fixed UUIDs for consistency)
BASE_TEMPLATE_ID = '00000000-0000-0000-0000-000000000001'
INDUSTRIAL_TEMPLATE_ID = '00000000-0000-0000-0000-000000000002'
OIL_GAS_TEMPLATE_ID = '00000000-0000-0000-0000-000000000003'


def upgrade() -> None:
    """
    Seed 3 system templates:
    1. Base Template (universal)
    2. Industrial Template (extends base)
    3. Oil & Gas Template (extends base, specialized)

    These templates contain ONLY field IDs (not metadata).
    Frontend parameter library provides labels, validations, units.
    """

    # Get current timestamp for created_at
    now = datetime.utcnow()

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TEMPLATE 1: BASE (Universal - 5 sections, 20 fields)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    base_sections = [
        {
            "id": "project-context",
            "title": "Project Context",
            "description": "Essential project context and objectives",
            "allow_custom_fields": False,
            "add_fields": [
                "water-source",
                "water-uses",
                "existing-system",
                "existing-system-description",
                "project-objective",
                "reuse-goals",
                "discharge-point"
            ]
        },
        {
            "id": "economics-scale",
            "title": "Economics & Scale",
            "description": "Volumes and operational costs",
            "allow_custom_fields": True,
            "add_fields": [
                "water-cost",
                "water-consumption",
                "wastewater-generated",
                "people-served-daily",
                "peak-factor"
            ]
        },
        {
            "id": "project-constraints",
            "title": "Project Constraints",
            "description": "Limitations and special considerations affecting design",
            "allow_custom_fields": True,
            "add_fields": [
                "constraints",
                "regulatory-requirements"
            ]
        },
        {
            "id": "water-quality",
            "title": "Water Quality",
            "description": "Physical, chemical and bacteriological characteristics",
            "allow_custom_fields": True,
            "add_fields": [
                "ph",
                "turbidity",
                "tds",
                "hardness",
                "temperature"
            ]
        },
        {
            "id": "field-notes",
            "title": "Field Notes",
            "description": "Engineer observations, assumptions and detected risks on site",
            "allow_custom_fields": False,
            "add_fields": [
                "field-notes"
            ]
        }
    ]

    op.execute(f"""
        INSERT INTO templates (
            id, created_at, updated_at,
            slug, name, description,
            sector, subsector,
            sections, current_version,
            extends_slug, is_system, is_active,
            icon, tags, complexity, estimated_time,
            created_by, deleted_at
        ) VALUES (
            '{BASE_TEMPLATE_ID}',
            '{now}',
            '{now}',
            'base',
            'Base Template',
            'Universal template with essential fields for any water treatment project',
            NULL,
            NULL,
            '{json.dumps(base_sections)}'::jsonb,
            1,
            NULL,
            true,
            true,
            NULL,
            '["base", "universal", "core"]'::json,
            'simple',
            15,
            NULL,
            NULL
        )
    """)

    # Create version 1 for base template
    op.execute(f"""
        INSERT INTO template_versions (
            id, created_at, updated_at,
            template_id, version_number,
            sections, change_summary, created_by
        ) VALUES (
            gen_random_uuid(),
            '{now}',
            '{now}',
            '{BASE_TEMPLATE_ID}',
            1,
            '{json.dumps(base_sections)}'::jsonb,
            'Initial version',
            NULL
        )
    """)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TEMPLATE 2: INDUSTRIAL (Extends base)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    industrial_sections = [
        {
            "id": "economics-scale",
            "operation": "extend",
            "add_fields": [
                "operating-hours"
            ],
            "field_overrides": {
                "peak-factor": {
                    "importance": "critical",
                    "default_value": 2.0
                }
            }
        },
        {
            "id": "project-constraints",
            "operation": "extend",
            "field_overrides": {
                "regulatory-requirements": {
                    "importance": "critical",
                    "required": True,
                    "placeholder": "Industrial discharge often requires permits (NOM-001, EPA, etc.)"
                }
            }
        },
        {
            "id": "water-quality",
            "operation": "extend",
            "add_fields": [
                "bod5",
                "cod",
                "tss"
            ],
            "field_overrides": {
                "ph": {
                    "importance": "critical",
                    "required": True
                }
            }
        }
    ]

    op.execute(f"""
        INSERT INTO templates (
            id, created_at, updated_at,
            slug, name, description,
            sector, subsector,
            sections, current_version,
            extends_slug, is_system, is_active,
            icon, tags, complexity, estimated_time,
            created_by, deleted_at
        ) VALUES (
            '{INDUSTRIAL_TEMPLATE_ID}',
            '{now}',
            '{now}',
            'industrial',
            'Industrial - General',
            'For manufacturing plants and industrial processes',
            'industrial',
            NULL,
            '{json.dumps(industrial_sections)}'::jsonb,
            1,
            'base',
            true,
            true,
            NULL,
            '["industrial", "manufacturing", "wastewater"]'::json,
            'standard',
            20,
            NULL,
            NULL
        )
    """)

    # Create version 1 for industrial template
    op.execute(f"""
        INSERT INTO template_versions (
            id, created_at, updated_at,
            template_id, version_number,
            sections, change_summary, created_by
        ) VALUES (
            gen_random_uuid(),
            '{now}',
            '{now}',
            '{INDUSTRIAL_TEMPLATE_ID}',
            1,
            '{json.dumps(industrial_sections)}'::jsonb,
            'Initial version',
            NULL
        )
    """)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # TEMPLATE 3: OIL & GAS (Extends base, specialized)
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    oil_gas_sections = [
        {
            "id": "water-quality",
            "operation": "extend",
            "remove_fields": [
                "turbidity",
                "hardness",
                "temperature"
            ],
            "add_fields": [
                "tss",
                "tph",
                "cadmium",
                "chromium",
                "lead",
                "mercury"
            ],
            "field_overrides": {
                "ph": {
                    "importance": "critical",
                    "required": True,
                    "description": "pH crítico para tratamiento y control de corrosión"
                },
                "tds": {
                    "importance": "critical",
                    "required": True,
                    "description": "SDT - Sólidos Disueltos Totales, muy alto en agua producida (brine)"
                },
                "tss": {
                    "importance": "critical",
                    "required": True,
                    "default_value": 250,
                    "description": "Sólidos Suspendidos del agua residual de oil & gas"
                },
                "tph": {
                    "importance": "critical",
                    "required": True,
                    "description": "Hidrocarburos Totales de Petróleo - requerimiento regulatorio"
                },
                "cadmium": {
                    "importance": "critical",
                    "required": False,
                    "description": "Cadmio - metal pesado altamente tóxico, estrictamente regulado"
                },
                "chromium": {
                    "importance": "critical",
                    "required": False,
                    "description": "Cromo total - incluye Cr(III) y Cr(VI)"
                },
                "lead": {
                    "importance": "critical",
                    "required": False,
                    "description": "Plomo - metal pesado tóxico, común en aguas industriales"
                },
                "mercury": {
                    "importance": "critical",
                    "required": False,
                    "description": "Mercurio - extremadamente tóxico y bioacumulativo"
                }
            }
        },
        {
            "id": "project-constraints",
            "operation": "extend",
            "field_overrides": {
                "regulatory-requirements": {
                    "importance": "critical",
                    "required": True,
                    "placeholder": "Oil & gas requiere permisos de descarga (EPA, SEMARNAT, NOM-001, etc.)"
                },
                "constraints": {
                    "importance": "critical",
                    "description": "Restricciones comunes: sensibilidad ambiental, ubicación remota, alto TDS"
                }
            }
        }
    ]

    op.execute(f"""
        INSERT INTO templates (
            id, created_at, updated_at,
            slug, name, description,
            sector, subsector,
            sections, current_version,
            extends_slug, is_system, is_active,
            icon, tags, complexity, estimated_time,
            created_by, deleted_at
        ) VALUES (
            '{OIL_GAS_TEMPLATE_ID}',
            '{now}',
            '{now}',
            'industrial-oil-gas',
            'Industrial - Oil & Gas',
            'Oil & gas with 5 essential parameters per engineer''s questionnaire',
            'industrial',
            'oil_gas',
            '{json.dumps(oil_gas_sections)}'::jsonb,
            1,
            'base',
            true,
            true,
            '🛢️',
            '["industrial", "oil", "gas", "petroleum", "hydrocarbons", "tph"]'::json,
            'standard',
            20,
            NULL,
            NULL
        )
    """)

    # Create version 1 for oil-gas template
    op.execute(f"""
        INSERT INTO template_versions (
            id, created_at, updated_at,
            template_id, version_number,
            sections, change_summary, created_by
        ) VALUES (
            gen_random_uuid(),
            '{now}',
            '{now}',
            '{OIL_GAS_TEMPLATE_ID}',
            1,
            '{json.dumps(oil_gas_sections)}'::jsonb,
            'Initial version',
            NULL
        )
    """)


def downgrade() -> None:
    """
    Remove seeded templates.

    Note: This will cascade delete template_versions due to FK.
    """
    op.execute(f"DELETE FROM templates WHERE id IN ('{BASE_TEMPLATE_ID}', '{INDUSTRIAL_TEMPLATE_ID}', '{OIL_GAS_TEMPLATE_ID}')")
