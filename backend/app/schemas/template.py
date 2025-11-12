"""
Template schemas for API requests and responses.

Pydantic models for template CRUD operations.
Follows camelCase conversion from BaseSchema for frontend compatibility.
"""

from typing import List, Dict, Any, Optional, Literal
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict

from app.schemas.common import BaseSchema


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# NESTED SCHEMAS (Used in template sections)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class FieldOverride(BaseModel):
    """
    Override configuration for a specific field.

    Allows templates to customize field behavior without changing
    the core parameter definition in frontend library.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    default_value: Any = Field(
        default=None,
        alias="defaultValue",
        description="Override default value for this field"
    )
    importance: Optional[Literal["optional", "recommended", "critical"]] = Field(
        default=None,
        description="Override importance level"
    )
    required: Optional[bool] = Field(
        default=None,
        description="Override required flag"
    )
    placeholder: Optional[str] = Field(
        default=None,
        description="Override placeholder text"
    )
    description: Optional[str] = Field(
        default=None,
        description="Override field description"
    )


class SectionConfig(BaseModel):
    """
    Section configuration within a template.

    Defines how to build or modify a section.
    Contains ONLY field IDs (not metadata - that comes from frontend).
    """

    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    id: str = Field(
        ...,
        description="Section identifier (must be unique within template)",
        min_length=1,
        max_length=100
    )

    # Operation for merging (only used when extending)
    operation: Literal["extend", "replace", "remove"] = Field(
        default="extend",
        description="How to handle this section when merging with parent"
    )

    # Field IDs to add (references to frontend parameter library)
    add_fields: List[str] = Field(
        default_factory=list,
        alias="addFields",
        description="Field IDs to add from parameter library"
    )

    # Field IDs to remove (when extending)
    remove_fields: List[str] = Field(
        default_factory=list,
        alias="removeFields",
        description="Field IDs to remove from parent template"
    )

    # Override default values for specific fields
    field_overrides: Dict[str, FieldOverride] = Field(
        default_factory=dict,
        alias="fieldOverrides",
        description="Custom overrides for specific fields"
    )

    # Section metadata (for new sections)
    title: Optional[str] = Field(
        default=None,
        description="Section title (required if new section)"
    )

    description: Optional[str] = Field(
        default=None,
        description="Section description"
    )

    allow_custom_fields: bool = Field(
        default=True,
        alias="allowCustomFields",
        description="Allow users to add custom fields"
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# REQUEST SCHEMAS (for creating/updating templates)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class TemplateCreateRequest(BaseModel):
    """
    Request schema for creating a new template.

    Admin-only operation.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    slug: str = Field(
        ...,
        description="URL-safe identifier (e.g., 'industrial-food')",
        min_length=1,
        max_length=255,
        pattern=r"^[a-z0-9-]+$"
    )

    name: str = Field(
        ...,
        description="Human-readable name",
        min_length=1,
        max_length=255
    )

    description: Optional[str] = Field(
        default=None,
        description="Template description"
    )

    sector: Optional[str] = Field(
        default=None,
        description="Target sector: municipal, industrial, commercial, residential",
        max_length=100
    )

    subsector: Optional[str] = Field(
        default=None,
        description="Target subsector (e.g., oil_gas, food_processing)",
        max_length=100
    )

    extends_slug: Optional[str] = Field(
        default=None,
        alias="extendsSlug",
        description="Parent template slug for inheritance"
    )

    sections: List[SectionConfig] = Field(
        ...,
        description="Section configurations with field IDs",
        min_length=1
    )

    icon: Optional[str] = Field(
        default=None,
        description="Emoji or icon identifier",
        max_length=50
    )

    tags: List[str] = Field(
        default_factory=list,
        description="Searchable tags"
    )

    complexity: Literal["simple", "standard", "advanced"] = Field(
        default="standard",
        description="Template complexity level"
    )

    estimated_time: Optional[int] = Field(
        default=None,
        alias="estimatedTime",
        description="Estimated minutes to complete",
        ge=0
    )


class TemplateUpdateRequest(BaseModel):
    """
    Request schema for updating a template.

    Creates a new version when updated.
    Admin-only operation.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        str_strip_whitespace=True,
    )

    name: Optional[str] = Field(
        default=None,
        description="Human-readable name",
        min_length=1,
        max_length=255
    )

    description: Optional[str] = Field(
        default=None,
        description="Template description"
    )

    sections: Optional[List[SectionConfig]] = Field(
        default=None,
        description="Updated section configurations"
    )

    is_active: Optional[bool] = Field(
        default=None,
        alias="isActive",
        description="Active templates shown in UI"
    )

    icon: Optional[str] = Field(
        default=None,
        description="Emoji or icon identifier"
    )

    tags: Optional[List[str]] = Field(
        default=None,
        description="Searchable tags"
    )

    complexity: Optional[Literal["simple", "standard", "advanced"]] = Field(
        default=None,
        description="Template complexity level"
    )

    estimated_time: Optional[int] = Field(
        default=None,
        alias="estimatedTime",
        description="Estimated minutes to complete",
        ge=0
    )

    change_summary: Optional[str] = Field(
        default=None,
        alias="changeSummary",
        description="Summary of changes for version history"
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RESPONSE SCHEMAS (API responses)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


class TemplateResponse(BaseSchema):
    """
    Template summary response (for list views).

    Lightweight - no sections included.
    """

    id: UUID
    slug: str
    name: str
    description: Optional[str]
    sector: Optional[str]
    subsector: Optional[str]

    current_version: int = Field(..., alias="currentVersion")
    extends_slug: Optional[str] = Field(None, alias="extendsSlug")

    is_system: bool = Field(..., alias="isSystem")
    is_active: bool = Field(..., alias="isActive")

    icon: Optional[str]
    tags: List[str]
    complexity: str
    estimated_time: Optional[int] = Field(None, alias="estimatedTime")

    created_at: datetime = Field(..., alias="createdAt")
    updated_at: datetime = Field(..., alias="updatedAt")


class TemplateDetailResponse(TemplateResponse):
    """
    Template detail response (includes sections).

    Full template with all section configurations.
    """

    sections: List[SectionConfig]
    created_by: Optional[UUID] = Field(None, alias="createdBy")


class TemplateVersionResponse(BaseSchema):
    """
    Template version history response.
    """

    id: UUID
    template_id: UUID = Field(..., alias="templateId")
    version_number: int = Field(..., alias="versionNumber")
    sections: List[SectionConfig]
    change_summary: Optional[str] = Field(None, alias="changeSummary")
    created_by: Optional[UUID] = Field(None, alias="createdBy")
    created_at: datetime = Field(..., alias="createdAt")


class ApplyTemplateRequest(BaseModel):
    """
    Request to apply template to a project.
    """

    model_config = ConfigDict(populate_by_name=True)

    template_id: UUID = Field(..., alias="templateId")
    mode: Literal["replace", "merge"] = Field(
        default="replace",
        description="How to apply: replace all data or merge with existing"
    )


class ApplyTemplateResponse(BaseSchema):
    """
    Response after applying template to project.
    """

    message: str
    project_id: UUID = Field(..., alias="projectId")
    template_slug: str = Field(..., alias="templateSlug")
    template_version: int = Field(..., alias="templateVersion")
    sections_count: int = Field(..., alias="sectionsCount")
    fields_count: int = Field(..., alias="fieldsCount")
