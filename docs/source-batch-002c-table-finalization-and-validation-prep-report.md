# SOURCE-BATCH-002C — table finalization and legal-validation preparation

## Outcome

SOURCE-BATCH-002C processed exactly the five table packets left by 002B. The two Annex 6 footnotes were resolved from official page evidence, but no human reviewer decision was supplied for the five tables. They therefore remain fail-closed and the final result is **TABLE_LAYER_PARTIAL**.

No AtomicFact, Fact status, Knowledge Pack, Graph, Graph Version, question, Question DB or Supabase state was changed.

## Five fixed table packets

| Table | Previous issue | Packet result |
|---|---|---|
| `attachment:1:table:1` | row boundary | human decision required |
| `attachment:4:table:1` | row boundary | human decision required |
| `attachment:5:table:1` | row boundary | human decision required |
| `attachment:6:table:1` | row boundary and two footnote scopes | footnotes resolved; table decision required |
| `attachment:8:table:1` | row boundary | human decision required |

Each packet contains the official image, coordinate overlay, unresolved-region crop, current TableModel, affected candidate IDs and one to three review questions. Annex 6 additionally includes marker and note-block crops. Packets are stored in `work/source-ingestion/source-batch-002c/table-review-packets/`.

## Annex 6 footnote decisions

### Marker 1

- Result: `RESOLVED_EXACT`
- Scope: `MULTIPLE_CELLS`
- Confidence: `0.98`
- Target rows: 1, 4 and 5
- Target specification cells: cell 4, cell 10 and cell 12
- Basis: the first note explicitly identifies unmanned airplane, unmanned VTOL and unmanned airship test-site dimensions as takeoff/landing-facility dimensions and requires separate movement/safety space.

### Marker 2

- Result: `RESOLVED_EXACT`
- Scope: `WHOLE_TABLE`
- Confidence: `0.97`
- Target rows: all five body rows
- Basis: the second note refers to test-site dimensions generally and states that multiple single-site dimensions must not overlap.

Both marker and note block occur on official Annex 6 page 2; page continuation did not separate the markers from their notes. The decisions are recorded in `annex-06-footnote-decisions.json`. Scope was not inferred from the symbol alone.

## Candidate impact and revalidation

The prior 39 `REVIEW_REQUIRED` HIGH candidates were classified before revalidation:

- `DIRECTLY_AFFECTED`: 22
- `INDIRECTLY_AFFECTED`: 0
- `NOT_AFFECTED`: 17
- Direct Annex 6 footnote impact: 4 candidates

Only the 22 directly affected candidates were recalculated. Results:

- `VALIDATED`: 0
- `REVIEW_REQUIRED`: 22
- `REJECTED`: 0

The footnotes are resolved, but an explicit table-level reviewer decision remains absent. Thresholds were not relaxed, and the 17 unrelated review candidates retained their prior decisions.

## Table Layer decision

- Previously verified tables: 4
- Remaining review packets: 5
- Footnote scopes unresolved: 0
- Final status: **TABLE_LAYER_PARTIAL**

The remaining exception is isolated at table level. It does not trigger another broad extraction cycle and all affected table candidates are excluded from legal validation eligibility.

## Legal-validation input

| Input | Count |
|---|---:|
| Body candidates from SOURCE-BATCH-001 | 2,915 |
| Precision table candidates | 86 |
| Total candidates | 3,001 |
| Duplicate groups retained | 34 |
| Relation candidates | 3,753 |
| Existing conflicts | 46 |
| Revision comparisons | 433 |

Candidates were normalized to the common evidence, legal structure, currentness, exam relevance, eligibility, blocker and warning fields. Duplicates were retained and tagged with `duplicateGroup`; no candidate was removed.

### Eligibility

| Eligibility | Count |
|---|---:|
| ELIGIBLE | 2,807 |
| ELIGIBLE_WITH_WARNINGS | 119 |
| BLOCKED_CONFLICT | 41 |
| BLOCKED_TABLE_UNRESOLVED | 34 |
| Total blocked | 75 |

This is input eligibility, not legal validation or approval.

### Exam relevance

| Relevance | Total | Ready for validation |
|---|---:|---:|
| HIGH | 978 | 918 |
| MEDIUM | 2,023 | 2,008 |
| LOW / NONE / UNKNOWN | 0 | deferred |

The classification uses legal fact type and legal/exam signals. Article numbering alone is not treated as numeric exam value.

## Validation batch plan

Eight batches were created by legal area and evidence type, never by desired question count:

| Batch | Topic | Candidates | Ready | Blocked | Status |
|---|---|---:|---:|---:|---|
| 001 | 정의·분류 | 216 | 198 | 18 | PARTIAL |
| 002 | 조종자 증명·자격 기준 | 783 | 765 | 18 | PARTIAL |
| 003 | 신고·안전성인증 | 203 | 197 | 6 | PARTIAL |
| 004 | 비행승인·특별비행 | 64 | 62 | 2 | PARTIAL |
| 005 | 준수사항·금지·예외 | 117 | 115 | 2 | PARTIAL |
| 006 | 행정처분·벌칙·과태료 | 59 | 54 | 5 | PARTIAL |
| 007 | 항공사업법 관련 | 123 | 117 | 6 | PARTIAL |
| 008 | 기타 HIGH/MEDIUM | 1,436 | 1,418 | 18 | PARTIAL |

Exact counts and candidate IDs are in `work/legal-validation/validation-batches.json`.

## Coverage change

The coverage matrix now records:

- `tableLayerStatus`: TABLE_LAYER_PARTIAL
- `validatedTableCount`: 4
- `unresolvedTableCount`: 5
- validation eligible or warning candidates: 2,926
- validation blocked candidates: 75
- HIGH ready: 918
- MEDIUM ready: 2,008

No topic is marked `VALIDATED`; topic validation remains a later explicit workflow.

## Remaining exception and next step

The only remaining table-layer action is a human decision on the five generated review packets. The Annex 6 footnote meanings no longer block scope resolution. Legal Candidate Validation may proceed for the 2,926 eligible/eligible-with-warning candidates while the 34 candidates tied to unresolved tables remain excluded.

## Mutation statement

Pack mutation: 0. Fact mutation: 0. Graph mutation: 0. Question persistence: 0. Supabase mutation: 0.
