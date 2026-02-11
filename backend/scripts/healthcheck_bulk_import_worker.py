"""Healthcheck for bulk import worker process."""

from __future__ import annotations

import sys
from pathlib import Path

WORKER_SCRIPT_NAME = "bulk_import_worker.py"
HEALTHCHECK_SCRIPT_NAME = "healthcheck_bulk_import_worker.py"


def _cmdline_matches_worker(raw: bytes) -> bool:
    if not raw:
        return False
    args = [arg.decode("utf-8", errors="ignore") for arg in raw.split(b"\x00") if arg]
    arg_names = {Path(arg).name for arg in args}
    if HEALTHCHECK_SCRIPT_NAME in arg_names:
        return False
    return WORKER_SCRIPT_NAME in arg_names


def _is_worker_running() -> bool:
    proc_dir = Path("/proc")
    try:
        entries = proc_dir.iterdir()
    except OSError:
        return False

    for entry in entries:
        if not entry.name.isdigit():
            continue
        cmdline_path = entry / "cmdline"
        try:
            with cmdline_path.open("rb") as cmdline_file:
                raw = cmdline_file.read()
        except OSError:
            continue
        if _cmdline_matches_worker(raw):
            return True
    return False


def main() -> int:
    return 0 if _is_worker_running() else 1


if __name__ == "__main__":
    sys.exit(main())
