# Multi Source Fusion Report

## Source Registry

| Source | Type | Priority | Version | Priority score |
| --- | --- | --- | --- | --- |
| air-safety-act | LAW | OFFICIAL_PRIMARY | 2026-current | 0.980 |
| air-safety-decree | DECREE | OFFICIAL_SECONDARY | 2026-current | 0.820 |
| official-guide | GUIDELINE | OFFICIAL_SECONDARY | 2026-guide | 0.700 |

## Source Relationships

| Parent | Child | Type |
| --- | --- | --- |
| air-safety-act | air-safety-decree | IMPLEMENTS |
| air-safety-decree | official-guide | EXPLAINS |

## Fusion Result

| Metric | Value |
| --- | --- |
| Merged facts | 3 |
| Fusion confidence | 0.390 |
| Supporting sources | 5 |
| Preferred source | air-safety-act |

## Evidence Merge

| Pattern | Sources | Agreement | Confidence increase |
| --- | --- | --- | --- |
| concept:report:cat-report-procedure:150 | 3 | 1.000 | 0.240 |

## Conflicts

| Conflict | Severity | Type | Reason |
| --- | --- | --- | --- |
| conflict-law-002-textbook-002-NUMERIC_MISMATCH | HIGH | NUMERIC_MISMATCH | numeric values differ: 25 vs 30 |

## Auto Promotion Change

| Metric | Before | After Fusion |
| --- | --- | --- |
| Decision | AUTO_APPROVE_CANDIDATE | AUTO_APPROVE_CANDIDATE |
| Score | 0.900 | 1.000 |

## Coverage Change

| Metric | Before | After Fusion Simulation |
| --- | --- | --- |
| Possible questions | 26 | 29 |
| Missing coverage | 3 | 3 |

## Decision Support

- SOURCE_FUSION_REQUIRED: use this when a candidate has only one weak source, or when law/decree/guideline sources have not been cross-checked.
- Conflicting numeric/date/condition evidence must stay in human review.

## Safety

- No AtomicFact creation.
- No Fact status change.
- No KnowledgePack write.
- No Graph or Graph Version change.
- No Question DB write.
- No Supabase change.
