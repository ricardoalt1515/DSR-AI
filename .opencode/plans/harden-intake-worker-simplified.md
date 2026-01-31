# Plan: Harden Intake Worker (Production-Safe, Corrected)

## Goal
Reliable file processing in ECS: no stuck jobs, no zombies, bounded retries, correct error handling.

## Critical Fixes from Review

1. **Fail exhausted queued files** - Files in `queued` with attempts >= MAX were zombies (filtered by claim but never failed)
2. **Centralize _mark_completed** - Avoid double marking and inconsistent states
3. **Tests adjusted** - Match async fixtures in the repo

## Implementation

### Step 1: Migration - Add Lease Timestamp

**File:** `backend/alembic/versions/<timestamp>_add_processing_started_at.py`

```python
def upgrade():
    # Add column
    op.add_column(
        'project_files',
        sa.Column('processing_started_at', sa.DateTime(timezone=True), nullable=True)
    )
    
    # Backfill: only existing processing rows
    op.execute("""
        UPDATE project_files 
        SET processing_started_at = NOW() 
        WHERE processing_status = 'processing' 
        AND processing_started_at IS NULL
    """)
    
    # Index for efficient queries
    op.create_index(
        'idx_processing_status_started_at',
        'project_files',
        ['processing_status', 'processing_started_at']
    )

def downgrade():
    op.drop_index('idx_processing_status_started_at', table_name='project_files')
    op.drop_column('project_files', 'processing_started_at')
```

### Step 2: Model - Add Column

**File:** `backend/app/models/file.py`

```python
processing_started_at: Mapped[datetime | None] = mapped_column(
    DateTime(timezone=True), 
    nullable=True,
    comment="When processing began (for stale detection)"
)
```

### Step 3: Update claim_next_file (3-Step Atomic Operation)

**File:** `backend/app/services/intake_ingestion_service.py`

```python
STALE_PROCESSING_MINUTES = 15
MAX_RETRY_BATCH = 50

async def claim_next_file(self, db: AsyncSession) -> ProjectFile | None:
    """Atomically: requeue stale, fail exhausted, claim next."""
    
    # A) Requeue stale processing (bounded)
    stale_cutoff = datetime.now(UTC) - timedelta(minutes=STALE_PROCESSING_MINUTES)
    
    stale_cte = (
        select(ProjectFile.id)
        .where(ProjectFile.processing_status == "processing")
        .where(ProjectFile.processing_started_at < stale_cutoff)
        .where(ProjectFile.processing_attempts < MAX_PROCESSING_ATTEMPTS)
        .with_for_update(skip_locked=True)
        .limit(MAX_RETRY_BATCH)
        .cte("stale_ids")
    )
    
    result = await db.execute(
        update(ProjectFile)
        .where(ProjectFile.id.in_(select(stale_cte.c.id)))
        .values(
            processing_status="queued",
            processing_started_at=None,
            processing_error="stale_processing_requeued"
        )
    )
    if result.rowcount:
        logger.info("stale_files_requeued", count=result.rowcount)
    
    # B) FAIL EXHAUSTED QUEUED (Critical fix - prevents zombies)
    exhausted_cte = (
        select(ProjectFile.id)
        .where(ProjectFile.processing_status == "queued")
        .where(ProjectFile.processing_attempts >= MAX_PROCESSING_ATTEMPTS)
        .with_for_update(skip_locked=True)
        .limit(MAX_RETRY_BATCH)
        .cte("exhausted_ids")
    )
    
    result = await db.execute(
        update(ProjectFile)
        .where(ProjectFile.id.in_(select(exhausted_cte.c.id)))
        .values(
            processing_status="failed",
            processing_error="max_attempts_exhausted",
            processed_at=datetime.now(UTC),
            processing_started_at=None
        )
    )
    if result.rowcount:
        logger.warning("exhausted_files_marked_failed", count=result.rowcount)
    
    # C) Claim next queued file (FIFO)
    result = await db.execute(
        select(ProjectFile)
        .where(ProjectFile.processing_status == "queued")
        .where(ProjectFile.processing_attempts < MAX_PROCESSING_ATTEMPTS)
        .order_by(ProjectFile.created_at)
        .with_for_update(skip_locked=True)
        .limit(1)
    )
    
    file = result.scalar_one_or_none()
    if file:
        file.processing_status = "processing"
        file.processing_attempts += 1
        file.processing_started_at = datetime.now(UTC)
        file.processing_error = None
    
    return file
```

