import os
from io import BytesIO
from pathlib import Path
from typing import IO

import aioboto3
import aiofiles
import structlog

from app.core.config import settings


# Custom exception for storage errors (fail fast)
class StorageError(Exception):
    """Raised when storage operations fail."""

    pass


# S3 configuration from centralized settings (Single Source of Truth)
S3_BUCKET = settings.AWS_S3_BUCKET
S3_REGION = settings.AWS_REGION
S3_ACCESS_KEY = settings.AWS_ACCESS_KEY_ID
S3_SECRET_KEY = settings.AWS_SECRET_ACCESS_KEY

# Local storage configuration for development
LOCAL_UPLOADS_DIR = Path(settings.LOCAL_STORAGE_PATH) / "uploads"
LOCAL_UPLOADS_DIR.mkdir(exist_ok=True, parents=True)

# Explicit S3 validation: bucket must be non-empty string (not just "not None")
USE_S3 = bool(S3_BUCKET and S3_BUCKET.strip())

logger = structlog.get_logger(__name__)


async def upload_file_to_s3(
    file_obj: IO[bytes] | BytesIO, filename: str, content_type: str | None = None
) -> str:
    """Upload a file to S3 or save locally in development."""
    try:
        if USE_S3:  # Production mode: use S3
            logger.info(f"Uploading file to S3: {filename}")
            session = aioboto3.Session()
            extra_args = {"ContentType": content_type} if content_type else {}

            # In production (AWS), boto3 client will automatically use the IAM role of the ECS task.
            # It's not necessary (and insecure) to pass explicit credentials.
            client_args = {"region_name": S3_REGION}
            if S3_ACCESS_KEY and S3_SECRET_KEY:
                # Allow explicit credentials for non-AWS testing environments that use S3.
                logger.warning(
                    "Using explicit S3 credentials. This is not recommended in AWS production."
                )
                client_args["aws_access_key_id"] = S3_ACCESS_KEY
                client_args["aws_secret_access_key"] = S3_SECRET_KEY

            async with session.client("s3", **client_args) as s3:
                await s3.upload_fileobj(file_obj, S3_BUCKET, filename, ExtraArgs=extra_args)
        else:  # Development mode: save locally
            logger.info(f"Saving file locally (dev mode): {filename}")
            local_path = os.path.join(LOCAL_UPLOADS_DIR, filename)
            # Ensure directory exists
            os.makedirs(os.path.dirname(local_path), exist_ok=True)

            # Save file locally
            file_obj.seek(0)
            content = file_obj.read()
            async with aiofiles.open(local_path, "wb") as f:
                await f.write(content)

        return filename
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise


async def get_presigned_url(filename: str, expires: int = 3600) -> str:
    """Generate a presigned URL for S3 or a local URL in development.

    Raises:
        StorageError: If URL generation fails (fail fast principle)
    """
    if USE_S3:
        # Production mode: S3 URL
        try:
            session = aioboto3.Session()
            client_args = {"region_name": S3_REGION}
            if S3_ACCESS_KEY and S3_SECRET_KEY:
                client_args["aws_access_key_id"] = S3_ACCESS_KEY
                client_args["aws_secret_access_key"] = S3_SECRET_KEY

            async with session.client("s3", **client_args) as s3:
                url = await s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": S3_BUCKET, "Key": filename},
                    ExpiresIn=expires,
                )
            return url
        except Exception as e:
            logger.error("S3 presigned URL generation failed", error=str(e), key=filename)
            raise StorageError(f"Failed to generate S3 URL: {e}") from e

    # Development/local mode: build static URL
    from app.core.config import settings

    storage_path = Path(settings.LOCAL_STORAGE_PATH).resolve()
    file_path_obj = Path(filename)

    # Handle relative paths that may include storage prefix
    if file_path_obj.is_absolute():
        try:
            rel_path = file_path_obj.relative_to(storage_path)
        except ValueError:
            raise StorageError(f"File outside storage directory: {filename}")
    else:
        # Remove storage prefix if present (e.g., "storage/projects/..." -> "projects/...")
        parts = file_path_obj.parts
        if parts and parts[0] == "storage":
            rel_path = Path(*parts[1:])
        else:
            rel_path = file_path_obj

    full_path = storage_path / rel_path
    if not full_path.exists():
        uploads_path = LOCAL_UPLOADS_DIR / rel_path
        if uploads_path.exists():
            rel_path = uploads_path.relative_to(storage_path)
            full_path = uploads_path
        else:
            raise StorageError(f"Local file not found: {full_path}")

    return f"{settings.BACKEND_URL}/uploads/{rel_path}"


async def download_file_content(filename: str) -> bytes:
    """Download file content from S3 or local as bytes."""
    try:
        if USE_S3:  # Production mode: download from S3
            logger.info(f"Downloading file from S3: {filename}")
            session = aioboto3.Session()

            # Same logic as upload: use IAM role by default
            client_args = {"region_name": S3_REGION}
            if S3_ACCESS_KEY and S3_SECRET_KEY:
                client_args["aws_access_key_id"] = S3_ACCESS_KEY
                client_args["aws_secret_access_key"] = S3_SECRET_KEY

            async with session.client("s3", **client_args) as s3:
                response = await s3.get_object(Bucket=S3_BUCKET, Key=filename)
                content = await response["Body"].read()
                logger.info(f"✅ File downloaded from S3: {len(content)} bytes")
                return content
        else:  # Local mode: read local file
            # file_path from DB is already the complete path (set during upload)
            local_path = filename
            logger.info(f"Reading local file: {local_path}")

            if not os.path.exists(local_path):
                raise FileNotFoundError(f"Local file not found: {local_path}")

            async with aiofiles.open(local_path, "rb") as f:
                content = await f.read()
                logger.info(f"✅ File read locally: {len(content)} bytes")
                return content

    except Exception as e:
        logger.error(f"Error downloading file {filename}: {str(e)}")
        raise


async def delete_file_from_s3(filename: str) -> None:
    """Delete a file from S3.

    In development mode (without S3_BUCKET configured) does nothing,
    local deletion is handled by the file management endpoints.
    """
    try:
        if not USE_S3:
            # Nothing to do: file is managed locally by the caller
            return

        logger.info(f"Deleting file from S3: {filename}")
        session = aioboto3.Session()
        client_args = {"region_name": S3_REGION}
        if S3_ACCESS_KEY and S3_SECRET_KEY:
            logger.warning(
                "Using explicit S3 credentials for delete; avoid this in AWS production."
            )
            client_args["aws_access_key_id"] = S3_ACCESS_KEY
            client_args["aws_secret_access_key"] = S3_SECRET_KEY

        async with session.client("s3", **client_args) as s3:
            await s3.delete_object(Bucket=S3_BUCKET, Key=filename)
    except Exception as e:
        logger.error(f"Error deleting file {filename} from S3: {str(e)}")
        raise
