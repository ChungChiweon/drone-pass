# SOURCE-BATCH-002B table and footnote validation

## Scope and decision

This batch processed only the nine table-level exceptions emitted by SOURCE-BATCH-002A. It did not add a source, create or approve an AtomicFact, change the Knowledge Pack or graph, generate a question, or write to Supabase.

Final table-layer decision: **TABLE_LAYER_PARTIAL**. Official renderings were acquired for all seven referenced annexes (13 pages), but five logical tables still have a boundary or footnote-scope warning. The result is intentionally not forced to `TABLE_LAYER_VALIDATED`.

## Fixed exception scope

| Table | Annex | Result | Visual score | Remaining issue |
|---|---:|---|---:|---|
| `attachment:1:table:1` | 1 | VERIFIED_WITH_WARNINGS | 0.9514 | row-boundary count |
| `attachment:3:table:1` | 3 | VERIFIED | 1.0000 | none |
| `attachment:3:table:2` | 3 | VERIFIED | 1.0000 | none |
| `attachment:4:table:1` | 4 | VERIFIED_WITH_WARNINGS | 0.9375 | row-boundary count |
| `attachment:5:table:1` | 5 | VERIFIED_WITH_WARNINGS | 0.9750 | row-boundary count |
| `attachment:6:table:1` | 6 | VERIFIED_WITH_WARNINGS | 0.8333 | row-boundary and two footnote scopes |
| `attachment:7:table:1` | 7 | VERIFIED | 1.0000 | none |
| `attachment:7:table:2` | 7 | VERIFIED | 1.0000 | none |
| `attachment:8:table:1` | 8 | VERIFIED_WITH_WARNINGS | 0.9722 | row-boundary count |

Full IDs and component scores are in `work/source-ingestion/source-batch-002b/overlay-validation.json`.

## Official rendering provenance

The rendering links were discovered from the National Law Information Center attachment DOM for `(한국교통안전공단) 무인비행장치 조종자 증명 운영세칙`, current viewer sequence `2200000142833`. The batch uses only exact `https://www.law.go.kr/LSW/flDownload.do?flSeq=...` links exposed by that DOM.

- Annex 1: 2 pages
- Annex 3: 2 pages
- Annex 4: 1 page
- Annex 5: 1 page
- Annex 6: 2 pages
- Annex 7: 4 pages
- Annex 8: 1 page

Each local rendering has a SHA-256 checksum, page dimensions, DPI metadata, attachment version and source locator in `rendered-pages.json`. The page files are cached under `work/source-ingestion/source-batch-002b/rendered-pages/`. Browser screenshots were not used as the source image; the official page assets were downloaded directly from the DOM-exposed URLs.

## Coordinate overlay validation

The validator measures ruled table boundaries from the official image coordinates and compares row/column counts against the existing `PrecisionTableModel`. It separately records boundary, row, column, merged-region, text, header, continuation and footnote-area scores. A page without a table is not treated as a failed table boundary when another page in the same annex contains the table (Annex 6 is the concrete case).

Four logical tables reached `VERIFIED`. Five remain `VERIFIED_WITH_WARNINGS`; none is declared verified without an official rendering. The average visual match is **0.9633**, above the 0.95 aggregate target, while table-level exceptions remain and therefore prevent full validation.

## Footnote markers and scope

The official viewer text layer was captured as coordinate-bearing character spans, avoiding OCR where a text layer exists. Two `*` markers were detected on Annex 6 page 2. Both are visible beneath the table, but the existing extracted model does not prove which row/cell set each marker governs. They are therefore retained as `UNRESOLVED` with confidence 0.75 rather than being attached heuristically.

Detected marker count: **2**. Resolved scope count: **0**. Unresolved scope count: **2**. Footnote link rate: **0.0000**. This metric is not converted to 1.0 merely because a candidate previously contained no linked footnote.

Semantic interpretation is conservative:

- a common note may become `WHOLE_TABLE` only with explicit table-level evidence;
- a row/cell condition requires a positional marker-to-cell anchor;
- explanatory prose remains `NON_FACTUAL_NOTE` unless it changes applicability;
- scope confidence below 0.90 blocks the related candidate.

## Precision Candidate v2 and HIGH revalidation

All 86 prior candidate IDs are preserved. Version 2 adds supersession metadata, official visual score, verified boundary boxes, marker IDs, blockers and table validation status. The prior candidate files are unchanged.

For the 59 HIGH-relevance candidates:

- VALIDATED: **20**
- REVIEW_REQUIRED: **39**
- REJECTED: **0**

Validation requires visual score ≥0.95, table structure ≥0.95, condition completeness ≥0.90, numeric completeness ≥0.98, footnote completeness ≥0.90 and zero blockers. `VALIDATED` is an analysis result only and does not promote a candidate or approve an AtomicFact.

## Manual review queue

Human review was reduced to **5 table-level items**, not 59 candidate-level items:

1. Annex 1 table 1 — row boundary alignment
2. Annex 4 table 1 — row boundary alignment
3. Annex 5 table 1 — row boundary alignment
4. Annex 6 table 1 — row boundary plus two `*` scopes
5. Annex 8 table 1 — row boundary alignment

The queue lists affected candidate IDs only as impact context. The requested action is to compare the flagged region once at table level.

## Quality metrics

| Metric | Result | Target | Decision |
|---|---:|---:|---|
| mergedCellResolutionRate | 1.0000 | 0.95 | PASS |
| conditionPreservationRate | 1.0000 | 0.90 | PASS |
| numericPreservationRate | 1.0000 | 0.98 | PASS |
| footnoteLinkRate | 0.0000 | 0.90 | PARTIAL |
| visualMatchRate | 0.9633 | 0.95 | aggregate PASS |
| highCandidateValidationRate | 0.3390 | — | informational |
| unresolvedTableRate | 0.5556 | 0 | PARTIAL |

## Coverage change and next step

The coverage matrix now contains a read-only `sourceBatch002BIngestion` section: 4 validated tables, 5 unresolved tables, 20 validated HIGH candidates, 39 review-required HIGH candidates, 0 resolved and 2 unresolved footnotes. The topic and pack are not marked `PRODUCTION_READY`.

The next safe step is a narrowly scoped visual review of the five table queue entries, especially the two Annex 6 markers. SOURCE-BATCH-003 should not be used to hide these unresolved exceptions.

## Mutation statement

Pack mutation: **0**. AtomicFact mutation: **0**. Graph mutation: **0**. Question persistence: **0**. Supabase mutation: **0**.