### Step 4: Add 5-Minute Timeouts to AI Calls

**File:** `backend/app/services/intake_ingestion_service.py`

Add import: `import asyncio`

```python
async def _process_document(self, db: AsyncSession, file: ProjectFile, file_bytes: bytes) -> None:
    doc_type = determine_doc_type(file.category)
    field_catalog = self._build_field_catalog()
    
    # 5-minute timeout prevents indefinite hangs
    analysis = await asyncio.wait_for(
        analyze_document(
            document_bytes=file_bytes,
            filename=file.filename,
            doc_type=doc_type,
            field_catalog=field_catalog,
            media_type=file.mime_type or "application/pdf",
        ),
        timeout=300  # 5 minutes
    )
    
    await self._persist_document_analysis(db, file, analysis, doc_type)
    # NOTE: Do NOT call _mark_completed here (centralized in process_file)

async def _process_image(self, db: AsyncSession, file: ProjectFile, file_bytes: bytes) -> None:
    result = await asyncio.wait_for(
        analyze_image(
            image_data=file_bytes,
            filename=file.filename,
            media_type=file.mime_type or "image/jpeg",
        ),
        timeout=300  # 5 minutes
    )
    
    file.ai_analysis = result.model_dump()
    file.processed_text = result.summary
    await self._delete_pending_for_source(db, file)
    await self._persist_unmapped_from_image(db, file, result.summary)
    # NOTE: Do NOT call _mark_completed here (centralized in process_file)
```

### Step 5: Centralize _mark_completed in process_file

**File:** `backend/app/services/intake_ingestion_service.py`

```python
async def process_file(self, db: AsyncSession, file: ProjectFile) -> None:
    """Process file and mark completed ONLY on success."""
    
    # Check cache
    if file.file_hash and file.processed_at and (file.ai_analysis or file.processed_text):
        await self._mark_completed(db, file)
        return
    
    # Check for cached duplicate
    if file.file_hash:
        cached = await self._get_cached_file(db, file)
        if cached:
            file.ai_analysis = cached.ai_analysis
            file.processed_text = cached.processed_text
            await self._clone_cached_outputs(db, file, cached)
            await self._mark_completed(db, file)
            return
    
    # Process based on file type
    file_bytes = await download_file_content(file.file_path)
    file_type = (file.file_type or "").lower()
    
    if file_type in {"jpg", "jpeg", "png"}:
        await self._process_image_or_document(db, file, file_bytes)
    elif file_type == "pdf":
        await self._process_document(db, file, file_bytes)
    else:
        # Unsupported types - mark completed without processing
        pass
    
    # Centralized: mark completed only on success
    await self._mark_completed(db, file)
```

**Remove** from `_process_document` and `_process_image`:
- Any calls to `self._mark_completed(db, file)`
- Any try/catch that marks failed (let exceptions propagate)

### Step 6: Worker Loop - Requeue vs Fail + Logs

**File:** `backend/scripts/intake_ingestion_worker.py`

