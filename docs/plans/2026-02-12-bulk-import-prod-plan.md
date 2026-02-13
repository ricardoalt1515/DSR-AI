# Plan/Spec: Bulk Import Production Readiness

**Generated**: 2026-02-12
**Decision**: Dedicated ECS service, 1 task (mirrors intake worker)
**Source of truth deps**: `backend/requirements.txt`
**Goals**: simplicity, maintainability, producibility

## Overview
Ship bulk-import to prod via a dedicated ECS worker service, reuse backend image/config, keep minimal moving parts.

## Architecture (chosen)
- **Worker model**: Dedicated ECS service `bulk-import-worker` using backend image; command `python /app/scripts/bulk_import_worker.py`.
- **Why**: isolate from API load, same ops as `intake_worker`, simple scaling via desired_count.
- **No new queue**: Keep DB polling/lease model already implemented.

## Scope
- Infra: ECS task/service, desired_count var, outputs, alarms, logs.
- Deploy: redeploy worker on image push.
- Dependencies: align `pyproject.toml` to `requirements.txt`.
- Validation: upload → review → finalize; logs/health.

## Non-goals
- No worker autoscaling policies (add later if needed).
- No new orchestration system (SQS/Celery/etc).
- No changes to business logic in bulk import.

## Implementation Plan

### Sprint 1 — Infra wiring (ECS + alarms)
**Goal**: Worker runs in prod with healthcheck + monitoring.
**Demo/Validation**: `terraform plan` shows new ECS task/service + alarm; deploy creates running task.

1. **ECS task definition**
   - **Location**: `infrastructure/terraform/prod/ecs.tf`
   - **Add**: `aws_ecs_task_definition.bulk_import_worker` (copy intake worker)
   - **Command**: `python /app/scripts/bulk_import_worker.py`
   - **Healthcheck**: `python /app/scripts/healthcheck_bulk_import_worker.py`
   - **Logs**: stream prefix `bulk-import-worker`

2. **ECS service**
   - **Location**: `infrastructure/terraform/prod/ecs.tf`
   - **Add**: `aws_ecs_service.bulk_import_worker`
   - **desired_count**: `var.ecs_bulk_import_worker_desired_count`
   - **Network/Security**: match intake worker (private subnets + ecs_tasks SG)

3. **Vars + outputs**
   - **Location**: `infrastructure/terraform/prod/variables.tf`
   - **Add**: `ecs_bulk_import_worker_desired_count` (default 1)
   - **Location**: `infrastructure/terraform/prod/outputs.tf`
   - **Add**: service name + task family outputs for bulk worker

4. **CloudWatch alarms**
   - **Location**: `infrastructure/terraform/prod/cloudwatch.tf`
   - **Add**: `bulk-import-worker-down` alarm (RunningTaskCount < 1)
   - **Condition**: enabled if desired_count > 0 and env == prod

5. **tfvars**
   - **Location**: `infrastructure/terraform/prod/terraform.tfvars`
   - **Add**: `ecs_bulk_import_worker_desired_count = 1`

### Sprint 2 — Deploy
**Goal**: One command redeploys backend + worker with same image.
**Demo/Validation**: deploy script triggers new tasks for both services.

1. **Deploy script update**
   - **Location**: `scripts/deploy-backend.sh`
   - **Add**: `ECS_BULK_IMPORT_WORKER_SERVICE` env var
   - **Add**: `aws ecs update-service --service <bulk-worker>` on deploy

2. **Follow-up**: new script `scripts/deploy-workers.sh` (optional)
   - Wraps `update-service` for `intake_worker` + `bulk_import_worker`

### Sprint 3 — Dependency sync
**Goal**: eliminate drift between runtime deps and declared deps.
**Demo/Validation**: diff shows parity; Docker build installs required libs.

1. **Align deps**
   - **Source of truth**: `backend/requirements.txt`
   - **Action**: update `backend/pyproject.toml` to match (add missing + remove extras)

2. **Guardrail (optional)**
   - Add CI check or script to compare lists and fail on drift

### Sprint 4 — Validation
**Goal**: Prove end-to-end on prod infra.
**Demo/Validation**: upload → `review_ready` → finalize; logs show `bulk_import_start/end`, healthcheck OK, alarm silent.

## Testing Strategy
- Infra: `terraform plan` + apply in staging/prod.
- Runtime: small-file smoke + logs + alarm config.

## Risks & Mitigations
- **Worker not redeployed** → deploy updates both services.
- **Dependency drift** → align deps (optional CI guardrail).
- **Silent failure** → healthcheck + RunningTaskCount alarm.

## Rollback
- Set `ecs_bulk_import_worker_desired_count = 0` and apply.
- Revert deploy script change if needed.

## Open Questions
- None (default: dedicated ECS service, desired_count=1).
