import copy
import uuid

import pytest
from conftest import (
    create_company,
    create_location,
    create_org,
    create_project,
    create_user,
)
from httpx import AsyncClient
from sqlalchemy import select

from app.models.file import ProjectFile
from app.models.intake_note import IntakeNote
from app.models.intake_suggestion import IntakeSuggestion
from app.models.user import UserRole
from app.services.intake_ingestion_service import IntakeIngestionService
from app.templates.assessment_questionnaire import get_assessment_questionnaire


def _first_field():
    questionnaire = get_assessment_questionnaire()
    section = questionnaire[0]
    field = section["fields"][0]
    return section, field, questionnaire


@pytest.mark.asyncio
async def test_ingestion_download_failure_marks_failed(db_session, monkeypatch):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Ingest Fail", f"org-ingest-fail-{uid}")
    user = await create_user(
        db_session,
        email=f"ingest-fail-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Ingest Fail Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Ingest Fail Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Ingest Fail Project",
    )

    file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="fail.pdf",
        file_path="projects/fail.pdf",
        file_size=10,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
        processing_status="processing",
        processing_attempts=1,
    )
    db_session.add(file)
    await db_session.commit()
    await db_session.refresh(file)

    async def _boom(_: str) -> bytes:
        raise RuntimeError("download failed")

    import app.services.intake_ingestion_service as ingestion_module

    monkeypatch.setattr(ingestion_module, "download_file_content", _boom)

    service = IntakeIngestionService()
    with pytest.raises(RuntimeError):
        await service.process_file(db_session, file)

    await db_session.refresh(file)
    assert file.processing_status == "failed"
    assert file.processing_error
    assert file.processed_at is not None


