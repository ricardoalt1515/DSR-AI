"""
Template registry.

Each template is a complete, materialized structure with no inheritance.
Templates only contain field IDs - frontend rehydrates with full metadata.

Structure:
    {
        "name": str,
        "description": str,
        "sections": [
            {
                "id": str,
                "title": str,
                "description": str (optional),
                "fields": [
                    {
                        "id": str              # Parameter ID from frontend library
                    }
                ]
            }
        ]
    }

Principles:
- WYSIWYG: What you see is what you get - no operations, no merging
- Materialized: Each template is complete and standalone
- ID-only: Templates ONLY store parameter IDs
- Separation: Backend = structure, Frontend (parameter-library) = metadata
- Fallback: Always returns a template (exact → sector → base)

Why ID-only?
- Single source of truth: parameter-library contains ALL metadata
- No duplication: required, importance, type, etc. live in parameter-library
- Simple: Backend just orchestrates which fields appear in which sections
"""

from typing import Dict, Tuple, Optional
import structlog

logger = structlog.get_logger(__name__)

# ═══════════════════════════════════════════════════════════
# BASE TEMPLATE (Universal Fallback)
# ═══════════════════════════════════════════════════════════

BASE_TEMPLATE = {
    "name": "Base Water Treatment Template",
    "description": "Universal template with essential fields for any water treatment project",
    "sections": [
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # SECTION 1: Project Context (7 fields)
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        {
            "id": "project-context",
            "title": "Project Context",
            "description": "Essential project context and objectives",
            "fields": [
                {"id": "water-source"},
                {"id": "water-uses"},
                {"id": "existing-system"},
                {"id": "existing-system-description"},
                {"id": "project-objective"},
                {"id": "reuse-goals"},
                {"id": "discharge-point"}
            ]
        },

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # SECTION 2: Economics & Scale (5 fields)
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        {
            "id": "economics-scale",
            "title": "Economics & Scale",
            "description": "Volumes and operational costs",
            "fields": [
                {"id": "water-cost"},
                {"id": "water-consumption"},
                {"id": "wastewater-generated"},
                {"id": "people-served-daily"},
                {"id": "peak-factor"}
            ]
        },

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # SECTION 3: Project Constraints (2 fields)
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        {
            "id": "project-constraints",
            "title": "Project Constraints",
            "description": "Limitations and special considerations affecting design",
            "fields": [
                {"id": "constraints"},
                {"id": "regulatory-requirements"}
            ]
        },

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # SECTION 4: Water Quality (5 fields)
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        {
            "id": "water-quality",
            "title": "Water Quality",
            "description": "Physical, chemical and bacteriological characteristics",
            "fields": [
                {"id": "ph"},
                {"id": "turbidity"},
                {"id": "tds"},
                {"id": "hardness"},
                {"id": "temperature"}
            ]
        },

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # SECTION 5: Field Notes (1 field) - ALWAYS LAST
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        {
            "id": "field-notes",
            "title": "Field Notes",
            "description": "Engineer observations, assumptions and detected risks on site",
            "fields": [
                {"id": "field-notes"}
            ]
        }
    ]
}

# ═══════════════════════════════════════════════════════════
# SECTOR-SPECIFIC TEMPLATES
# ═══════════════════════════════════════════════════════════

INDUSTRIAL_TEMPLATE = {
    "name": "Industrial Water Treatment",
    "description": "Template for general industrial water treatment applications",
    "sections": [
        {
            "id": "project-context",
            "title": "Industrial Project Context",
            "description": "Industrial project specifications",
            "fields": [
                {"id": "project-objective"},
                {"id": "design-flow-rate"},
                {"id": "treatment-goals"},
                {"id": "industry-type"}
            ]
        },
        {
            "id": "water-quality",
            "title": "Industrial Water Quality",
            "description": "Industrial wastewater characteristics",
            "fields": [
                {"id": "ph"},
                {"id": "tds"},
                {"id": "tss"},
                {"id": "temperature"},
                {"id": "bod"},
                {"id": "cod"},
                {"id": "conductivity"}
            ]
        },
        {
            "id": "treatment-process",
            "title": "Industrial Treatment Process",
            "description": "Treatment technologies for industrial applications",
            "fields": [
                {"id": "treatment-type"},
                {"id": "process-units"},
                {"id": "discharge-requirements"}
            ]
        }
    ]
}