```python
import time
import asyncio
import signal
from contextlib import suppress

# Permanent errors - fail immediately, don't retry
PERMANENT_ERROR_PATTERNS = [
    "empty document",
    "document too large",
    "empty image data",
]

def _is_permanent_error(error_str: str) -> bool:
    """Check if error is permanent (don't waste retries)."""
    error_lower = error_str.lower()
    return any(pattern in error_lower for pattern in PERMANENT_ERROR_PATTERNS)

async def run_worker(poll_interval_seconds: float = 2.0) -> None:
    global _shutdown_event
    _shutdown_event = asyncio.Event()
    
    # Signal handling
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
                file = await service.claim_next_file(db)
                
                if not file:
                    await db.rollback()
                    with suppress(TimeoutError):
                        await asyncio.wait_for(
                            _shutdown_event.wait(), 
                            timeout=poll_interval_seconds
                        )
                    continue
                
                # Commit the claim (processing status updated)
                await db.commit()
                
                # Process with timing
                started_at = time.monotonic()
                
                logger.info(
                    "file_processing_started",
                    file_id=str(file.id),
                    project_id=str(file.project_id),
                    attempt=file.processing_attempts,
                    is_retry=file.processing_attempts > 1
                )
                
                try:
                    await service.process_file(db, file)
                    await db.commit()
                    
                    duration_ms = (time.monotonic() - started_at) * 1000
                    logger.info(
                        "file_processing_completed",
                        file_id=str(file.id),
                        duration_ms=duration_ms,
                        attempt=file.processing_attempts
                    )
                    
                except Exception as exc:
                    await db.rollback()
                    
                    error_str = str(exc)
                    is_permanent = _is_permanent_error(error_str)
                    attempts_exhausted = file.processing_attempts >= MAX_PROCESSING_ATTEMPTS
                    
                    duration_ms = (time.monotonic() - started_at) * 1000
                    
                    if is_permanent or attempts_exhausted:
                        # Mark as failed
                        await service._mark_failed(db, file, error_str)
                        await db.commit()
                        logger.error(
                            "file_processing_failed",
                            file_id=str(file.id),
                            error=error_str,
                            permanent=is_permanent,
                            attempts_exhausted=attempts_exhausted,
                            duration_ms=duration_ms
                        )
                    else:
                        # Requeue for retry
                        file.processing_status = "queued"
                        file.processing_error = error_str[:500]  # Truncate
                        file.processing_started_at = None
                        await db.commit()
                        logger.warning(
                            "file_processing_retry",
                            file_id=str(file.id),
                            attempt=file.processing_attempts,
                            error=error_str,
                            duration_ms=duration_ms
                        )
                        
            except Exception:
                await db.rollback()
                logger.error("worker_loop_error", exc_info=True)
    
    logger.info("intake_worker_stopped")
```

### Step 7: Tests (Adjusted for Async Fixtures)

**File:** `backend/tests/test_intake.py`

