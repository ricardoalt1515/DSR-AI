import io
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

from app.models.file import ProjectFile
from app.models.user import UserRole


@pytest.mark.asyncio
async def test_upload_file_success(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Upload", "org-upload")
    user = await create_user(
        db_session,
        email=f"upload-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Upload Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Upload Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Upload Project",
    )

    set_current_user(user)

    file_content = b"Test PDF content here"
    files = {"file": ("test.pdf", io.BytesIO(file_content), "application/pdf")}
    data = {"category": "general", "process_with_ai": "false"}

    response = await client.post(
        f"/api/v1/projects/{project.id}/files",
        files=files,
        data=data,
    )
    assert response.status_code == 201
    resp_data = response.json()
    assert resp_data["filename"] == "test.pdf"
    assert "id" in resp_data


@pytest.mark.asyncio
async def test_upload_file_invalid_type(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Invalid Type", "org-invalid-type")
    user = await create_user(
        db_session,
        email=f"invalid-type-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Invalid Type Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Invalid Type Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Invalid Type Project",
    )

    set_current_user(user)

    file_content = b"malicious executable"
    files = {"file": ("virus.exe", io.BytesIO(file_content), "application/octet-stream")}
    data = {"category": "general"}

    response = await client.post(
        f"/api/v1/projects/{project.id}/files",
        files=files,
        data=data,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_list_project_files(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org List Files", "org-list-files")
    user = await create_user(
        db_session,
        email=f"list-files-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="List Files Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="List Files Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="List Files Project",
    )

    file1 = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="doc1.pdf",
        file_path="/fake/path/doc1.pdf",
        file_size=1024,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
    )
    file2 = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="doc2.pdf",
        file_path="/fake/path/doc2.pdf",
        file_size=2048,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
    )
    db_session.add(file1)
    db_session.add(file2)
    await db_session.commit()

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}/files")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2
    assert len(data["files"]) == 2


@pytest.mark.asyncio
async def test_get_file_download_url(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Download", "org-download")
    user = await create_user(
        db_session,
        email=f"download-{uid}@example.com",
        org_id=org.id,
        role=UserRole.FIELD_AGENT.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Download Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Download Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Download Project",
    )

    file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="download.pdf",
        file_path="/fake/path/download.pdf",
        file_size=1024,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
    )
    db_session.add(file)
    await db_session.commit()
    await db_session.refresh(file)

    set_current_user(user)
    response = await client.get(f"/api/v1/projects/{project.id}/files/{file.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "download.pdf"


@pytest.mark.asyncio
async def test_delete_file(client: AsyncClient, db_session, set_current_user):
    uid = uuid.uuid4().hex[:8]
    org = await create_org(db_session, "Org Delete File", "org-delete-file")
    user = await create_user(
        db_session,
        email=f"delete-file-{uid}@example.com",
        org_id=org.id,
        role=UserRole.ORG_ADMIN.value,
        is_superuser=False,
    )
    company = await create_company(db_session, org_id=org.id, name="Delete File Co")
    location = await create_location(
        db_session, org_id=org.id, company_id=company.id, name="Delete File Loc"
    )
    project = await create_project(
        db_session,
        org_id=org.id,
        user_id=user.id,
        location_id=location.id,
        name="Delete File Project",
    )

    file = ProjectFile(
        organization_id=org.id,
        project_id=project.id,
        filename="to_delete.pdf",
        file_path="/fake/path/to_delete.pdf",
        file_size=1024,
        mime_type="application/pdf",
        file_type="pdf",
        category="general",
    )
    db_session.add(file)
    await db_session.commit()
    await db_session.refresh(file)

    set_current_user(user)
    response = await client.delete(f"/api/v1/projects/{project.id}/files/{file.id}")
    assert response.status_code == 204
