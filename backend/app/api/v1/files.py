"""
File upload and management endpoints.
"""

import os
from pathlib import Path
from uuid import UUID

import aiofiles
import structlog
from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.responses import RedirectResponse, StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import CurrentUser, ProjectDep, AsyncDB
from app.core.config import settings
from app.core.database import AsyncSessionLocal, get_async_db
from app.models.file import ProjectFile
from app.models.project import Project
from app.models.timeline import TimelineEvent
from app.schemas.common import ErrorResponse
from app.schemas.file import FileDetailResponse, FileListResponse, FileUploadResponse
from app.services.document_processor import DocumentProcessor
from app.services.s3_service import (
    USE_S3,
    delete_file_from_s3,
    get_presigned_url,
    upload_file_to_s3,
)

logger = structlog.get_logger(__name__)

router = APIRouter()

# Import limiter for rate limiting
from app.main import limiter

# Allowed file extensions and max size (single source of truth via settings)
ALLOWED_EXTENSIONS = {
    (ext if ext.startswith(".") else f".{ext}").lower() for ext in settings.allowed_extensions_list
}
MAX_FILE_SIZE = settings.MAX_UPLOAD_SIZE


def validate_file(upload_file: UploadFile) -> None:
    """Basic validation for uploaded files.

    Ensures the file has a name and an allowed extension.
    Raises HTTPException with 400 status on invalid files.
    """
    filename = upload_file.filename or ""
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    file_ext = Path(filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file_ext or 'unknown'}",
        )


