import copy
import uuid
from typing import cast

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
from app.models.intake_unmapped_note import IntakeUnmappedNote
from app.models.timeline import TimelineEvent
from app.models.user import UserRole
from app.schemas.intake import IntakeEvidence
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

    await db_session.refresh(project)
    sections = project.project_data.get("technical_sections", [])
    assert isinstance(sections, list)
    sections = [sec for sec in sections if isinstance(sec, dict)]
    sections = cast(list[dict[str, object]], sections)
    applied_value = None
    for sec in sections:
        if sec.get("id") != section["id"]:
            continue
        fields = sec.get("fields", [])
        assert isinstance(fields, list)
        for f in fields:
            if not isinstance(f, dict):
                continue
            field_dict = cast(dict[str, object], f)
            if field_dict.get("id") == field["id"]:
                applied_value = field_dict.get("value")
                break
    assert applied_value == "Applied value"

    suggestion3 = IntakeSuggestion(
        organization_id=org.id,
        project_id=project.id,
        source_file_id=None,
        field_id=field["id"],
        field_label=field["label"],
        section_id=section["id"],
        section_title=section["title"],
        value="Reject me",
        value_type="string",
        unit=None,
        confidence=70,
        status="pending",
        source="notes",
        evidence=None,
        created_by_user_id=user.id,
    )
    db_session.add(suggestion3)
    await db_session.commit()

    response = await client.patch(
        f"/api/v1/projects/{project.id}/intake/suggestions/{suggestion3.id}",
        json={"status": "rejected"},
    )
    assert response.status_code == 200
    refreshed = await db_session.get(IntakeSuggestion, suggestion3.id)
    assert refreshed.status == "rejected"


@pytest.mark.asyncio
async def test_double_apply_returns_409(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Double", "org-double")
    user = await create_user(
        db_session,
        email=f"double-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Double Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Double"
    )
    project = await create_project(
        db_session, org_id=org.id, user_id=user.id, location_id=location.id, name="Double"
    )

    section, field, questionnaire = _first_field()
    project.project_data = {"technical_sections": copy.deepcopy(questionnaire)}
    await db_session.commit()

    suggestion = IntakeSuggestion(
        organization_id=org.id,
        project_id=project.id,
        source_file_id=None,
        field_id=field["id"],
        field_label=field["label"],
        section_id=section["id"],
        section_title=section["title"],
        value="Apply once",
        value_type="string",
        unit=None,
        confidence=90,
        status="pending",
        source="notes",
        evidence=None,
        created_by_user_id=user.id,
    )
    db_session.add(suggestion)
    await db_session.commit()

    set_current_user(user)
    response = await client.patch(
        f"/api/v1/projects/{project.id}/intake/suggestions/{suggestion.id}",
        json={"status": "applied"},
    )
    assert response.status_code == 200

    events_before = await db_session.execute(
        select(TimelineEvent).where(TimelineEvent.project_id == project.id)
    )
    events_count_before = len(events_before.scalars().all())

    response = await client.patch(
        f"/api/v1/projects/{project.id}/intake/suggestions/{suggestion.id}",
        json={"status": "applied"},
    )
    assert response.status_code == 409

    events_after = await db_session.execute(
        select(TimelineEvent).where(TimelineEvent.project_id == project.id)
    )
    events_count_after = len(events_after.scalars().all())
    assert events_count_after == events_count_before


@pytest.mark.asyncio
async def test_unmapped_map_and_dismiss(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Unmapped", "org-unmapped")
    user = await create_user(
        db_session,
        email=f"unmapped-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Unmapped Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Unmapped"
    )
    project = await create_project(
        db_session, org_id=org.id, user_id=user.id, location_id=location.id, name="Unmapped"
    )

    section, field, _ = _first_field()
    note = IntakeUnmappedNote(
        organization_id=org.id,
        project_id=project.id,
        extracted_text="Some unmapped text",
        confidence=60,
        source_file_id=None,
        source_file=None,
        status="open",
    )
    db_session.add(note)
    await db_session.commit()

    set_current_user(user)
    response = await client.post(
        f"/api/v1/projects/{project.id}/intake/unmapped-notes/{note.id}/map",
        json={
            "fieldId": field["id"],
            "sectionId": section["id"],
            "fieldLabel": field["label"],
            "sectionTitle": section["title"],
        },
    )
    assert response.status_code == 200

    refreshed_note = await db_session.get(IntakeUnmappedNote, note.id)
    assert refreshed_note.status == "mapped"
    assert refreshed_note.mapped_to_suggestion_id is not None

    note2 = IntakeUnmappedNote(
        organization_id=org.id,
        project_id=project.id,
        extracted_text="Dismiss me",
        confidence=40,
        source_file_id=None,
        source_file=None,
        status="open",
    )
    db_session.add(note2)
    await db_session.commit()

    response = await client.post(
        f"/api/v1/projects/{project.id}/intake/unmapped-notes/{note2.id}/dismiss"
    )
    assert response.status_code == 200
    refreshed_note2 = await db_session.get(IntakeUnmappedNote, note2.id)
    assert refreshed_note2.status == "dismissed"


@pytest.mark.asyncio
async def test_idempotency_skip(db_session):
    org = await create_org(db_session, "Org Idem", "org-idem")
    user = await create_user(
        db_session,
        email=f"idem-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Idem Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Idem")
    project = await create_project(
        db_session, org_id=org.id, user_id=user.id, location_id=location.id, name="Idem"
    )

    file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="already.pdf",
        file_path="/fake/path/already.pdf",
        file_size=1024,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
        processing_status="completed",
        processing_attempts=0,
        file_hash="abc123",
    )
    db_session.add(file)
    await db_session.commit()

    service = IntakeIngestionService()
    await service.process_file(db_session, file)

    result = await db_session.execute(
        select(IntakeSuggestion).where(IntakeSuggestion.project_id == project.id)
    )
    assert result.scalars().all() == []
    result = await db_session.execute(
        select(IntakeUnmappedNote).where(IntakeUnmappedNote.project_id == project.id)
    )
    assert result.scalars().all() == []


@pytest.mark.asyncio
async def test_dedupe_reuses_completed_file(db_session):
    org = await create_org(db_session, "Org Dedupe", "org-dedupe")
    user = await create_user(
        db_session,
        email=f"dedupe-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Dedupe Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Dedupe"
    )
    project = await create_project(
        db_session, org_id=org.id, user_id=user.id, location_id=location.id, name="Dedupe"
    )

    file_hash = "dedupe-hash"
    completed_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="done.pdf",
        file_path="/fake/path/done.pdf",
        file_size=1024,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
        processing_status="completed",
        processing_attempts=0,
        file_hash=file_hash,
        processed_text="Cached text",
        ai_analysis={"summary": "Cached summary"},
    )
    pending_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="dup.pdf",
        file_path="/fake/path/dup.pdf",
        file_size=1024,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
        processing_status="processing",
        processing_attempts=0,
        file_hash=file_hash,
    )
    db_session.add_all([completed_file, pending_file])
    await db_session.commit()

    service = IntakeIngestionService()
    await service.process_file(db_session, pending_file)

    await db_session.refresh(pending_file)
    assert pending_file.processing_status == "completed"
    assert pending_file.processed_text == "Cached text"
    assert pending_file.ai_analysis == {"summary": "Cached summary"}


