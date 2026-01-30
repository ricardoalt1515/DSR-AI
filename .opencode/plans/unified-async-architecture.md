# Unified Async Processing Architecture Plan

> **Status**: Draft  
> **Created**: 2026-01-28  
> **Goal**: Simplify current architecture while preparing for Textract integration

---

## Current State Analysis

### What's Working
- Notes analysis: Direct API call (simple, correct)
- Document processing: DB-polling worker (over-engineered for current needs)
- Proposal generation: BackgroundTasks (loses jobs on restart)

### Problems Identified
1. **Worker complexity**: Polling every 2s wastes resources
2. **Job loss**: Proposals disappear on server restart
3. **Inconsistent patterns**: 3 different async approaches
4. **Future need**: Textract requires async handling (1-5min jobs)

---

## Phase 1: Immediate Simplification (This Week)

### Goal
Remove worker, process everything directly. Optimize for 0 users, simple codebase.

### Changes

#### 1.1 Remove Document Worker
**Delete:**
- `backend/scripts/intake_ingestion_worker.py`
- `backend/scripts/healthcheck_intake_worker.py`
- Worker from `docker-compose.yml`
- Worker from Terraform

#### 1.2 Simplify File Upload
**Modify:** `backend/app/api/v1/files.py`

```python
@router.post("/upload")
async def upload_file(
    file: UploadFile,
    db: AsyncDB,
    current_user: CurrentUser,
) -> FileUploadResponse:
    # Save to S3
    file_record = await save_file_to_s3(file, db, current_user)
    
    # Process immediately (5-30s is acceptable for MVP)
    try:
        analysis = await IntakeIngestionService().process_file_direct(db, file_record)
        file_record.processing_status = "completed"
        file_record.ai_analysis = analysis
    except Exception as e:
        file_record.processing_status = "failed"
        file_record.processing_error = str(e)
    
    await db.commit()
    return FileUploadResponse(
        id=file_record.id,
        status=file_record.processing_status,
        suggestions=analysis.suggestions if analysis else [],
    )
```

#### 1.3 Fix Proposal Durability
**Modify:** `backend/app/models/proposal.py`

Add columns (like ProjectFile):
```python
processing_status: Mapped[str] = mapped_column(
    String(20), default="pending"
)  # pending, processing, completed, failed
processing_error: Mapped[str | None] = mapped_column(Text)
processing_started_at: Mapped[datetime | None]
processing_completed_at: Mapped[datetime | None]
```

**Modify:** `backend/app/api/v1/proposals.py`

```python
@router.post("/generate")
async def generate_proposal(...):
    # Create proposal with status
    proposal = await ProposalService.create_proposal(status="processing")
    
    # Background task (acceptable for 60-120s)
    background_tasks.add_task(process_proposal, proposal.id)
    
    return proposal  # User polls GET /proposals/{id}
```

#### 1.4 Database Migration
```sql
-- Add proposal processing tracking
ALTER TABLE proposals ADD COLUMN processing_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE proposals ADD COLUMN processing_error TEXT;
ALTER TABLE proposals ADD COLUMN processing_started_at TIMESTAMP;
ALTER TABLE proposals ADD COLUMN processing_completed_at TIMESTAMP;
```

### Phase 1 Success Criteria
- [ ] Worker container removed
- [ ] File upload processes directly (no queue)
- [ ] Proposals persist across restarts
- [ ] All tests pass
- [ ] Simpler mental model (no workers to debug)

---

## Phase 2: Textract Integration (Next 2-4 Weeks)

### Goal
Add OCR capability using AWS Textract. Requires async handling (1-5min jobs).

### Architecture

