"""Simple DB polling worker for intake ingestion (MVP)."""

import asyncio
import signal
from contextlib import suppress

import structlog

from app.core.database import AsyncSessionLocal
from app.services.intake_ingestion_service import IntakeIngestionService

logger = structlog.get_logger(__name__)

_shutdown_event: asyncio.Event | None = None


def _handle_signal(signum: int) -> None:
    logger.info("shutdown_signal_received", signal=signal.Signals(signum).name)
    if _shutdown_event:
        _shutdown_event.set()


async def run_worker(poll_interval_seconds: float = 2.0) -> None:
    global _shutdown_event
    _shutdown_event = asyncio.Event()

    loop = asyncio.get_running_loop()
    try:
        for sig in (signal.SIGTERM, signal.SIGINT):
            loop.add_signal_handler(sig, _handle_signal, sig)
    except (NotImplementedError, RuntimeError):
        logger.warning("signal_handlers_unavailable")

    service = IntakeIngestionService()
    while not _shutdown_event.is_set():
        async with AsyncSessionLocal() as db:
            try:
                await service.fail_exhausted_files(db)
                await db.commit()

                file = await service.claim_next_file(db)
                if not file:
                    await db.rollback()
                    with suppress(TimeoutError):
                        await asyncio.wait_for(
                            _shutdown_event.wait(), timeout=poll_interval_seconds
                        )
                    continue

                await db.commit()
                try:
                    await service.process_file(db, file)
                    await db.commit()
                except Exception:
                    try:
                        await db.commit()
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
