"""Field catalog module for intake agents.

Provides field registry, catalog formatting, suggestion normalization,
and field value application logic.
"""

from dataclasses import dataclass
from typing import Any

import structlog

from app.templates.assessment_questionnaire import get_assessment_questionnaire

logger = structlog.get_logger(__name__)


@dataclass
class FieldRegistryItem:
    """Registry entry for a questionnaire field."""

    section_id: str
    section_title: str
    field_id: str
    field_label: str
    field_type: str  # "text" | "tags" | "textarea" | "combobox" | "number"


# Fields that accept multiple values (should collect all, not dedupe)
MULTI_VALUE_FIELDS = {
    "waste-types",
    "current-practices",
    "storage-infrastructure",
    "constraints",
    "primary-objectives",
    "volume-per-category",
}


def normalize_field_id(field_id: str) -> str:
    """Normalize field_id for registry lookup.

    Handles common LLM output variations:
    - Strips whitespace
    - Removes quotes/backticks
    - Converts underscores to dashes
    - Lowercases for comparison
    - Removes trailing punctuation (colons, periods, commas)

    Examples:
        "waste_types" → "waste-types"
        "Waste-Types:" → "waste-types"
        "`pain-points`" → "pain-points"
        " waste-types: " → "waste-types"
    """
    if not field_id:
        return ""
    # Order matters: strip spaces, then quotes, then transform, then trailing punct
    result = field_id.strip()
    # Remove surrounding quotes/backticks (may have multiple layers)
    result = result.strip("\"`'")
    result = result.lower()
    result = result.replace("_", "-")
    # Final cleanup: trailing punctuation AND any remaining quotes
    result = result.rstrip(" :.,`\"'")
    return result


def build_questionnaire_registry() -> dict[str, FieldRegistryItem]:
    """Build a flat registry of all fields from the questionnaire template.

    Returns:
        Dictionary mapping field_id to FieldRegistryItem with type metadata.
    """
    registry: dict[str, FieldRegistryItem] = {}

    questionnaire = get_assessment_questionnaire()
    for section in questionnaire:
        section_id = section.get("id", "")
        section_title = section.get("title", "")

        for field in section.get("fields", []):
            field_id = field.get("id")
            if not field_id:
                continue

            registry[field_id] = FieldRegistryItem(
                section_id=section_id,
                section_title=section_title,
                field_id=field_id,
                field_label=field.get("label", ""),
                field_type=field.get("type", "text"),
            )

    return registry


def format_catalog_for_prompt(registry: dict[str, FieldRegistryItem]) -> str:
    """Format registry as a catalog string for AI prompts.

    Format:
        CATALOG_VERSION=1
        LANGUAGE=EN

        - field_id: waste-types
          section: "1. Waste Generation Details" (waste-generation)
          label: "Type of Waste Generated"
          type: combobox

    Args:
        registry: Field registry dictionary

    Returns:
        Formatted catalog string
    """
    lines = ["CATALOG_VERSION=1", "LANGUAGE=EN", ""]

    # Sort by section title, then field label for stable output
    items = sorted(
        registry.values(),
        key=lambda item: (item.section_title, item.field_label),
    )

    for item in items:
        lines.append(f"- field_id: {item.field_id}")
        lines.append(f'  section: "{item.section_title}" ({item.section_id})')
        lines.append(f'  label: "{item.field_label}"')
        lines.append(f"  type: {item.field_type}")
        lines.append("")

    return "\n".join(lines)


def apply_suggestion(
    field_type: str,
    value: Any,
) -> Any:
    """Parse and normalize a suggestion value based on field type.

    Args:
        field_type: Field type from registry
        value: Raw value from suggestion

    Returns:
        Normalized value appropriate for the field type
    """
    if value is None:
        return None

    # Tags fields: split comma-separated strings into list
    if field_type == "tags" and isinstance(value, str):
        items = [item.strip() for item in value.split(",")]
        return [item for item in items if item]  # Drop empties

    # Text/textarea: ensure string
    if field_type in ("text", "textarea") and not isinstance(value, str):
        return str(value)

    # Number: try to parse
    if field_type == "number" and isinstance(value, str):
        try:
            # Try int first, then float
            if "." in value:
                return float(value)
            return int(value)
        except ValueError:
            return value  # Keep as string if can't parse

    return value


def get_field_type(field_id: str, registry: dict[str, FieldRegistryItem]) -> str:
    """Get the type of a field from the registry.

    Args:
        field_id: Field identifier
        registry: Field registry

    Returns:
        Field type or "text" if not found
    """
    item = registry.get(field_id)
    return item.field_type if item else "text"
