"""
File upload and management endpoints.
"""

from uuid import UUID
from typing import List
from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
    BackgroundTasks,
    Request,
)
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pathlib import Path
import aiofiles
import os

from app.core.database import get_async_db
from app.api.dependencies import CurrentUser
from app.models.project import Project
from app.models.file import ProjectFile
from app.schemas.file import FileUploadResponse, FileDetailResponse, FileListResponse
from app.schemas.common import ErrorResponse
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Import limiter for rate limiting
from app.main import limiter

# Allowed file extensions
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.txt'}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


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
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
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
            
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_content)
        
        # Create database record
        project_file = ProjectFile(
            project_id=project_id,
            filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            file_type=file_ext.lstrip('.'),
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
                db=db,
            )
            processing_status = "queued"
        else:
            processing_status = "not_processed"
        
        # Create timeline event
        event = TimelineEvent(
            project_id=project_id,
            event_type="file_uploaded",
            description=f"Uploaded file: {file.filename}",
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
        
        logger.info(f"✅ File uploaded: {file.filename} to project {project_id}")
        
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
    project_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db),
):
    """
    List all files for a project.
    
    Returns files sorted by upload date (newest first).
    Includes file metadata and processing status.
    """
    # Verify project access
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == current_user.id,
        )
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    
    # Get files
    result = await db.execute(
        select(ProjectFile)
        .where(ProjectFile.project_id == project_id)
        .order_by(ProjectFile.created_at.desc())
    )
    files = result.scalars().all()
    
    # Convert to response
    file_list = [
        {
            "id": f.id,
            "filename": f.filename,
            "file_size": f.file_size,
            "file_type": f.file_type,
            "category": f.category,
            "uploaded_at": f.created_at,
            "processed_text": f.processed_text is not None,
            "ai_analysis": f.ai_analysis is not None,
        }
        for f in files
    ]
    
    return FileListResponse(
        project_id=project_id,
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
    result = await db.execute(
        select(ProjectFile)
        .join(Project)
        .where(
            ProjectFile.id == file_id,
            ProjectFile.project_id == project_id,
            Project.user_id == current_user.id,
        )
    )
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
    responses={404: {"model": ErrorResponse}},
    summary="Download file",
)
async def download_file(
    file_id: UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_async_db),
):
    """
    Download a file.
    
    - **S3**: Returns redirect to presigned URL (24h expiry)
    - **Local**: Streams file directly
    
    **Usage:**
    ```javascript
    const response = await fetch(`/api/v1/files/${fileId}/download`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    ```
    """
    # Get file (verify access through join)
    result = await db.execute(
        select(ProjectFile)
        .join(Project)
        .where(
            ProjectFile.id == file_id,
            Project.user_id == current_user.id,
        )
    )
    file = result.scalar_one_or_none()
    
    if not file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found",
        )
    
    if USE_S3:
        # Generate presigned URL and redirect
        url = await get_presigned_url(file.file_path, expires=86400)
        return RedirectResponse(url=url)
    else:
        # Stream file from local storage
        if not os.path.exists(file.file_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found on disk",
            )
        
        async def file_generator():
            async with aiofiles.open(file.file_path, 'rb') as f:
                chunk = await f.read(8192)
                while chunk:
                    yield chunk
                    chunk = await f.read(8192)
        
        return StreamingResponse(
            file_generator(),
            media_type=file.mime_type,
            headers={
                "Content-Disposition": f'attachment; filename="{file.filename}"',
                "Content-Length": str(file.file_size),
            },
        )


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
    # Verify access
    result = await db.execute(
        select(ProjectFile)
        .join(Project)
        .where(
            ProjectFile.id == file_id,
            ProjectFile.project_id == project_id,
            Project.user_id == current_user.id,
        )
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
            # TODO: Implement S3 delete
            pass
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
        description=f"Deleted file: {file.filename}",
        event_metadata={
            "filename": file.filename,
            "user_id": str(current_user.id),
        },
    )
    db.add(event)
    await db.commit()
    
    logger.info(f"✅ File deleted: {file.filename} from project {project_id}")
    
    return None


# Background task for AI processing
async def process_file_with_ai(
    file_id: UUID,
    file_path: str,
    file_type: str,
    db: AsyncSession,
):
    """Process file with AI in background."""
    try:
        logger.info(f"🤖 Processing file {file_id} with AI...")
        
        # Create document processor and process file
        processor = DocumentProcessor()
        
        # Open file and process
        with open(file_path, 'rb') as file_content:
            result = await processor.process(
                file_content=file_content,
                filename=os.path.basename(file_path),
                file_type=file_type
            )
        
        # Update file record
        result_db = await db.execute(
            select(ProjectFile).where(ProjectFile.id == file_id)
        )
        file = result_db.scalar_one_or_none()
        
        if file:
            file.processed_text = result.get("text")
            file.ai_analysis = result.get("analysis")
            await db.commit()
            
            logger.info(f"✅ File {file_id} processed successfully")
    
    except Exception as e:
        logger.error(f"Error processing file {file_id}: {e}", exc_info=True)
