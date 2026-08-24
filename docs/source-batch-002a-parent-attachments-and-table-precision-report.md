# SOURCE-BATCH-002A Parent Attachments and Table Precision Report

Generated: 2026-08-08 KST  
Scope: read-only source acquisition, reference resolution, precision reconstruction, and quality analysis.  
Final status: **PARTIAL**

## 1. Official parent attachment acquisition

All discovery and downloads used the current-effective pages and `flDownload.do` endpoints exposed by the National Law Information Center. A file is keyed by parent source, parent version, attachment type and number. Equal attachment numbers under different parent laws are never merged.

| Parent source | Current version | Discovered | Downloaded | Job result |
|---|---:|---:|---:|---|
| Aviation Safety Act | 281945 | 1 | 1 | COMPLETED |
| Aviation Safety Act Enforcement Decree | 287495 | 6 | 6 | COMPLETED |
| Aviation Safety Act Enforcement Rule | 287951 | 212 | 212 | COMPLETED |
| Aviation Business Act | 280131 | 0 | 0 | COMPLETED_WITH_WARNINGS - current page exposes no numbered attachment download |
| Aviation Business Act Enforcement Decree | 286173 | 11 | 11 | COMPLETED |
| Aviation Business Act Enforcement Rule | 282207 | 46 | 46 | COMPLETED |
| **Total** | | **276** | **276** | |

Official pages:

- https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=281945
- https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=287495
- https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=287951
- https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=280131
- https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=286173
- https://www.law.go.kr/LSW/lsInfoP.do?lsiSeq=282207

Every downloaded object passed non-HTML payload and HWP container signature validation. SHA-256 checksums and local paths are recorded in `parent-attachments.json`. A second run skipped all valid files by checksum.

## 2. The audited 224 references

The previous mojibake reference labels were not reused. The 224-item audited population was reconstructed from the SOURCE-BATCH-001 legal nodes in document order and reparsed from the original Korean `rawText`.

| Status | Before | After |
|---|---:|---:|
| RESOLVED | 0 | 224 |
| ATTACHMENT_MISSING | 224 | 0 |
| Other unresolved states | 0 | 0 |

Each edge retains the source locator and raw attachment reference. Resolution requires an exact parent source, version, type and number match. The result is an attachment reference graph with 224 evidence-bearing edges.

## 3. BLOCKED jobs

- Before: 6 `BLOCKED_MISSING_ATTACHMENT`
- After: 0 blocked jobs
- Five parent sources completed with downloaded files.
- The Aviation Business Act completed with a warning because its current official page exposes no numbered attachment. It was not falsely reported as a downloaded attachment.

## 4. Operating-rule precision reconstruction

- Input structured tables: 10
- Precision tables: 10
- Previous candidates preserved: 96
- New precision candidates: 86
- Supersession links: 86
- Reference/relation candidates: 224

The precision representation records cell IDs, row/column span, inherited headers, conditions, footnotes, source cell IDs and numeric operators. Composite rows remain grouped and are not split into unsupported atomic statements.

The rendered six-page Annex 2 was visually inspected. Its three-column header, row-spanning aircraft type, weight-class subrows and page continuation agree with the extracted structure. Nine other tables lack an official rendered-page bundle and remain in the visual exception queue.

## 5. Quality metrics

| Metric | Before | After | Target | Result |
|---|---:|---:|---:|---|
| Merged-cell resolution | 0.5000 | 1.0000 | 0.95 | PASS - exact HWP row/column spans |
| Condition preservation | 0.0417 | 1.0000 | 0.90 | PASS for detected condition-bearing rows |
| Footnote link rate | 0.0000 | 0.0000 | 0.90 | **PARTIAL** - no high-confidence scope link |
| Numeric preservation | 0.9271 | 1.0000 | 0.98 | PASS for detected numeric rows |
| Mean visual match | not available | 0.7000 | 0.95 | **PARTIAL** |
| Attachment reference resolution | 0.0000 | 1.0000 | 1.00 | PASS |

The footnote denominator is not silently treated as successful when no high-confidence scope can be established. No score was adjusted to meet a target.

## 6. Exam relevance

| Relevance | Precision candidate count |
|---|---:|
| HIGH | 59 |
| MEDIUM | 27 |
| LOW / NONE / UNKNOWN | 0 |

All candidates remain analysis artifacts. A high relevance label is not an approval or validation status.

## 7. Visual validation and exception queue

- Visual validations: 10
- Tables with rendered-page evidence: 1 (Annex 2, six pages)
- Exception queue: 9
- Average visual match score: 0.7000

The exception queue is intentionally table-level rather than asking a reviewer to inspect all 86 candidates individually.

## 8. Conflict and revision analysis

Eighty-six precision candidates were compared with their SOURCE-BATCH-002 predecessors. They are recorded as `CONFIRMED_MATCH` only when the precision candidate has no blocker; otherwise they remain `UNRESOLVED`. The current official attachment is marked as the preferred evidence, but no existing Fact status is changed. Separate 2021 educational material remains secondary and cannot override current official evidence.

## 9. Coverage change

The coverage matrix now records:

- 276 current official parent attachments
- 224 resolved references
- 10 structured precision tables
- 86 precision candidates
- 59 HIGH-relevance candidates
- 86 condition-complete candidates
- 86 numeric-complete candidates
- 0 high-confidence footnote-complete scope links

The maximum status remains `PARTIALLY_EXTRACTED`; `VALIDATED` and `PRODUCTION_READY` are not assigned.

## 10. Remaining manual work and next recommendation

1. Obtain/render official visual pages for the nine tables in the exception queue.
2. Implement coordinate overlays against those rendered pages.
3. Resolve actual footnote markers and their row/column/cell scope; do not infer unknown scope.
4. Review only flagged table regions, then rerun precision candidate gates.
5. Keep all candidates blocked from automatic promotion until the visual and footnote targets are genuinely met.

## 11. Mutation audit

- KnowledgePack mutation: 0
- AtomicFact mutation/status change: 0
- Active Graph mutation: 0
- Question generation/database write: 0
- Supabase mutation: 0

SOURCE-BATCH-002 artifacts were preserved. SOURCE-BATCH-002A uses a separate artifact directory and precision candidate namespace.
