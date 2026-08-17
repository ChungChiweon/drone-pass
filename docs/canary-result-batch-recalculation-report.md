# Canary Result Batch Recalculation Report

> Historical development experiment. Its question-count target is unrelated to full exam Source Coverage and is excluded from current operations.

## 1. Repository current state

- Pack: `kr-drone-license:mrm0omvd`
- AtomicFact: 433
- Approved Fact: 30
- Classic / Graph-aware generated questions: 30 / 30
- Active graph relations: 11
- Batch 1 already approved: `AF-063`, `AF-064`, `AF-065`, `AF-066`
- Batch 1 remaining draft: `AF-061`, `AF-069`–`AF-077` (10 facts)

The former report counted 12 remaining facts and projected 42 questions. That projection was stale: `AF-063` and `AF-064` were already approved, so they cannot be counted again.

## 2. Successful canary impact

The completed `AF-065`/`AF-066` composite canary increased approved facts and generated questions without uniqueness, duplicate-distractor, unsafe-distractor, validation, or runtime failures. It is a valid positive sample only for its complete composite group; it does not prove that unrelated incomplete or OR-composite facts are independently promotable.

## 3. Remaining candidate re-evaluation

| Candidate | Repository | Decision | Compiler eligible | Reason |
| --- | --- | --- | --- | --- |
| AF-061 | draft | DEPENDENCY_REQUIRED | false | AND composite companion `AF-062` is outside the batch and remains draft |
| AF-069–AF-075 | draft | HOLD | false | OR composite facts are not independently compiler-eligible |
| AF-076 | draft | HOLD | false | OR composite/compiler restriction; strict gate also remains applicable |
| AF-077 | draft | HOLD | false | OR composite fact is not independently compiler-eligible |

No previous SAFE label was copied forward. Every remaining repository fact was re-evaluated under the current dependency and compiler rules.

## 4. Minimal complete promotion units

- `AF-061` cannot form a complete unit because `AF-062` is missing from the batch and is not approved.
- `AF-069`–`AF-077` remain non-eligible OR-composite units under the existing compiler contract.
- Eligible unit count: 0
- Selected fact count: 0

## 5. Target-40 optimization and virtual simulation

| Metric | Before | Safe virtual after |
| --- | ---: | ---: |
| Approved facts | 30 | 30 |
| Classic questions | 30 | 30 |
| Graph-aware questions | 30 | 30 |
| Selected units | 0 | 0 |

Target 40 is **not reachable** using only currently complete, strict-policy and compiler-eligible remaining Batch 1 units. The engine deliberately does not infer one question per approved fact.

## 6. Staged apply and rollback

No apply stage is emitted because no promotion unit passes every gate. The safety manifest still records the reconciled pack checksum, all per-fact gate results, active graph identity, and rollback conditions. It is a deterministic planning artifact, not an execution command.

Artifact: `work/batch-promotion/batch-1-apply-plan.json`

## 7. Batch 2 direction and decision support

- Batch 2: `SOURCE_EXPANSION_REQUIRED`
- Final readiness: `NEEDS_SOURCE_EXPANSION`
- Decision: `BATCH_SOURCE_EXPANSION_REQUIRED`
- Action: `REQUEST_SOURCE_EXPANSION`

Before category balancing proceeds, complete source-backed promotion units and compiler-compatible facts are needed. Lowering thresholds or treating incomplete composites as standalone questions is not permitted.

## 8. Safety confirmation

- AtomicFact status mutations: 0
- KnowledgePack mutations: 0
- Graph version/relation mutations: 0
- Question DB writes: 0
- Supabase changes: 0
- Existing approved facts re-approved: 0

The admin preview at `/admin/autonomous-promotion-batch-plan` is read-only and exposes no Apply control.
