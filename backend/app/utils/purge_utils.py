"""Helpers for purge confirmation and AI metadata paths."""

from __future__ import annotations


def extract_confirm_name(payload: dict[str, str] | None) -> str | None:
    if not payload:
        return None
    confirm_name = payload.get("confirm_name")
    if not isinstance(confirm_name, str):
        return None
    return confirm_name.strip()


def extract_pdf_paths(ai_metadata: object) -> list[str]:
    if not isinstance(ai_metadata, dict):
        return []
    pdf_paths = ai_metadata.get("pdfPaths")
    if not isinstance(pdf_paths, dict):
        return []
    return [path for path in pdf_paths.values() if isinstance(path, str) and path]
