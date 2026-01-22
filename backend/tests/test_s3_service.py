from app.services.s3_service import StorageError, _normalize_relative_key


def test_normalize_relative_key_allows_relative_prefixes():
    assert _normalize_relative_key("projects/example.txt") == "projects/example.txt"
    assert _normalize_relative_key("proposals/example.pdf") == "proposals/example.pdf"


def test_normalize_relative_key_rejects_absolute():
    try:
        _normalize_relative_key("/tmp/absolute.txt")
    except StorageError:
        return
    raise AssertionError("Expected StorageError for absolute path")
