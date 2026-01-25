"""Healthcheck for intake worker process."""

from __future__ import annotations

import sys
from pathlib import Path


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
        if not raw:
            continue
        cmdline = raw.decode("utf-8", errors="ignore")
        if "intake_ingestion_worker.py" in cmdline:
            return True
    return False


def main() -> int:
    return 0 if _is_worker_running() else 1


if __name__ == "__main__":
    sys.exit(main())
