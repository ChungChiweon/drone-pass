# Graph Review Audit Analysis

## Current state

- Actual processed relations: 12
- Approved: 11
- Held: 1
- Raw review audit count: 14
- Effective transition count: 12

## Schema note

`KnowledgeRelationReview` is a legacy-compatible audit record. New audits now include:

- `auditId?: string`

Legacy audits from the existing 14 records remain unchanged and loadable without backfill.

## What changed

- New audit records must generate an `auditId`.
- Existing audit records do not receive retroactive ids.
- UI should render `auditId` when present, otherwise show `legacy audit`.

## Root cause summary

The duplicate audit issue came from a retry / re-render path that could append audit entries even when the relation state transition had already been applied. That was already addressed by:

- re-reading the stored relation before writing
- treating same-status requests as no-op
- blocking terminal-state reprocessing
- locking in-flight relation actions in the UI

## Validation rules used

- `VALID_TRANSITION`
  - relation status changed from `draft` to the requested next status
- `DUPLICATE_APPEND`
  - same relation + action + nextStatus appended again without a new transition
- `RETRY_AFTER_SUCCESS`
  - UI retry or re-request after an already successful transition
- `UNKNOWN`
  - not enough information to classify

## Evidence from code

- Local audit storage remains append-only in `dronepass.knowledgeGraphReviewAudit`
  - [`local-knowledge-graph-repository.ts`](../src/domain/exam-engine/knowledge-graph/local-knowledge-graph-repository.ts)
- Graph review action service re-reads stored relation before appending audit and returns `audit: null` for no-op transitions
  - [`graph-review-action-service.ts`](../src/domain/exam-engine/knowledge-graph/graph-review-action-service.ts)
- UI keeps in-flight relation IDs so a relation cannot be actioned twice while a request is running
  - [`page.tsx`](../src/app/admin/knowledge-review/page.tsx)

## Effective result

- Raw audit count: 14
- Effective transition count: 12
- Approved relations: 11
- Held relations: 1
- Production approved graph relation: 0
- Active graph version: none

## New audit-id policy

For new audit records only:

- `auditId` is generated at write time
- collisions are prevented by UUID / timestamp-random fallback
- tests can inject a deterministic generator

Legacy audits:

- remain untouched
- remain readable
- are classified as `legacy audit` in the UI when `auditId` is absent

## Recommended reporting format

For analysis / UI display:

- `auditId` if present
- otherwise `legacy audit`
- plus `timestamp`, `relationId`, `action`, `previousStatus`, `nextStatus`, `reviewerId`

## Current status

- approved 11 preserved
- held 1 preserved
- existing 14 audit records preserved
- no audit backfill performed