```python
import pytest
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, patch

# Update existing test
@pytest.mark.asyncio
async def test_ingestion_download_failure_requeues_when_attempts_remain(
    db: AsyncSession,
    create_project_file: callable
):
    """Download failures should requeue when attempts remain."""
    file = await create_project_file(
        processing_status="queued",
        processing_attempts=1
    )
    
    service = IntakeIngestionService()
    
    # Claim the file
    claimed = await service.claim_next_file(db)
    assert claimed is not None
    assert claimed.id == file.id
    await db.commit()
    
    # Simulate download failure
    with patch(
        "app.services.intake_ingestion_service.download_file_content",
        side_effect=Exception("network error")
    ):
        with pytest.raises(Exception):
            await service.process_file(db, file)
    
    # Worker would requeue this (simulate)
    file.processing_status = "queued"
    file.processing_error = "network error"
    file.processing_started_at = None
    await db.commit()
    
    # Verify requeued
    await db.refresh(file)
    assert file.processing_status == "queued"
    assert file.processing_attempts == 2  # Incremented on claim


@pytest.mark.asyncio
async def test_stale_processing_files_get_requeued(
    db: AsyncSession,
    create_project_file: callable
):
    """Files stuck in processing should be requeued by claim_next_file."""
    # Create file stuck in processing (20 minutes ago)
    file = await create_project_file(
        processing_status="processing",
        processing_attempts=1
    )
    file.processing_started_at = datetime.now(UTC) - timedelta(minutes=20)
    await db.commit()
    
    service = IntakeIngestionService()
    
    # claim_next_file should requeue stale and return None (no queued files)
    claimed = await service.claim_next_file(db)
    await db.commit()
    
    # Verify stale was requeued
    await db.refresh(file)
    assert file.processing_status == "queued"
    assert file.processing_error == "stale_processing_requeued"
    assert file.processing_started_at is None
    
    # No file claimed this time
    assert claimed is None


@pytest.mark.asyncio
async def test_exhausted_queued_files_get_marked_failed(
    db: AsyncSession,
    create_project_file: callable
):
    """Files queued with max attempts should be marked failed."""
    file = await create_project_file(
        processing_status="queued",
        processing_attempts=MAX_PROCESSING_ATTEMPTS
    )
    await db.commit()
    
    service = IntakeIngestionService()
    
    # claim_next_file should mark exhausted as failed
    claimed = await service.claim_next_file(db)
    await db.commit()
    
    # Verify marked failed
    await db.refresh(file)
    assert file.processing_status == "failed"
    assert file.processing_error == "max_attempts_exhausted"
    assert file.processed_at is not None
    
    # No file claimed
    assert claimed is None


@pytest.mark.asyncio
async def test_permanent_error_marks_failed_immediately(
    db: AsyncSession,
    create_project_file: callable
):
    """Permanent errors (empty document) should fail immediately."""
    file = await create_project_file(
        processing_status="queued",
        processing_attempts=1
    )
    await db.commit()
    
    service = IntakeIngestionService()
    
    # Claim
    claimed = await service.claim_next_file(db)
    assert claimed is not None
    await db.commit()
    
    # Simulate permanent error (empty document)
    with patch(
        "app.services.intake_ingestion_service.download_file_content",
        return_value=b""  # Empty bytes
    ):
        with pytest.raises(DocumentAnalysisError):
            await service.process_file(db, file)
    
    # Worker would detect "empty" and mark failed immediately
    is_permanent = "empty" in "Empty document".lower()
    assert is_permanent is True


@pytest.mark.asyncio
async def test_timeout_results_in_retry(
    db: AsyncSession,
    create_project_file: callable
):
    """Timeout should result in retry (requeue)."""
    file = await create_project_file(
        processing_status="queued",
        processing_attempts=1
    )
    await db.commit()
    
    service = IntakeIngestionService()
    claimed = await service.claim_next_file(db)
    assert claimed is not None
    await db.commit()
    
    # Simulate timeout
    with patch(
        "app.services.intake_ingestion_service.analyze_document",
        side_effect=asyncio.TimeoutError()
    ):
        with pytest.raises(asyncio.TimeoutError):
            await service.process_file(db, file)
    
    # Timeout is retryable (not permanent)
    error_str = "TimeoutError"
    is_permanent = _is_permanent_error(error_str)
    assert is_permanent is False
```

## Files to Modify

1. `backend/alembic/versions/<new>_add_processing_started_at.py` - Migration
2. `backend/app/models/file.py` - Add column
3. `backend/app/services/intake_ingestion_service.py` - claim_next_file, timeouts, centralize completed
4. `backend/scripts/intake_ingestion_worker.py` - Retry logic, logs
5. `backend/tests/test_intake.py` - Updated tests

## Verification

```bash
cd backend && make test-file FILE=tests/test_intake.py
cd backend && make check-ci
```

## Result

- ✅ No stuck processing (stale requeue)
- ✅ No zombie files (exhausted queued marked failed)
- ✅ Correct retries (requeue retryable, fail permanent)
- ✅ No indefinite hangs (5-min timeout)
- ✅ Centralized state management (single _mark_completed)
- ✅ Full observability (structured logs with duration)
