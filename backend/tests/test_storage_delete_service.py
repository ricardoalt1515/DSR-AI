from pathlib import Path

import pytest

from app.core.config import settings
from app.services.s3_service import LOCAL_UPLOADS_DIR
from app.services.storage_delete_service import (
    StorageDeleteError,
    normalize_storage_key,
    resolve_local_path,
)


def test_normalize_storage_key_valid():
    assert normalize_storage_key("projects/abc/file.txt") == "projects/abc/file.txt"
    assert normalize_storage_key("proposals/report.pdf") == "proposals/report.pdf"


def test_normalize_storage_key_invalid_empty():
    with pytest.raises(StorageDeleteError):
        normalize_storage_key(" ")


def test_normalize_storage_key_invalid_absolute():
    with pytest.raises(StorageDeleteError):
        normalize_storage_key("/etc/passwd")


def test_normalize_storage_key_invalid_traversal():
    with pytest.raises(StorageDeleteError):
        normalize_storage_key("projects/../secrets.txt")


def test_normalize_storage_key_invalid_prefix():
    with pytest.raises(StorageDeleteError):
        normalize_storage_key("tmp/file.txt")


def test_resolve_local_path_relative_projects():
    storage_root = Path(settings.LOCAL_STORAGE_PATH).resolve()
    resolved = resolve_local_path("projects/sample.txt")
    assert resolved.is_absolute()
    assert storage_root in resolved.parents


def test_resolve_local_path_relative_proposals():
    uploads_root = LOCAL_UPLOADS_DIR.resolve()
    resolved = resolve_local_path("proposals/sample.pdf")
    assert resolved.is_absolute()
    assert uploads_root in resolved.parents


def test_resolve_local_path_absolute_allowed():
    storage_root = Path(settings.LOCAL_STORAGE_PATH).resolve()
    allowed_path = storage_root / "projects" / "allowed.txt"
    resolved = resolve_local_path(str(allowed_path))
    assert resolved == allowed_path.resolve()


def test_resolve_local_path_absolute_outside_root():
    outside = Path("/tmp/outside.txt")
    with pytest.raises(StorageDeleteError):
        resolve_local_path(str(outside))
