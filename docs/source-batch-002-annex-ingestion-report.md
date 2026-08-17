# SOURCE-BATCH-002 Annex Ingestion Report

## 1. Scope and safety boundary

SOURCE-BATCH-002 acquired and analyzed official attachments without writing to the KnowledgePack, AtomicFact store, production graph, question database, or Supabase. Every generated candidate retains `SOURCE_INGESTION_UNVALIDATED`; all HWP table candidates additionally retain `VISUAL_VERIFICATION_REQUIRED` and `standaloneQuestionAllowed=false`.

Execution status: **PARTIAL**. Automatic acquisition failures and unresolved parent-law references are not reported as completed.

## 2. Confirmed administrative rule

- Source: `pilot-certification-operating-rules`
- Canonical title: 무인비행장치 조종자 증명 운영세칙
- Issuer: 한국교통안전공단
- Current rule: 한국교통안전공단규정 제1507호
- Promulgated: 2025-04-21
- Effective: 2025-05-14
- Currentness: verified from the [National Law Information Center official rule page](https://www.law.go.kr/LSW/schlPubRulInfoP.do?schlPubRulSeq=2200000142833)
- Official TS exam guidance was cross-checked against the [Korea Transportation Safety Authority qualification page](https://main.kotsa.or.kr/portal/contents.do?menuCode=02020200).

No future-effective version was mixed into the current evidence set.

## 3. Attachment acquisition

| Metric | Result |
|---|---:|
| Attachments discovered | 35 |
| Attachments downloaded and signature-validated | 35 |
| Annexes | 8 |
| Forms | 27 |
| HTML/error responses accepted | 0 |
| Non-official hosts accepted | 0 |

The dynamic Law Center page exposed 35 official `flDownload.do` endpoints after the annex/form list was opened. Downloads were limited to `law.go.kr`, paced at least one second for new requests, retried at most twice, and resumed by local checksum/signature validation.

## 4. Table reconstruction

The eight annex HWP originals were parsed directly as OLE HWP documents. Compressed `BodyText/Section*` records were decoded and `HWPTAG_TABLE`, cell `LIST_HEADER`, and paragraph text records were combined. Cell coordinates, row/column spans, headers and evidence text were preserved.

| Metric | Result |
|---|---:|
| Structured tables | 10 |
| Table Fact candidates | 96 |
| Rows with numeric evidence | 89 (92.71%) |
| Tables containing merged cells | 5/10 |
| Header inheritance coverage | 100% |
| Visual verification required | 10/10 |

Official rendered pages 1 and 6 of annex 2 were visually compared. The three principal columns (`종류`, `무게범위 등`, `응시기준`), multi-page continuation, row groups, and merged cells were present. Because the binary parser does not reproduce pagination graphics or reliably resolve all footnotes, the extraction quality remains 0.68 and no candidate can be promoted automatically.

## 5. Candidate and relation results

- Table Fact candidates: 96
- Body-to-attachment relation candidates: 34
- HIGH exam relevance: 43
- MEDIUM: 16
- LOW: 37
- NONE / UNKNOWN: 0

Relation types are derived only from explicit links in the current official operating-rule body: `DEFINED_IN_ANNEX`, `REQUIREMENT_SPECIFIED_IN`, `FORM_REQUIRED_BY`, and `EXCEPTION_SPECIFIED_IN`. One of the 35 visible references was duplicated in the page body, resulting in 34 unique linked relation candidates.

Composite rows remain a single `COMPOSITE_FACT` group. Individual cells are not promoted into independent facts.

## 6. Existing 224 reference resolution

| Status | Count |
|---|---:|
| RESOLVED | 0 |
| PARTIALLY_RESOLVED | 0 |
| ATTACHMENT_MISSING | 224 |
| VERSION_AMBIGUOUS | 0 |
| EXTRACTION_FAILED | 0 |
| NOT_RELEVANT | 0 |

The 35 acquired files belong to the independent TS operating-rule source. They do not resolve references whose parent is one of the six SOURCE-BATCH-001 statutes. Cross-parent matching by annex number was intentionally forbidden because `별표 1` in different laws is not the same attachment.

## 7. Blocked jobs

The six `BLOCKED_MISSING_ATTACHMENT` parent-law jobs remain blocked (`6 → 6`). They were not released merely because another source's attachments were acquired. Each requires a verified current attachment belonging to the same parent law/version.

Manual acquisition remains required for:

- current 항공안전법 시행령 annexes, including the current penalty table;
- current 항공안전법 시행규칙 annexes/forms related to reporting, certification and flight approvals;
- current 항공사업법 subordinate-law annexes related to UAS business registration;
- any attachment whose current/future version cannot be unambiguously identified.

## 8. Duplicate and conflict analysis

Five weak lexical comparisons against the 2,915 SOURCE-BATCH-001 candidates were retained as `UNRESOLVED`, not asserted as legal conflicts. The broad text candidates can share terms such as maximum takeoff weight or six months while addressing a different legal subject. No automatic `VALUE_CONFLICT` or `VERSION_CONFLICT` was declared without matching subject, unit, condition and source scope.

The 2021 educational PDF was not treated as controlling evidence. Comparison with the current 2025 operating rule therefore remains a review task rather than an automatic override.

## 9. Quality metrics

| Metric | Score |
|---|---:|
| attachmentDiscoveryRate | 1.0000 |
| attachmentDownloadRate | 1.0000 |
| annexExtractionRate | 1.0000 |
| tableStructureRecoveryRate | 1.0000 |
| mergedCellResolutionRate | 0.5000 |
| headerInheritanceAccuracy | 1.0000 |
| numericPreservationRate | 0.9271 |
| conditionPreservationRate | 0.0417 |
| footnoteLinkRate | 0.0000 |
| attachmentReferenceResolutionRate | 0.0000 |
| examRelevanceClassificationRate | 1.0000 |
| averageExtractionQuality | 0.6800 |

The low condition and footnote rates are explicit blockers. Numeric preservation alone is not sufficient for legal Fact approval.

## 10. Coverage change

`pilot-certification` gained one current official annex source, ten structured tables, and 96 read-only candidates. The overall legal coverage maximum remains `EXTRACTED`; SOURCE-BATCH-002 is `PARTIALLY_EXTRACTED`. No topic was upgraded to `VALIDATED` or `PRODUCTION_READY`.

## 11. Mutation check

- KnowledgePack mutation: 0
- AtomicFact mutation: 0
- Graph mutation: 0
- Question generation/storage: 0
- Supabase mutation: 0

## 12. Next recommendation

Resolve the six parent-law attachment jobs one official law/version at a time. Prioritize current penalty, reporting, certification, flight-approval and business-registration annexes. Before any Fact review, visually verify all ten reconstructed operating-rule tables and implement reliable footnote/condition binding.