@pytest.mark.asyncio
async def test_intake_notes_upsert(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Intake", "org-intake")
    user = await create_user(
        db_session,
        email=f"intake-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Intake Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Intake"
    )
    project = await create_project(
        db_session, org_id=org.id, user_id=user.id, location_id=location.id, name="Intake"
    )

    set_current_user(user)

    response = await client.patch(
        f"/api/v1/projects/{project.id}/intake/notes",
        json={"text": "First note"},
    )
    assert response.status_code == 200

    response = await client.patch(
        f"/api/v1/projects/{project.id}/intake/notes",
        json={"text": "Second note"},
    )
    assert response.status_code == 200

    result = await db_session.execute(
        select(IntakeNote).where(
            IntakeNote.project_id == project.id,
            IntakeNote.organization_id == org.id,
        )
    )
    notes = result.scalars().all()
    assert len(notes) == 1
    assert notes[0].text == "Second note"


@pytest.mark.asyncio
async def test_apply_reject_and_auto_reject(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Apply", "org-apply")
    user = await create_user(
        db_session,
        email=f"apply-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Apply Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Apply")
    project = await create_project(
        db_session, org_id=org.id, user_id=user.id, location_id=location.id, name="Apply"
    )

    section, field, questionnaire = _first_field()
    project.project_data = {"technical_sections": copy.deepcopy(questionnaire)}
    await db_session.commit()

    suggestion1 = IntakeSuggestion(
        organization_id=org.id,
        project_id=project.id,
        source_file_id=None,
        field_id=field["id"],
        field_label=field["label"],
        section_id=section["id"],
        section_title=section["title"],
        value="Applied value",
        value_type="string",
        unit=None,
        confidence=90,
        status="pending",
        source="notes",
        evidence=None,
        created_by_user_id=user.id,
    )
    suggestion2 = IntakeSuggestion(
        organization_id=org.id,
        project_id=project.id,
        source_file_id=None,
        field_id=field["id"],
        field_label=field["label"],
        section_id=section["id"],
        section_title=section["title"],
        value="Sibling value",
        value_type="string",
        unit=None,
        confidence=80,
        status="pending",
        source="notes",
        evidence=None,
        created_by_user_id=user.id,
    )
    db_session.add_all([suggestion1, suggestion2])
    await db_session.commit()

    set_current_user(user)
    response = await client.patch(
        f"/api/v1/projects/{project.id}/intake/suggestions/{suggestion1.id}",
        json={"status": "applied"},
    )
    assert response.status_code == 200

    refreshed = await db_session.get(IntakeSuggestion, suggestion2.id)
    assert refreshed.status == "rejected"


# ============================================================================
# Field Catalog Tests (New)
# ============================================================================


def test_build_questionnaire_registry_includes_field_type():
    """Test that field registry includes field_type metadata."""
    from app.services.intake_field_catalog import build_questionnaire_registry
    registry = build_questionnaire_registry()

    # Check that we have fields
    assert len(registry) > 0

    # Check that field_type is included
    for item in registry.values():
        assert item.field_type is not None
        assert item.field_type in ["text", "tags", "textarea", "combobox", "number", "radio"]


def test_format_catalog_for_prompt_structure():
    """Test that catalog format includes type information."""
    from app.services.intake_field_catalog import (
        build_questionnaire_registry,
        format_catalog_for_prompt,
    )
    registry = build_questionnaire_registry()
    catalog = format_catalog_for_prompt(registry)

    # Check header
    assert "CATALOG_VERSION=1" in catalog
    assert "LANGUAGE=EN" in catalog

    # Check field entries have type
    assert "type:" in catalog

    # Check specific fields exist
    assert "field_id:" in catalog
    assert "section:" in catalog
    assert "label:" in catalog


def test_normalize_suggestions_drops_unknown_field_ids():
    """Test that suggestions with unknown field_ids are moved to unmapped."""
    from app.services.intake_field_catalog import (
        build_questionnaire_registry,
        normalize_suggestions,
    )
    registry = build_questionnaire_registry()

    suggestions = [
        {"field_id": "waste-types", "value": "Plastic", "confidence": 90},
        {"field_id": "unknown-field-xyz", "value": "Some value", "confidence": 80},
    ]

    valid, unmapped = normalize_suggestions(suggestions, registry, source="test")

    # Should only have 1 valid suggestion
    assert len(valid) == 1
    assert valid[0]["field_id"] == "waste-types"

    # Unknown field should be in unmapped
    assert len(unmapped) == 1
    assert "unknown-field-xyz" in unmapped[0].get("reason", "")


def test_normalize_suggestions_dedupes_single_value_fields():
    """Test that single-value fields keep only highest confidence suggestion."""
    from app.services.intake_field_catalog import (
        build_questionnaire_registry,
        normalize_suggestions,
    )
    registry = build_questionnaire_registry()

    # Pick a single-value field (not in MULTI_VALUE_FIELDS)
    single_value_field = "waste-description"
    if single_value_field not in registry:
        # Skip if field doesn't exist
        return

    suggestions = [
        {"field_id": single_value_field, "value": "First value", "confidence": 70},
        {"field_id": single_value_field, "value": "Better value", "confidence": 90},
        {"field_id": single_value_field, "value": "Worse value", "confidence": 60},
    ]

    valid, unmapped = normalize_suggestions(suggestions, registry, source="test")

    # Should only have 1 valid suggestion (highest confidence)
    assert len(valid) == 1
    assert valid[0]["value"] == "Better value"
    assert valid[0]["confidence"] == 90

    # Lower confidence ones should be unmapped
    assert len(unmapped) == 2


def test_normalize_suggestions_collects_multi_value_fields():
    """Test that multi-value fields collect all suggestions."""
    from app.services.intake_field_catalog import (
        build_questionnaire_registry,
        normalize_suggestions,
    )
    registry = build_questionnaire_registry()

    # Use a known multi-value field
    multi_field = "current-practices"
    if multi_field not in registry:
        # Skip if field doesn't exist
        return

    suggestions = [
        {"field_id": multi_field, "value": "Storage", "confidence": 90},
        {"field_id": multi_field, "value": "Recycling", "confidence": 85},
        {"field_id": multi_field, "value": "Neutralization", "confidence": 80},
    ]

    valid, unmapped = normalize_suggestions(suggestions, registry, source="test")

    # Should have all 3 suggestions
    assert len(valid) == 3
    values = {s["value"] for s in valid}
    assert values == {"Storage", "Recycling", "Neutralization"}

    # No unmapped
    assert len(unmapped) == 0


def test_apply_suggestion_parses_tags():
    """Test that apply_suggestion correctly parses tags fields."""
    from app.services.intake_field_catalog import apply_suggestion
    # Test comma-separated string
    result = apply_suggestion("tags", "Storage, Recycling, Neutralization")
    assert result == ["Storage", "Recycling", "Neutralization"]

    # Test with extra spaces
    result = apply_suggestion("tags", "  Storage  ,  Recycling  ")
    assert result == ["Storage", "Recycling"]

    # Test empty values are dropped
    result = apply_suggestion("tags", "Storage,, ,Recycling")
    assert result == ["Storage", "Recycling"]


def test_apply_suggestion_handles_other_types():
    """Test that apply_suggestion handles other field types correctly."""
    from app.services.intake_field_catalog import apply_suggestion
    # Text field - ensure string
    assert apply_suggestion("text", 123) == "123"
    assert apply_suggestion("text", "hello") == "hello"

    # Textarea field - ensure string
    assert apply_suggestion("textarea", 456) == "456"

    # Number field - parse numbers
    assert apply_suggestion("number", "42") == 42
    assert apply_suggestion("number", "3.14") == 3.14
    assert apply_suggestion("number", "not a number") == "not a number"  # Falls back to string

    # Combobox - pass through
    assert apply_suggestion("combobox", "value") == "value"
