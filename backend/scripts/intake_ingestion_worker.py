"""Simple DB polling worker for intake ingestion (MVP)."""

import asyncio
import random
import signal
import time
from contextlib import suppress

import structlog

from app.core.database import AsyncSessionLocal
from app.services.intake_ingestion_service import IntakeIngestionService

logger = structlog.get_logger(__name__)

_shutdown_event: asyncio.Event | None = None
POLL_BASE_SECONDS = 2.0
POLL_MAX_SECONDS = 60.0
POLL_JITTER_PCT = 0.2
REAPER_INTERVAL_SECONDS = 60.0


def _handle_signal(signum: int) -> None:
    logger.info("shutdown_signal_received", signal=signal.Signals(signum).name)
    if _shutdown_event:
        _shutdown_event.set()


async def run_worker() -> None:
    global _shutdown_event
    _shutdown_event = asyncio.Event()

    loop = asyncio.get_running_loop()
    try:
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, _handle_signal, sig)
    except (NotImplementedError, RuntimeError):
        logger.warning("signal_handlers_unavailable")

    service = IntakeIngestionService()
    idle_backoff = POLL_BASE_SECONDS
    last_reaper = 0.0
    while not _shutdown_event.is_set():
        async with AsyncSessionLocal() as db:
            try:
                now = time.monotonic()
                if now - last_reaper >= REAPER_INTERVAL_SECONDS:
                    await service.requeue_stale_processing_files(db)
                    await service.fail_exhausted_files(db)
                    await db.commit()
                    last_reaper = now

                file = await service.claim_next_file(db)
                if not file:
                    await db.rollback()
                    sleep_seconds = idle_backoff * (
                        1 + random.uniform(-POLL_JITTER_PCT, POLL_JITTER_PCT)
                    )
                    sleep_seconds = max(0.0, min(sleep_seconds, POLL_MAX_SECONDS))
                    idle_backoff = min(idle_backoff * 2, POLL_MAX_SECONDS)
                    with suppress(TimeoutError):
                        await asyncio.wait_for(_shutdown_event.wait(), timeout=sleep_seconds)
                    continue

                await db.commit()
                try:
                    await service.process_file(db, file)
                    await db.commit()
                    idle_backoff = POLL_BASE_SECONDS
                except Exception:
                    await db.rollback()
                    logger.error("intake_ingestion_failed", file_id=str(file.id), exc_info=True)
            except Exception:
                await db.rollback()
                logger.error("intake_worker_loop_error", exc_info=True)

    logger.info("intake_worker_stopped")


def main() -> None:
    asyncio.run(run_worker())


if __name__ == "__main__":
    main()