```
┌──────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Upload PDF  │────▶│  PostgreSQL  │────▶│  FastAPI        │
│  (files.py)  │     │  status=     │     │  Start Textract │
└──────────────┘     │  textract_   │     └────────┬────────┘
                     │  pending     │              │
                     └──────────────┘              ▼
                                          ┌─────────────────┐
                                          │  AWS Textract   │
                                          │  (1-5 min)      │
                                          └────────┬────────┘
                                                   │
                                          ┌────────┴────────┐
                                          ▼                 ▼
                                   ┌─────────────┐   ┌──────────────┐
                                   │  SNS Topic  │   │  SQS DLQ     │
                                   │  (success)  │   │  (failures)  │
                                   └──────┬──────┘   └──────────────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  Lambda      │
                                   │  (webhook)   │
                                   └──────┬───────┘
                                          │
                                          ▼
                                   ┌──────────────┐
                                   │  Update DB   │
                                   │  status=     │
                                   │  textract_   │
                                   │  completed   │
                                   └──────┬───────┘
                                          │
                              ┌───────────┼───────────┐
                              ▼           ▼           ▼
                        ┌──────────┐ ┌──────────┐ ┌──────────┐
                        │  Worker  │ │  OpenAI  │ │  Store   │
                        │  claims  │ │  Analysis│ │  Results │
                        │  job     │ │          │ │          │
                        └──────────┘ └──────────┘ └──────────┘
```

### Changes

#### 2.1 AWS Infrastructure (Terraform)
```hcl
# SNS Topic for Textract completion
resource "aws_sns_topic" "textract_completion" {
  name = "textract-completion"
}

# SQS Queue for DLQ
resource "aws_sqs_queue" "textract_dlq" {
  name = "textract-dlq"
}

# Lambda for processing completions
resource "aws_lambda_function" "textract_webhook" {
  function_name = "textract-webhook"
  handler       = "index.handler"
  runtime       = "python3.11"
  # ...
}
```

#### 2.2 Database Schema
```sql
-- Add Textract tracking to project_files
ALTER TABLE project_files ADD COLUMN textract_job_id VARCHAR(64);
ALTER TABLE project_files ADD COLUMN textract_status VARCHAR(20);
ALTER TABLE project_files ADD COLUMN textract_started_at TIMESTAMP;
ALTER TABLE project_files ADD COLUMN textract_completed_at TIMESTAMP;
ALTER TABLE project_files ADD COLUMN textract_result_s3_key VARCHAR(512);
```

#### 2.3 New Worker (Unified)
Create `backend/scripts/unified_worker.py`:

```python
async def run_worker():
    while True:
        # Priority 1: Textract completions (process results)
        textract_job = await claim_textract_completion()
        if textract_job:
            await process_textract_result(textract_job)
            continue
        
        # Priority 2: Proposals
        proposal = await claim_next_proposal()
        if proposal:
            await process_proposal(proposal)
            continue
        
        await sleep(2)
```

#### 2.4 Textract Service
Create `backend/app/services/textract_service.py`:

```python
class TextractService:
    async def start_document_analysis(self, file: ProjectFile) -> str:
        """Start Textract job, return job_id."""
        response = self.textract.start_document_text_detection(
            DocumentLocation={
                'S3Object': {
                    'Bucket': settings.S3_BUCKET,
                    'Name': file.file_path
                }
            },
            NotificationChannel={
                'SNSTopicArn': settings.TEXTRACT_SNS_TOPIC_ARN,
                'RoleArn': settings.TEXTRACT_ROLE_ARN
            }
        )
        return response['JobId']
    
    async def get_document_text(self, job_id: str) -> str:
        """Get OCR results from completed job."""
        # Paginate through results
        # Extract LINE blocks
        # Return plain text
```

### Phase 2 Success Criteria
- [ ] PDFs processed through Textract
- [ ] OCR text fed to OpenAI for analysis
- [ ] SNS → Lambda → DB flow working
- [ ] Worker processes Textract completions
- [ ] Failed jobs go to DLQ

---

## Phase 3: Scale (Future)

### Triggers for Phase 3
- > 1000 jobs/day
- Need horizontal scaling
- Multiple worker types needed

### Options

#### Option A: SQS (Recommended)
Replace DB polling with SQS:
```python
# Instead of polling PostgreSQL
job = await claim_next_job_from_db()

# Use SQS
messages = await sqs.receive_message(QueueUrl=queue_url)
```

