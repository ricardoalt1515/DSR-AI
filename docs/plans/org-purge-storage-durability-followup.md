# Follow-up: Durable Storage Cleanup for Organization Purge

Status: planned for follow-up PR (not in current patch).

Current state note:

- On storage cleanup pending/failure, recovery path is durable manifest + manual replay.
- Automatic worker retries are follow-up scope.

## Problem

- Current purge commits DB delete first, then runs storage cleanup.
- If storage cleanup fails, DB is already purged and storage objects can remain orphaned.

## Goal

- Guarantee eventual storage cleanup with durable recovery path.
- Keep auditable state for every purge request.

## Proposed design (next PR)

1. Add purge manifest table (outbox pattern):
   - `id`, `org_id`, `storage_keys`, `status`, `attempts`, `last_error`, `created_at`, `updated_at`.
2. In purge transaction:
   - delete DB tenant data.
   - insert manifest row with storage keys and `status=pending`.
   - commit once.
3. Background worker:
   - poll pending manifests.
   - perform storage deletion with retries and backoff.
   - mark `completed` or `failed` with error details.
4. Observability:
   - structured logs + metrics for queue depth, retries, failures, completion latency.
5. Runbook:
   - operator commands for replaying failed manifests.

## Acceptance criteria

- No purge request can lose storage cleanup intent.
- Failed cleanup remains retriable until success.
- Full audit visibility for pending/failed/completed manifests.