# ═══════════════════════════════════════════════════════════
# SUBSECTOR-SPECIFIC TEMPLATES
# ═══════════════════════════════════════════════════════════

OIL_GAS_TEMPLATE = {
    "name": "Oil & Gas Water Treatment",
    "description": "Oil & gas with 5 essential parameters per engineer's questionnaire",
    "sections": [
        {
            "id": "project-context",
            "title": "Oil & Gas Project Context",
            "description": "Upstream/downstream water treatment specifications",
            "fields": [
                {"id": "project-objective", "required": True, "importance": "critical"},
                {"id": "design-flow-rate", "required": True, "importance": "critical"},
                {"id": "treatment-goals", "required": True, "importance": "critical"},
                {"id": "production-type", "required": True, "importance": "critical"},
                {"id": "water-source", "required": True, "importance": "critical"}
            ]
        },
        {
            "id": "water-quality",
            "title": "Produced Water Quality",
            "description": "Oil & gas produced water - 5 essential parameters from engineer's questionnaire",
            "fields": [
                # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                # ⭐ 5 ESSENTIAL PARAMETERS (per engineer's questionnaire)
                # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                
                # 1. pH - Critical for treatment and corrosion control
                {"id": "ph", "required": True, "importance": "critical"},
                
                # 2. TDS (Sólidos Disueltos Totales) - Very high in produced water (brine)
                {"id": "tds", "required": True, "importance": "critical"},
                
                # 3. TSS (Sólidos Suspendidos) - From oil & gas wastewater
                {"id": "tss", "required": True, "importance": "critical"},
                
                # 4. TPH (Hidrocarburos Totales de Petróleo) - Regulatory requirement
                {"id": "tph", "required": True, "importance": "critical"},
                
                # 5. Heavy Metals (Metales Pesados) - Individual fields for better structure
                {"id": "cadmium", "required": False, "importance": "critical"},   # Cd - Highly toxic
                {"id": "chromium", "required": False, "importance": "critical"},  # Cr - Total chromium
                {"id": "lead", "required": False, "importance": "critical"},      # Pb - Toxic heavy metal
                {"id": "mercury", "required": False, "importance": "critical"}    # Hg - Extremely toxic
            ]
        },
        {
            "id": "project-constraints",
            "title": "Project Constraints & Requirements",
            "description": "Regulatory and operational constraints for oil & gas projects",
            "fields": [
                {"id": "regulatory-requirements", "required": True, "importance": "critical"},
                {"id": "constraints", "required": False, "importance": "critical"}
            ]
        },
        {
            "id": "treatment-process",
            "title": "Oil & Gas Treatment Process",
            "description": "Specialized treatment for produced water",
            "fields": [
                {"id": "treatment-type", "required": True, "importance": "critical"},
                {"id": "process-units", "required": True, "importance": "critical"},
                {"id": "discharge-requirements", "required": True, "importance": "critical"},
                {"id": "reuse-objectives", "required": False, "importance": "recommended"}
            ]
        }
    ]
}

MUNICIPAL_TEMPLATE = {
    "name": "Municipal Water Treatment",
    "description": "Template for municipal drinking water and wastewater treatment",
    "sections": [
        {
            "id": "project-context",
            "title": "Municipal Project Context",
            "description": "Municipal system specifications",
            "fields": [
                {"id": "project-objective"},
                {"id": "design-flow-rate"},
                {"id": "treatment-goals"},
                {"id": "population-served"}
            ]
        },
        {
            "id": "water-quality",
            "title": "Municipal Water Quality",
            "description": "Drinking water or wastewater characteristics",
            "fields": [
                {"id": "ph"},
                {"id": "turbidity"},
                {"id": "tds"},
                {"id": "temperature"},
                {"id": "chlorine-residual"},
                {"id": "coliform"}
            ]
        },
        {
            "id": "treatment-process",
            "title": "Municipal Treatment Process",
            "description": "Treatment technologies for municipal water",
            "fields": [
                {"id": "treatment-type"},
                {"id": "process-units"},
                {"id": "regulatory-standards"}
            ]
        }
    ]
}

