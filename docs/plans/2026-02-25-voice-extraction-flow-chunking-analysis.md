# Voice Extraction Flow + Chunking Analysis

## Why this doc

Document current voice pipeline before further improvements.
Main concern: current chunking may be unnecessary for many interviews and may reduce extraction quality (especially location-stream linking).

## Current end-to-end flow (today)

1. User uploads audio in Voice Interview launcher.
2. API creates `VoiceInterview` + `ImportRun` (`source_type="voice_interview"`).
3. Worker claims run and enters voice path.
4. Audio transcribed with `gpt-4o-transcribe`.
5. Transcript saved to storage.
6. Transcript split into chunks.
7. Each chunk sent to AI extractor (voice prompt route).
8. Chunk outputs merged + deduped.
9. Import items built (`location`/`project`), with orphan handling for missing location context.
10. Review UI shows actionable groups + orphan picker.
11. User can import orphan streams to chosen location.
12. Finalize creates accepted/amended streams by selected groups.

Key code paths:
- `backend/app/api/v1/voice_interviews.py`
- `backend/scripts/bulk_import_worker.py`
- `backend/app/services/bulk_import_service.py`
- `backend/app/services/voice_transcription_service.py`
- `backend/app/services/bulk_import_ai_extractor.py`
- `backend/app/agents/bulk_import_extraction_agent.py`

## Current chunking behavior

In `bulk_import_service.py`:
- `VOICE_CHUNK_TOKENS = 4000`
- `VOICE_CHUNK_OVERLAP_TOKENS = 200`
- `VOICE_MAX_CHUNKS = 20`
- Implementation converts tokens to words with `* 0.75`, then slices by word window.

Important: each chunk is extracted independently; cross-chunk context is not jointly reasoned in one pass.

## Why chunking exists (valid reasons)

- Bound worst-case token/cost/latency.
- Avoid single huge request failing hard.
- Keep worker predictable for long transcripts.

## Why chunking is likely hurting us now

Observed in current UX/outputs:
- High orphan rate (`needs location`) despite clear location mentions.
- Duplicate or fragmented stream concepts across chunks.
- Inconsistent `location_ref` because stream and location evidence can land in different chunks.

Root cause:
- Word-window chunking loses semantic boundaries (speaker turn/topic/location section).
- Per-chunk extraction then dedupe cannot fully recover global context.

## Is chunking needed for 10-20 minute transcripts?

Usually not strictly needed.

Typical 10-20 min transcript size is often small enough for one extraction pass on current document models.
If full transcript fits comfortably, single-pass extraction should improve linking quality and reduce orphan noise.

## Recommended simple strategy (no architecture rewrite)

### Phase 1 (minimal, safe)

Adaptive extraction strategy:

1. If transcript length <= threshold (ex: <= 12k words), run single-pass extraction (no chunking).
2. If above threshold, fallback to chunking.
3. Keep existing schema and downstream logic unchanged.

Why:
- Very small code change.
- Preserves current fallback path.
- Best chance to improve location-stream grounding quickly.

### Phase 2 (still simple)

Improve fallback chunking only:
- Split by sentence/paragraph boundaries (not raw word slicing).
- Keep overlap smaller but context-aware.
- Keep dedupe key + orphan flow unchanged initially.

## Acceptance criteria for chunking change

Compare baseline vs adaptive on same transcript set:

1. Orphan rate decreases.
2. Wrong-link rate does not increase.
3. Streams created after first review increases.
4. Time/cost remains acceptable.

Suggested practical targets:
- Orphan rate: -20% relative.
- Wrong links: no regression.
- Created streams: +10% relative.

## Risks and safeguards

- Risk: larger single prompts may increase latency.
  - Safeguard: keep hard threshold + fallback chunking.
- Risk: model drift in one-pass mode.
  - Safeguard: same schema validation + existing tests.
- Risk: operational surprises on unusually long transcripts.
  - Safeguard: retain `VOICE_MAX_CHUNKS` fallback path.

## Recommendation

Proceed with adaptive strategy first (single-pass for short/medium transcripts, chunked fallback for long ones).
This is the simplest high-leverage improvement before any deeper redesign.