**Pros:**
- Better visibility (queue depth metrics)
- Lower DB load
- Native AWS integration

**Cons:**
- Adds infrastructure (SQS)
- More complex local dev

#### Option B: Celery
```python
# tasks.py
@celery_app.task
def process_document(file_id: str):
    # Process file
    pass

# API
process_document.delay(file_id)
```

**Pros:**
- Python-native
- Rich ecosystem
- Monitoring tools

**Cons:**
- Adds Redis dependency
- More moving parts

#### Option C: Step Functions
For complex workflows only.

**When to use:**
- Multi-step approval processes
- Human-in-the-loop
- Complex error handling

**Cost:** ~$400+/month (avoid until needed)

---

## Decision Matrix

| Scenario | Solution | Phase |
|----------|----------|-------|
| < 100 jobs/day | Direct processing | 1 |
| 100-1000 jobs/day | DB-polling worker | 2 |
| > 1000 jobs/day | SQS | 3 |
| Textract integration | SNS + Lambda + Worker | 2 |
| Complex workflows | Step Functions | 3 (if ever) |

---

## Files to Create/Modify

### Phase 1
```
DELETE:
- backend/scripts/intake_ingestion_worker.py
- backend/scripts/healthcheck_intake_worker.py

MODIFY:
- backend/app/api/v1/files.py (direct processing)
- backend/app/api/v1/proposals.py (DB status tracking)
- backend/app/models/proposal.py (add status columns)
- backend/app/services/intake_ingestion_service.py (simplify)
- docker-compose.yml (remove worker)
- infrastructure/ (remove worker resources)

MIGRATE:
- Add proposal processing columns
```

### Phase 2
```
CREATE:
- backend/scripts/unified_worker.py
- backend/app/services/textract_service.py
- backend/app/models/job_queue.py (unified queue)
- infrastructure/textract.tf (SNS, Lambda, IAM)
- lambdas/textract_webhook.py

MODIFY:
- backend/app/api/v1/files.py (Textract integration)
- backend/app/models/project_file.py (Textract columns)
- docker-compose.yml (add unified worker)

MIGRATE:
- Add Textract columns to project_files
- Create job_queue table
```

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Phase 1 removes worker, Phase 2 adds it back | Acceptable - simpler now, correct later |
| Textract takes 1-5min, blocks request | Phase 1: Acceptable for MVP. Phase 2: Async |
| Job loss on restart (proposals) | Phase 1: Add DB status columns |
| AWS costs | Phase 2: ~$150/month for 10K docs |
| Local dev complexity | Phase 2: Mock Textract in dev |

---

## Success Metrics

### Phase 1
- Lines of code: -200
- Containers: -1
- Time to debug: Faster (no worker logs)
- User experience: Same

### Phase 2
- OCR accuracy: > 90%
- Processing time: 1-5min (acceptable)
- Failure rate: < 1%
- Cost per doc: ~$0.015

---

## Open Questions

1. **Should we skip Phase 1 and go directly to Phase 2?**
   - No. Simplify first, then add complexity.

2. **Should proposals use the same worker as documents in Phase 2?**
   - Yes. Unified worker is simpler.

3. **What if Textract is delayed?**
   - Phase 1 works without it. Can stay in Phase 1 indefinitely.

4. **Should we use Celery instead of custom worker?**
   - Not yet. Custom worker is simpler for our use case.

---

## Next Steps

1. **Review this plan** with team
2. **Implement Phase 1** (1-2 days)
3. **Test thoroughly** (no worker = simpler testing)
4. **Plan Phase 2** when Textract is ready
5. **Monitor metrics** to decide Phase 3

---

## References

- [SQLAlchemy Pooling Best Practices](https://docs.sqlalchemy.org/en/20/core/pooling.html)
- [AWS Textract Developer Guide](https://docs.aws.amazon.com/textract/latest/dg/what-is.html)
- [FastAPI BackgroundTasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- [SQS vs Step Functions](https://aws.amazon.com/blogs/compute/choosing-between-messaging-services/)