# ═══════════════════════════════════════════════════════════
# TEMPLATE REGISTRY
# ═══════════════════════════════════════════════════════════

# Key format: (sector, subsector)
# subsector can be None for sector-only templates
TEMPLATES: Dict[Tuple[str, Optional[str]], dict] = {
    # Sector-level templates
    ("industrial", None): INDUSTRIAL_TEMPLATE,
    ("municipal", None): MUNICIPAL_TEMPLATE,
    
    # Subsector-level templates
    ("industrial", "oil_gas"): OIL_GAS_TEMPLATE,
    
    # Add more subsectors as needed:
    # ("industrial", "food_processing"): FOOD_PROCESSING_TEMPLATE,
    # ("industrial", "mining"): MINING_TEMPLATE,
    # ("municipal", "drinking_water"): DRINKING_WATER_TEMPLATE,
    # ("municipal", "wastewater"): WASTEWATER_TEMPLATE,
}

# ═══════════════════════════════════════════════════════════
# METADATA
# ═══════════════════════════════════════════════════════════

def get_template_metadata() -> dict:
    """
    Get metadata about available templates for documentation.

    Returns:
        Dict with counts and lists of available templates
    """
    return {
        "total_templates": len(TEMPLATES) + 1,  # +1 for BASE_TEMPLATE
        "base_template": {
            "name": BASE_TEMPLATE["name"],
            "sections": len(BASE_TEMPLATE["sections"]),
            "total_fields": sum(len(s["fields"]) for s in BASE_TEMPLATE["sections"])
        },
        "registered_templates": [
            {
                "sector": sector,
                "subsector": subsector,
                "name": template["name"],
                "sections": len(template["sections"]),
                "total_fields": sum(len(s["fields"]) for s in template["sections"])
            }
            for (sector, subsector), template in TEMPLATES.items()
        ]
    }


# ═══════════════════════════════════════════════════════════
# VALIDATION ON STARTUP
# ═══════════════════════════════════════════════════════════

def _validate_all_templates_on_startup():
    """
    Validate all templates when module loads.

    This catches template errors at startup rather than runtime.
    If any template is invalid, logs error but doesn't crash
    (allows server to start for debugging).
    """
    try:
        from app.templates.schemas import validate_all_templates

        logger.info("🔍 Validating templates on startup...")

        # Validate BASE_TEMPLATE
        try:
            from app.templates.schemas import validate_template
            validate_template(BASE_TEMPLATE)
            logger.info("✅ BASE_TEMPLATE validated successfully")
        except Exception as e:
            logger.error(f"❌ BASE_TEMPLATE validation failed: {e}")

        # Validate all registered templates
        results = validate_all_templates(TEMPLATES)

        if results["invalid_count"] == 0:
            logger.info(
                f"✅ All {results['valid_count']} templates validated successfully"
            )
        else:
            logger.warning(
                f"⚠️  Template validation: {results['valid_count']} valid, "
                f"{results['invalid_count']} invalid"
            )
            for error in results["errors"]:
                logger.error(
                    f"❌ Template {error['sector']}/{error['subsector']}: "
                    f"{error['error']}"
                )

    except ImportError:
        # Pydantic not installed or schemas.py missing
        logger.warning(
            "⚠️  Template validation skipped (schemas module not available)"
        )
    except Exception as e:
        logger.error(f"❌ Template validation error: {e}")


# Run validation when module loads
_validate_all_templates_on_startup()