@router.post(
    "/{project_id}/files",
    response_model=FileUploadResponse,
    status_code=status.HTTP_201_CREATED,
    responses={400: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Upload file",
    description="Upload a file to a project. Supports PDF, DOCX, XLSX, JPG, PNG formats",
)
@limiter.limit("10/minute")  # File upload - conservative (resource intensive)
async def upload_file(
    request: Request,
    project_id: UUID,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    category: str = Form("general"),
    process_with_ai: bool = Form(False),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Upload a file to a project.
    
    **Supported file types:**
    - Documents: PDF, DOCX, TXT
    - Spreadsheets: XLSX, XLS
    - Images: JPG, JPEG, PNG
    
    **Categories:**
    - `general` - General project files
    - `analysis` - Water quality analysis
    - `technical` - Technical specifications
    - `regulatory` - Regulatory documents
    - `photos` - Site photos
    
    **Processing:**
    - If `process_with_ai=true`, extracts text and analyzes content
    - PDF: Extracts text and tables
    - Excel: Reads data and can import to technical fields
    - Images: OCR (optical character recognition)
    
    **Storage:**
    - Local: `./storage/projects/{project_id}/`
    - S3: `projects/{project_id}/files/`
    
    **Example:**
    ```bash
    curl -X POST /api/v1/projects/{id}/files \
      -H "Authorization: Bearer {token}" \
      -F "file=@analysis.pdf" \
      -F "category=analysis" \
      -F "process_with_ai=true"
    ```
    """
    # Validate file
    validate_file(file)

    # Verify project access
    conditions = [Project.id == project_id]
    if not current_user.is_superuser:
        conditions.append(Project.user_id == current_user.id)

    result = await db.execute(select(Project).where(*conditions))
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)

        # Check size
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE / 1024 / 1024} MB",
            )

        # Generate unique filename
        import uuid

        file_ext = Path(file.filename).suffix.lower()

        # AI processing is only supported for image files (JPG, JPEG, PNG)
        is_image = file_ext in {".jpg", ".jpeg", ".png"}
        if process_with_ai and not is_image:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="AI processing is only supported for image files (JPG, JPEG, PNG)",
            )

        unique_filename = f"{uuid.uuid4()}{file_ext}"

        # Store file
        if USE_S3:
            # Upload to S3
            s3_key = f"projects/{project_id}/files/{unique_filename}"
            from io import BytesIO

            file_buffer = BytesIO(file_content)
            await upload_file_to_s3(file_buffer, s3_key, file.content_type)
            file_path = s3_key
        else:
            # Store locally
            storage_dir = Path(settings.LOCAL_STORAGE_PATH) / "projects" / str(project_id) / "files"
            storage_dir.mkdir(parents=True, exist_ok=True)
            file_path = str(storage_dir / unique_filename)

            async with aiofiles.open(file_path, "wb") as f:
                await f.write(file_content)

        # Create database record
        project_file = ProjectFile(
            project_id=project_id,
            filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            file_type=file_ext.lstrip("."),
            mime_type=file.content_type or "application/octet-stream",
            category=category,
            uploaded_by=current_user.id,
        )

        db.add(project_file)
        await db.flush()  # Get the ID

        # Process with AI if requested
        if process_with_ai:
            background_tasks.add_task(
                process_file_with_ai,
                file_id=project_file.id,
                file_path=file_path,
                file_type=file_ext,
            )
            processing_status = "queued"
        else:
            processing_status = "not_processed"

        # Create timeline event
        event = TimelineEvent(
            project_id=project_id,
            event_type="file_uploaded",
            title="File uploaded",
            description=f"Uploaded file: {file.filename}",
            actor=f"user_{current_user.id}",
            event_metadata={
                "file_id": str(project_file.id),
                "filename": file.filename,
                "file_size": file_size,
                "category": category,
                "user_id": str(current_user.id),
            },
        )
        db.add(event)
        await db.commit()
        await db.refresh(project_file)

        logger.info("File uploaded", filename=file.filename, project_id=str(project_id))

        return FileUploadResponse(
            id=project_file.id,
            filename=project_file.filename,
            file_size=file_size,
            file_type=project_file.file_type,
            category=category,
            processing_status=processing_status,
            uploaded_at=project_file.created_at,
            message="File uploaded successfully",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading file: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading file: {str(e)}",
        )


@router.get(
    "/{project_id}/files",
    response_model=FileListResponse,
    responses={404: {"model": ErrorResponse}},
    summary="List project files",
)
async def list_files(
    project: ProjectDep,
    db: AsyncDB,
):
    """List all files for a project (newest first)."""
    result = await db.execute(
        select(ProjectFile)
        .where(ProjectFile.project_id == project.id)
        .order_by(ProjectFile.created_at.desc())
    )
    files = result.scalars().all()

    file_list = []
    for f in files:
        has_text = f.processed_text is not None
        has_ai = f.ai_analysis is not None
        processing_status = "completed" if (has_text or has_ai) else "not_processed"
        file_list.append({
            "id": f.id,
            "filename": f.filename,
            "file_size": f.file_size,
            "file_type": f.file_type,
            "category": f.category,
            "uploaded_at": f.created_at,
            "processed_text": has_text,
            "ai_analysis": has_ai,
            "processing_status": processing_status,
        })

    return FileListResponse(
        project_id=project.id,
        files=file_list,
        total=len(file_list),
    )


@router.get(
    "/{project_id}/files/{file_id}",
    response_model=FileDetailResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Get file details",
)
async def get_file_detail(
    project_id: UUID,
    file_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get detailed information about a file.

    Includes:
    - File metadata
    - Processing status
    - Extracted text (if processed)
    - AI analysis (if available)
    """
    # Verify access
    conditions = [
        ProjectFile.id == file_id,
        ProjectFile.project_id == project_id,
    ]
    if not current_user.is_superuser:
        conditions.append(Project.user_id == current_user.id)

    result = await db.execute(select(ProjectFile).join(Project).where(*conditions))
    file = result.scalar_one_or_none()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    return FileDetailResponse(
        id=file.id,
        project_id=file.project_id,
        filename=file.filename,
        file_size=file.file_size,
        file_type=file.file_type,
        category=file.category,
        uploaded_at=file.created_at,
        processed_text=file.processed_text,
        ai_analysis=file.ai_analysis,
    )


@router.get(
    "/files/{file_id}/download",
    responses={404: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
    summary="Download file",
)
async def download_file(
    file_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get a download URL for a file.

    Always returns JSON with a URL:
    - **S3**: Presigned URL (24h expiry)
    - **Local**: URL to static file server

    Frontend should fetch the blob from the returned URL.
    """
    from app.services.s3_service import StorageError
    
    # Get file (verify access through join)
    conditions = [
        ProjectFile.id == file_id,
    ]
    if not current_user.is_superuser:
        conditions.append(Project.user_id == current_user.id)

    result = await db.execute(select(ProjectFile).join(Project).where(*conditions))
    file = result.scalar_one_or_none()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    # Fail fast: let StorageError propagate with proper error code
    try:
        url = await get_presigned_url(file.file_path, expires=86400)
    except StorageError as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))
    
    return {"url": url, "filename": file.filename, "mime_type": file.mime_type}



@router.delete(
    "/{project_id}/files/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={404: {"model": ErrorResponse}},
    summary="Delete file",
)
async def delete_file(
    project_id: UUID,
    file_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Delete a file from a project.

    Deletes both the database record and the physical file.
    """
    # Verify access (superusers can delete any file)
    conditions = [
        ProjectFile.id == file_id,
        ProjectFile.project_id == project_id,
    ]
    if not current_user.is_superuser:
        conditions.append(Project.user_id == current_user.id)

    result = await db.execute(
        select(ProjectFile)
        .join(Project)
        .where(*conditions)
    )
    file = result.scalar_one_or_none()

    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )

    # Delete physical file
    try:
        if USE_S3:
            await delete_file_from_s3(file.file_path)
        else:
            if os.path.exists(file.file_path):
                os.remove(file.file_path)
    except Exception as e:
        logger.warning(f"Could not delete physical file: {e}")

    # Delete database record
    await db.delete(file)

    # Create timeline event
    event = TimelineEvent(
        project_id=project_id,
        event_type="file_deleted",
        title="File deleted",
        description=f"Deleted file: {file.filename}",
        actor=f"user_{current_user.id}",
        event_metadata={
            "filename": file.filename,
            "user_id": str(current_user.id),
        },
    )
    db.add(event)
    await db.commit()

    logger.info("File deleted", filename=file.filename, project_id=str(project_id))

    return None


# Background task for AI processing
async def process_file_with_ai(
    file_id: UUID,
    file_path: str,
    file_type: str,
):
    """Process file with AI in background using its own DB session.
    
    Loads project context (sector/subsector) to provide industry-specific
    analysis for waste materials.
    """
    try:
        logger.info("Processing file with AI", file_id=str(file_id))

        # Load file and project context for industry-specific analysis
        async with AsyncSessionLocal() as db:
            result_db = await db.execute(
                select(ProjectFile, Project)
                .join(Project, ProjectFile.project_id == Project.id)
                .where(ProjectFile.id == file_id)
            )
            row = result_db.one_or_none()
            
            if not row:
                logger.error(f"File {file_id} not found")
                return
            
            project_file, project = row
            project_sector = project.sector
            project_subsector = project.subsector

        # Create document processor and process file with context
        processor = DocumentProcessor()

        # Unified file reading: works for both S3 keys and local paths (DRY)
        from app.services.s3_service import download_file_content
        from io import BytesIO
        
        file_bytes = await download_file_content(file_path)
        file_content = BytesIO(file_bytes)
        
        try:
            result = await processor.process(
                file_content=file_content,
                filename=os.path.basename(file_path),
                file_type=file_type,
                project_sector=project_sector,
                project_subsector=project_subsector,
            )
        finally:
            file_content.close()

        # Update file record in its own async DB session
        async with AsyncSessionLocal() as db:
            try:
                result_db = await db.execute(select(ProjectFile).where(ProjectFile.id == file_id))
                file = result_db.scalar_one_or_none()

                if file:
                    file.processed_text = result.get("text")
                    file.ai_analysis = result.get("analysis")
                    await db.commit()
                    logger.info("File processed successfully", file_id=str(file_id), sector=project_sector)
            except Exception:
                await db.rollback()
                raise

    except Exception as e:
        logger.error(f"Error processing file {file_id}: {e}", exc_info=True)
