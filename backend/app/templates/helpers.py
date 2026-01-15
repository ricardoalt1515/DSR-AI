"""
Template selection helpers.

Provides simple, fast template selection with guaranteed fallback.
No inheritance, no complex merging - just straightforward dict lookup.

Principles:
- O(1) lookup (dict-based)
- Always returns a template (fail-safe)
- Deep copy to prevent mutations
- Zero external dependencies
"""

import copy

import structlog

from .registry import BASE_TEMPLATE, TEMPLATES

logger = structlog.get_logger(__name__)


def _materialize_field(field: dict) -> dict:
    """
    Materialize field with initial state values.

    Backend only manages USER STATE:
    - value: None (initial value, will be filled by user)
    - source: "manual" (default data source)

    Frontend parameter-library provides METADATA:
    - label, type, required, importance, validation, etc.

    This separation keeps backend simple and frontend flexible.
    """
    return {
        "id": field["id"],
        "value": None,  # Initial state
        "source": "manual",  # Default source
    }


def _materialize_template(template: dict) -> dict:
    """
    Materialize template sections with fully populated fields.

    Adds default value and source to all fields to ensure
    frontend compatibility.
    """
    materialized = copy.deepcopy(template)

    for section in materialized["sections"]:
        section["fields"] = [_materialize_field(field) for field in section["fields"]]

    return materialized


def get_template(sector: str, subsector: str | None = None) -> dict:
    """
    Get best matching template with guaranteed fallback.

    Selection priority:
    1. Exact match: (sector, subsector) if subsector provided
    2. Sector match: (sector, None)
    3. Base template: Always available fallback

    Performance: O(1) - simple dict lookups, no inheritance resolution

    Args:
        sector: Project sector (e.g., "industrial", "municipal")
        subsector: Optional subsector (e.g., "oil_gas", "food_processing")

    Returns:
        Complete template dict with sections and fields (deep copy)

    Examples:
        >>> # Exact match
        >>> template = get_template("industrial", "oil_gas")
        >>> template["name"]
        'Oil & Gas Water Treatment'

        >>> # Sector fallback (subsector not found)
        >>> template = get_template("industrial", "unknown")
        >>> template["name"]
        'Industrial Water Treatment'

        >>> # Base fallback (sector not found)
        >>> template = get_template("unknown", None)
        >>> template["name"]
        'Base Water Treatment Template'
    """
    # Try exact match first
    template = None
    template_source = "base"

    if subsector:
        template = TEMPLATES.get((sector, subsector))
        if template:
            template_source = f"{sector}/{subsector}"
            logger.debug(f"Template exact match: {template_source}")

    # Fallback to sector-only
    if not template:
        template = TEMPLATES.get((sector, None))
        if template:
            template_source = f"{sector}"
            logger.debug(f"Template sector fallback: {template_source}")

    # Final fallback to base
    if not template:
        template = BASE_TEMPLATE
        logger.debug(f"Template base fallback (sector={sector}, subsector={subsector})")

    # Materialize with frontend-compatible fields (adds value and source)
    result = _materialize_template(template)

    logger.info(
        f"Selected template: {result['name']} "
        f"(source: {template_source}, sector={sector}, subsector={subsector})"
    )

    return result


def list_available_templates() -> list[dict]:
    """
    Get list of all available templates.

    Useful for:
    - Admin UI showing available templates
    - API endpoint listing templates
    - Documentation generation

    Returns:
        List of template metadata dicts

    Example:
        >>> templates = list_available_templates()
        >>> for t in templates:
        ...     print(f"{t['name']} ({t['sector']}/{t['subsector']})")
    """
    result = []

    # Base template (always available)
    result.append(
        {
            "sector": None,
            "subsector": None,
            "name": BASE_TEMPLATE["name"],
            "description": BASE_TEMPLATE["description"],
            "sections_count": len(BASE_TEMPLATE["sections"]),
            "total_fields": sum(len(s["fields"]) for s in BASE_TEMPLATE["sections"]),
            "is_base": True,
        }
    )

    # Registered templates
    for (sector, subsector), template in sorted(TEMPLATES.items()):
        result.append(
            {
                "sector": sector,
                "subsector": subsector,
                "name": template["name"],
                "description": template["description"],
                "sections_count": len(template["sections"]),
                "total_fields": sum(len(s["fields"]) for s in template["sections"]),
                "is_base": False,
            }
        )

    return result


def get_template_stats() -> dict:
    """
    Get statistics about template system.

    Useful for:
    - Health checks
    - Monitoring dashboards
    - System documentation

    Returns:
        Dict with counts and statistics

    Example:
        >>> stats = get_template_stats()
        >>> print(f"Total templates: {stats['total']}")
    """
    templates = list_available_templates()

    return {
        "total": len(templates),
        "base": 1,
        "registered": len(templates) - 1,
        "sectors": len(set(t["sector"] for t in templates if t["sector"])),
        "subsectors": len([t for t in templates if t["subsector"]]),
        "total_sections": sum(t["sections_count"] for t in templates),
        "total_fields": sum(t["total_fields"] for t in templates),
        "templates": templates,
    }


def validate_template_structure(template: dict) -> list[str]:
    """
    Validate template has correct structure.

    Useful for:
    - Testing new templates before adding to registry
    - Runtime validation in development
    - CI checks

    Args:
        template: Template dict to validate

    Returns:
        List of validation errors (empty if valid)

    Example:
        >>> errors = validate_template_structure(my_template)
        >>> if errors:
        ...     print(f"Invalid: {errors}")
    """
    errors = []

    # Required top-level keys
    if "name" not in template:
        errors.append("Missing required key: 'name'")
    if "description" not in template:
        errors.append("Missing required key: 'description'")
    if "sections" not in template:
        errors.append("Missing required key: 'sections'")
        return errors  # Can't continue without sections

    # Validate sections
    if not isinstance(template["sections"], list):
        errors.append("'sections' must be a list")
        return errors

    if len(template["sections"]) == 0:
        errors.append("Template must have at least one section")

    # Validate each section
    for i, section in enumerate(template["sections"]):
        if "id" not in section:
            errors.append(f"Section {i}: Missing 'id'")
        if "title" not in section:
            errors.append(f"Section {i}: Missing 'title'")
        if "fields" not in section:
            errors.append(f"Section {i}: Missing 'fields'")
            continue

        # Validate fields
        if not isinstance(section["fields"], list):
            errors.append(f"Section {i} ({section.get('id', 'unknown')}): 'fields' must be a list")
            continue

        if len(section["fields"]) == 0:
            errors.append(
                f"Section {i} ({section.get('id', 'unknown')}): Must have at least one field"
            )

        for j, field in enumerate(section["fields"]):
            if "id" not in field:
                errors.append(f"Section {i}, Field {j}: Missing 'id'")

    return errors
