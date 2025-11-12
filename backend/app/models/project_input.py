"""
Project Input Models - Data that flows FROM user TO AI agent.

This module contains flexible Pydantic models for user-provided project data:
- Dynamic technical sections with custom fields
- User-defined contaminants and parameters
- Flexible regulations and notes

Best practices:
- 100% dynamic field structure (no hardcoding)
- Type-safe serialization for AI agents
- Supports any industry/sector
"""

from typing import Optional, List, Dict, Any
from pydantic import Field, ConfigDict, field_validator
from app.schemas.common import BaseSchema
import logging

logger = logging.getLogger(__name__)


class DynamicField(BaseSchema):
    """
    Represents a single dynamic technical field (e.g., a contaminant, parameter).

    Supports any field the user adds:
    - Water quality: "Cromo Hexavalente", "Arsénico Total"
    - Regulations: "NOM-001-SEMARNAT-2021"
    - Notes: "Observaciones de campo"

    Attributes:
        id: Unique identifier (e.g., "cromo-hexavalente")
        label: Human-readable name (e.g., "Cromo Hexavalente")
        value: The actual value (number, text, etc.)
        unit: Optional unit (e.g., "mg/L", "NMP/100mL")
        type: Field type (text, number, unit, select)
        source: How data was entered (manual, imported, ai)
        importance: Priority level (critical, recommended, optional)
        notes: Optional engineer's notes providing context for this field
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(description="Unique field identifier")
    label: str = Field(description="Human-readable field name")
    value: Any = Field(description="Field value (flexible type)")
    unit: Optional[str] = Field(default=None, description="Unit of measurement")
    type: str = Field(default="text", description="Field type: text, number, unit, select")
    source: str = Field(default="manual", description="Data source: manual, imported, ai")
    importance: Optional[str] = Field(
        default=None, description="Priority: critical, recommended, optional"
    )
    notes: Optional[str] = Field(default=None, description="Engineer's notes for this field")

    def format_value(self) -> str:
        """Format value with unit for display."""
        if self.value is None or self.value == "":
            return ""
        if self.unit:
            return f"{self.value} {self.unit}"
        return str(self.value)


class DynamicSection(BaseSchema):
    """
    Represents a section containing multiple dynamic fields.

    Examples:
    - "Calidad de Agua" with custom contaminants
    - "Normas Aplicables" with regulation references
    - "Observaciones" with field notes

    Attributes:
        id: Section identifier (e.g., "water-quality")
        title: Section name (e.g., "Calidad de Agua")
        description: Optional description
        fields: List of dynamic fields in this section
        notes: Optional section-level notes
    """

    model_config = ConfigDict(str_strip_whitespace=True)

    id: str = Field(description="Section identifier")
    title: str = Field(description="Section title")
    description: Optional[str] = Field(default=None, description="Section description")
    fields: List[DynamicField] = Field(default_factory=list, description="Fields in this section")
    notes: Optional[str] = Field(default=None, description="Section notes")

    @field_validator("fields", mode="before")
    @classmethod
    def convert_field_dicts(cls, v: Any) -> List[DynamicField]:
        """Convert dict representations to DynamicField instances."""
        if isinstance(v, list):
            return [DynamicField(**item) if isinstance(item, dict) else item for item in v]
        return v


class FlexibleWaterProjectData(BaseSchema):
    """
    100% flexible model for water project data (INPUT to AI agent).

    Designed to handle any technical data structure the user creates,
    without hardcoding specific contaminants or parameters.

    This model serves as structured input to Pydantic-AI agents for
    proposal generation.

    Attributes:
        project_name: Project name
        client: Client/company name
        sector: Industry sector
        location: Project location
        budget: Optional project budget
        technical_sections: Dynamic sections with user-defined fields
        notes: General project notes
        regulations: List of applicable regulations
        field_observations: Field visit observations
    """

    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
    )

    # Project metadata
    project_name: str = Field(description="Project name")
    client: str = Field(description="Client/company name")
    sector: str = Field(description="Industry sector")
    subsector: Optional[str] = Field(default=None, description="Industry subsector")
    location: str = Field(description="Project location")
    budget: Optional[float] = Field(default=None, description="Project budget in USD")

    # Dynamic technical data (the key part!)
    technical_sections: List[DynamicSection] = Field(
        default_factory=list, description="User-defined technical sections with custom fields"
    )

    # Additional context
    notes: Optional[str] = Field(default=None, description="General notes")
    regulations: Optional[List[str]] = Field(default=None, description="Applicable regulations")
    field_observations: Optional[str] = Field(default=None, description="Field observations")

    @classmethod
    def from_project_jsonb(cls, project) -> "FlexibleWaterProjectData":
        """
        Create instance from Project model with JSONB data.

        Args:
            project: SQLAlchemy Project instance with project_data JSONB field

        Returns:
            FlexibleWaterProjectData instance

        Example:
            >>> project = await db.get(Project, project_id)
            >>> water_data = FlexibleWaterProjectData.from_project_jsonb(project)
        """
        data = project.project_data or {}
        sections_data = data.get("technical_sections", [])

        # Convert raw dicts to DynamicSection instances
        sections = [
            DynamicSection(**section_dict) if isinstance(section_dict, dict) else section_dict
            for section_dict in sections_data
        ]

        return cls(
            project_name=project.name,
            client=project.client,
            sector=project.sector,
            subsector=project.subsector,
            location=project.location,
            budget=project.budget,
            technical_sections=sections,
            notes=data.get("notes"),
            regulations=data.get("regulations"),
            field_observations=data.get("field_observations"),
        )

    def to_ai_prompt_format(self) -> str:
        """
        Format data as structured text for AI agent consumption.

        Returns:
            Markdown-formatted string with all technical data

        Example output:
            # PROYECTO: Sistema de Tratamiento XYZ
            Cliente: Industria ABC
            Sector: Industrial

            ## Calidad de Agua
            - **Cromo Hexavalente**: 0.05 mg/L
            - **Arsénico Total**: 0.01 mg/L

            ## Normas Aplicables
            - **Norma**: NOM-001-SEMARNAT-2021
        """
        output = []

        # Header
        output.append(f"# PROYECTO: {self.project_name}")
        output.append(f"**Cliente:** {self.client}")
        output.append(f"**Sector:** {self.sector}")
        output.append(f"**Ubicación:** {self.location}")
        if self.budget:
            output.append(f"**Presupuesto:** ${self.budget:,.2f} USD")
        output.append("")

        # Technical sections
        for section in self.technical_sections:
            output.append(f"## {section.title}")
            if section.description:
                output.append(f"_{section.description}_\n")

            # Fields
            for field in section.fields:
                if field.value is not None and field.value != "":
                    formatted_value = field.format_value()
                    output.append(f"- **{field.label}**: {formatted_value}")

            # Section notes
            if section.notes:
                output.append(f"\n_Notas de sección: {section.notes}_")
            output.append("")

        # Additional context
        if self.regulations:
            output.append("## regulations norms")
            for reg in self.regulations:
                output.append(f"- {reg}")
            output.append("")

        if self.field_observations:
            output.append("## Field Observations")
            output.append(self.field_observations)
            output.append("")

        if self.notes:
            output.append("## General Notes")
            output.append(self.notes)

        return "\n".join(output)

    def count_fields(self) -> int:
        """Count total number of fields across all sections."""
        return sum(len(section.fields) for section in self.technical_sections)

    def count_filled_fields(self) -> int:
        """Count fields with non-empty values."""
        count = 0
        for section in self.technical_sections:
            for field in section.fields:
                if field.value is not None and field.value != "":
                    count += 1
        return count

    def to_ai_context(self) -> Dict[str, Any]:
        """
        Extract ONLY AI-relevant data without UI metadata.

        This method removes all frontend-specific metadata (id, type, source, importance)
        and returns a clean, minimal dict suitable for AI consumption.

        Design principles:
        - Remove UI concerns (field IDs, types, etc.)
        - Keep user's section organization
        - Extract only: label + value + unit + notes (if provided)
        - Skip empty values to reduce noise
        - Include engineer's notes inline for critical context

        Returns:
            Clean dict with:
            - Basic project info (name, client, sector, location)
            - Technical sections grouped as user created them
            - Each field as simple "label": "value unit" pair

        Example:
            >>> water_data = FlexibleWaterProjectData(...)
            >>> context = water_data.to_ai_context()
            >>> print(context)
            {
                "project_name": "Planta Sinaloa",
                "sector": "Industrial",
                "Water Quality": {
                    "BOD": "450 mg/L (nota: Medido en temporada alta)",
                    "COD": "850 mg/L"
                }
            }

        Note:
            - This is for AI agent consumption only
            - For frontend/API use model_dump() instead
            - Reduces token count by ~85% vs full serialization
        """
        # Basic project metadata
        context: Dict[str, Any] = {
            "project_name": self.project_name,
            "client": self.client,
            "sector": self.sector,
            "subsector": self.subsector,
            "location": self.location,
        }

        # Add budget if specified
        if self.budget and self.budget > 0:
            context["budget_usd"] = self.budget

        # Extract technical sections with clean field values
        for section in self.technical_sections:
            section_data = {}

            for field in section.fields:
                # Skip empty/null values
                if field.value in [None, "", []]:
                    continue

                # Format value based on type
                if isinstance(field.value, list):
                    # Join array values: ["A", "B"] -> "A, B"
                    formatted_value = ", ".join(str(v) for v in field.value)
                elif isinstance(field.value, dict):
                    # Rare case: nested objects -> JSON string
                    formatted_value = str(field.value)
                else:
                    # Standard: convert to string
                    formatted_value = str(field.value)

                # Append unit if exists
                if field.unit:
                    formatted_value = f"{formatted_value} {field.unit}"

                # Append engineer's notes if provided (critical context)
                # Use getattr for safe access (notes may not exist in all field types)
                field_notes = getattr(field, "notes", None)
                if field_notes:
                    formatted_value = f"{formatted_value} (nota: {field_notes})"

                # Add to section using field label as key
                section_data[field.label] = formatted_value

            # Only include section if it has data
            if section_data:
                context[section.title] = section_data

        # Optional: Add notes if they exist
        if self.notes:
            context["notes"] = self.notes

        if self.regulations:
            context["regulations"] = self.regulations

        if self.field_observations:
            context["field_observations"] = self.field_observations

        return context

    @staticmethod
    def format_ai_context_to_string(context: Dict[str, Any]) -> str:
        """
        Format clean context dict into readable markdown string for AI prompts.

        Takes the output from to_ai_context() and creates a well-structured
        markdown string that's easy for LLMs to parse and understand.

        Args:
            context: Dict from to_ai_context() method

        Returns:
            Markdown-formatted string ready for AI prompt injection

        Example:
            >>> context = water_data.to_ai_context()
            >>> formatted = FlexibleWaterProjectData.format_ai_context_to_string(context)
            >>> print(formatted)
            PROJECT OVERVIEW:
            Project Name: Planta Sinaloa
            Client: juan manuel
            Sector: Industrial

            WATER QUALITY:
            - BOD: 450 mg/L
            - COD: 850 mg/L

        Design:
        - Clear section headers in UPPERCASE
        - Consistent formatting with bullets
        - Respects user's section organization
        - Easy for LLMs to parse
        """
        lines = []

        # === BASIC PROJECT INFO ===
        lines.append("PROJECT OVERVIEW:")

        # Define which fields go in overview
        basic_fields = ["project_name", "client", "sector", "location", "budget_usd"]

        for field_key in basic_fields:
            if field_key in context:
                # Format label (project_name -> Project Name)
                label = field_key.replace("_", " ").title()

                # Format value
                value = context[field_key]
                if field_key == "budget_usd":
                    lines.append(f"Budget: ${value:,.2f} USD")
                else:
                    lines.append(f"{label}: {value}")

        lines.append("")  # Empty line for readability

        # === TECHNICAL SECTIONS ===
        # These are all keys that aren't basic info or special fields
        exclude_keys = set(basic_fields + ["notes", "regulations", "field_observations"])

        for section_title, section_data in context.items():
            # Skip if this is a basic info field or special field
            if section_title in exclude_keys:
                continue

            # Only process if it's a dict (actual section with fields)
            if isinstance(section_data, dict):
                lines.append(f"{section_title.upper()}:")
                for field_label, field_value in section_data.items():
                    lines.append(f"- {field_label}: {field_value}")
                lines.append("")  # Empty line after each section

        # === OPTIONAL FIELDS AT END ===
        if "regulations" in context and context["regulations"]:
            lines.append("APPLICABLE REGULATIONS:")
            for reg in context["regulations"]:
                lines.append(f"- {reg}")
            lines.append("")

        if "field_observations" in context:
            lines.append("FIELD OBSERVATIONS:")
            lines.append(context["field_observations"])
            lines.append("")

        if "notes" in context:
            lines.append("NOTES:")
            lines.append(context["notes"])

        return "\n".join(lines)
