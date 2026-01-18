"""
Simple template system for H2O Allegiant.

Templates are materialized (no inheritance), stored in code for simplicity.
Each template defines complete section structures with field IDs.

Usage:
    from app.templates import get_template

    template = get_template("industrial", "oil_gas")
    sections = template["sections"]
"""

from .helpers import get_template, list_available_templates
from .registry import BASE_TEMPLATE, TEMPLATES

__all__ = [
    "BASE_TEMPLATE",
    "TEMPLATES",
    "get_template",
    "list_available_templates",
]