@pytest.mark.asyncio
async def test_dedupe_clones_suggestions_and_unmapped(db_session):
    org = await create_org(db_session, "Org Clone", "org-clone")
    user = await create_user(
        db_session,
        email=f"clone-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Clone Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Clone")
    project = await create_project(
        db_session, org_id=org.id, user_id=user.id, location_id=location.id, name="Clone"
    )

    section, field, _ = _first_field()
    file_hash = "clone-hash"
    cached_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="cached.pdf",
        file_path="/fake/path/cached.pdf",
        file_size=1024,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
        processing_status="completed",
        processing_attempts=0,
        file_hash=file_hash,
        processed_text="Cached text",
        ai_analysis={"summary": "Cached summary"},
    )
    new_file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="new.pdf",
        file_path="/fake/path/new.pdf",
        file_size=1024,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
        processing_status="processing",
        processing_attempts=0,
        file_hash=file_hash,
    )
    db_session.add_all([cached_file, new_file])
    await db_session.flush()

    suggestion = IntakeSuggestion(
        organization_id=org.id,
        project_id=project.id,
        source_file_id=cached_file.id,
        field_id=field["id"],
        field_label=field["label"],
        section_id=section["id"],
        section_title=section["title"],
        value="Clone value",
        value_type="string",
        unit=None,
        confidence=90,
        status="pending",
        source="file",
        evidence={
            "file_id": str(cached_file.id),
            "filename": cached_file.filename,
            "page": 1,
            "excerpt": "Excerpt",
        },
        created_by_user_id=None,
    )
    note = IntakeUnmappedNote(
        organization_id=org.id,
        project_id=project.id,
        extracted_text="Unmapped text",
        confidence=60,
        source_file_id=cached_file.id,
        source_file=cached_file.filename,
        status="open",
    )
    db_session.add_all([suggestion, note])
    await db_session.commit()

    service = IntakeIngestionService()
    await service.process_file(db_session, new_file)

    result = await db_session.execute(
        select(IntakeSuggestion).where(IntakeSuggestion.source_file_id == new_file.id)
    )
    cloned_suggestions = result.scalars().all()
    assert len(cloned_suggestions) == 1
    assert cloned_suggestions[0].field_id == field["id"]
    assert cloned_suggestions[0].evidence is not None

    result = await db_session.execute(
        select(IntakeUnmappedNote).where(IntakeUnmappedNote.source_file_id == new_file.id)
    )
    cloned_notes = result.scalars().all()
    assert len(cloned_notes) == 1
    assert cloned_notes[0].source_file == new_file.filename


@pytest.mark.asyncio
async def test_cross_org_denied(client: AsyncClient, db_session, set_current_user):
    org1 = await create_org(db_session, "Org A", "org-a")
    user1 = await create_user(
        db_session,
        email=f"org-a-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org1.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company1 = await create_company(db_session, org_id=org1.id, name="Org A Co")
    location1 = await create_location(
        db_session, org_id=org1.id, company_id=company1.id, name="Org A"
    )
    project1 = await create_project(
        db_session, org_id=org1.id, user_id=user1.id, location_id=location1.id, name="Org A"
    )

    section, field, questionnaire = _first_field()
    project1.project_data = {"technical_sections": copy.deepcopy(questionnaire)}
    await db_session.commit()

    suggestion = IntakeSuggestion(
        organization_id=org1.id,
        project_id=project1.id,
        source_file_id=None,
        field_id=field["id"],
        field_label=field["label"],
        section_id=section["id"],
        section_title=section["title"],
        value="Cross org",
        value_type="string",
        unit=None,
        confidence=90,
        status="pending",
        source="notes",
        evidence=None,
        created_by_user_id=user1.id,
    )
    db_session.add(suggestion)
    await db_session.commit()

    org2 = await create_org(db_session, "Org B", "org-b")
    user2 = await create_user(
        db_session,
        email=f"org-b-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org2.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company2 = await create_company(db_session, org_id=org2.id, name="Org B Co")
    location2 = await create_location(
        db_session, org_id=org2.id, company_id=company2.id, name="Org B"
    )
    project2 = await create_project(
        db_session, org_id=org2.id, user_id=user2.id, location_id=location2.id, name="Org B"
    )
    project2.project_data = {"technical_sections": copy.deepcopy(questionnaire)}
    await db_session.commit()

    set_current_user(user2)
    response = await client.patch(
        f"/api/v1/projects/{project2.id}/intake/suggestions/{suggestion.id}",
        json={"status": "applied"},
    )
    assert response.status_code == 404


def test_evidence_validation_extra_key():
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        IntakeEvidence.model_validate(
            {
                "file_id": uuid.uuid4(),
                "filename": "test.pdf",
                "page": 1,
                "excerpt": "text",
                "extra": "nope",
            }
        )


@pytest.mark.asyncio
async def test_image_reprocess_does_not_duplicate_unmapped(db_session, monkeypatch):
    org = await create_org(db_session, "Org Image", "org-image")
    user = await create_user(
        db_session,
        email=f"image-{uuid.uuid4().hex[:8]}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Image Co")
    location = await create_location(db_session, org_id=org.id, company_id=company.id, name="Image")
    project = await create_project(
        db_session, org_id=org.id, user_id=user.id, location_id=location.id, name="Image"
    )

    file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="photo.png",
        file_path="/fake/path/photo.png",
        file_size=1024,
        mime_type="image/png",
        file_type="png",
        category="photos",
        processing_status="processing",
        processing_attempts=0,
        file_hash="img123",
    )
    db_session.add(file)
    await db_session.commit()

    from app.models.image_analysis_output import ImageAnalysisOutput

    async def _fake_analyze_image(**_kwargs):
        return ImageAnalysisOutput(
            material_type="Plastic drums",
            quality_grade="High",
            lifecycle_status="Good",
            confidence="High",
            estimated_composition=[],
            current_disposal_pathway="Landfill",
            co2_if_disposed=0.0,
            co2_if_diverted=0.0,
            co2_savings=0.0,
            esg_statement="ESG",
            lca_assumptions="",
            ppe_requirements=[],
            storage_requirements=[],
            degradation_risks=[],
            visible_hazards=[],
            summary="Clean plastic drums in good condition.",
        )

    monkeypatch.setattr(
        "app.services.intake_ingestion_service.analyze_image",
        _fake_analyze_image,
    )

    service = IntakeIngestionService()
    await service._process_image(db_session, file, b"image-bytes")
    await db_session.commit()

    await service._process_image(db_session, file, b"image-bytes")
    await db_session.commit()

    result = await db_session.execute(
        select(IntakeUnmappedNote).where(
            IntakeUnmappedNote.project_id == project.id,
            IntakeUnmappedNote.source_file_id == file.id,
        )
    )
    notes = result.scalars().all()
    assert len(notes) == 1
