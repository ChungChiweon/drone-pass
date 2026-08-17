# SOURCE-BATCH-004C Limited Ingestion Report

## 1. Scope and safety boundary

SOURCE-BATCH-004C was run as a limited, evidence-bound ingestion. It created detached ingestion and validation-input artifacts only. Validation was not executed, Canonical IDs were not issued, and Active Pack, AtomicFact, graph, questions, Supabase, 004D, and 004E were not changed.

The TS official technical textbook was not present. Its recovery status is `WAITING_FOR_MANUAL_FILE`; this did not block ingestion from the two independently verified official sources already available.

## 2. TS manual recovery package

The recovery package lives at `work/flight-theory-manual-recovery/ts-technical-training/`. It defines accepted formats (PDF, HWP, HWPX, DOCX), expected metadata, import instructions, validation policy, and the manual-drop destination at `data/sources/drone-license/flight-theory/manual-drop/ts-technical-training/`.

The validator checks extension, minimum size, HTML/error payloads, file signatures, and checksum. An absent file returns `WAITING_FOR_MANUAL_FILE`; it does not fabricate a source or fail all of 004C. Title and issuer still require manual confirmation.

## 3. Sources actually used

| Source | Role | Pages used | Boundary |
| --- | --- | ---: | --- |
| FAA-H-8083-31B, Aviation Maintenance Technician Handbook—Airframe | Primary general aviation electrical/battery evidence | 417–420, 431–442, 465 | General aircraft electrical and starter-motor knowledge only |
| NASA Lithium-Ion Battery Guidelines | Primary general Li-ion battery evidence | 20–21, 37–39, 61–62, 88–89, 93 | General Li-ion knowledge only; not LiPo- or UAS-specific |

The runner verified registry status, local file existence, and checksum before processing. It used exactly these two sources. Total processing was 31 pages across 8 evidence sections.

## 4. Topic coverage

The 27-topic 004C taxonomy produced:

| Status | Count |
| --- | ---: |
| `INGESTED` | 18 |
| `INGESTED_WITH_GAPS` | 2 |
| `NO_KNOWLEDGE` | 7 |

No topic was filled from filename, adjacent wording, manufacturer behavior, or general domain assumptions.

## 5. Generated detached knowledge

| Artifact type | Count |
| --- | ---: |
| Electrical/power concepts | 8 |
| Propulsion components | 1 |
| Battery knowledge | 9 |
| Safety knowledge | 2 |
| Formula candidates | 2 |
| Relationships | 7 |
| Visual links | 102 |
| Table candidates | 2 |

The two formulas preserve exact page expressions, including Ohm's law and power/resistance relationships. Visual links are locator-only candidates and require interpretation; they are not validated knowledge. Both table candidates remain `PAGE_REVIEW_REQUIRED` and are blocked from direct Canonical promotion.

## 6. Technical-context classification

| Context | Count |
| --- | ---: |
| `ELECTRICAL_GENERAL` | 7 |
| `AVIATION_GENERAL` | 2 |
| `BATTERY_GENERAL` | 11 |

General aircraft and battery statements were not relabeled as drone-specific claims.

## 7. Knowledge boundaries

- `ElectricalConcept` contains definitions and source-supported relationships for voltage, current, resistance, circuits, and power.
- `PropulsionComponent` contains only the FAA-supported electric starter-motor concept. It does not infer BLDC, KV, ESC, propeller, or multirotor behavior.
- `BatteryKnowledge` preserves Li-ion scope, capacity/C-rate terminology, series/parallel arrangements, charge risks, and cell reversal evidence.
- `SafetyKnowledge` contains direct charge/thermal-runaway warnings, not operational emergency procedures.
- `Relationship` is emitted only when both entities exist and the evidence directly supports the edge.

## 8. Remaining gaps

Seven topics remain explicit gaps:

1. `flight:bldc`
2. `flight:kv`
3. `flight:esc`
4. `flight:propeller-pitch`
5. `flight:propeller-diameter`
6. `flight:lipo`
7. `flight:battery-storage`

The prior acquisition inventory listed six gaps. Limited ingestion recovered C-rate from NASA page 88, but correctly demoted LiPo to a gap because the source is Li-ion and does not justify a LiPo-specific claim. Generic storage guidance also remains unsupported; narrow experimental storage passages were insufficient for a general operational rule.

## 9. Duplicate and overlap handling

Potential overlap was analyzed against frozen 004B motor knowledge and 004G battery-fire knowledge. Overlap is recorded for later validation; no existing Canonical object was modified and no new Canonical was created. A possible overlap must resolve to an existing reference or a supported relationship, not a duplicate Canonical.

## 10. Validation-input preparation

The detached validation inventory contains 133 entries:

| Eligibility | Count |
| --- | ---: |
| `ELIGIBLE` | 15 |
| `ELIGIBLE_WITH_WARNING` | 116 |
| `BLOCKED_TABLE` | 2 |

The high warning count is intentional: 102 visual locator candidates require human interpretation, and general-technical/context warnings are retained. The validation manifest is input only. No result, approval, Canonical ID, or Canonical checksum was generated.

## 11. Unsupported inference controls

Unsupported inference count is **0**. The pipeline blocks:

- manufacturer-specific RTH or failsafe behavior;
- battery percentages, voltage thresholds, or operational limits not printed in the source;
- Li-ion-to-LiPo generalization;
- BLDC, KV, ESC, propeller, or UAS propulsion inference from a starter-motor passage;
- formula creation unless the source page contains the expression;
- relationship creation from simple co-occurrence;
- table claims without page review.

## 12. Output inventory

Ingestion artifacts are stored under `work/source-ingestion/source-batch-004c/`:

- source-section map;
- concepts, propulsion components, battery knowledge, and safety knowledge;
- formulas, relationships, visual links, and table candidates;
- duplicate, gap, quality, coverage, execution, and summary artifacts.

Validation input is stored under `work/flight-theory-validation/004c/` with a manifest and type-separated candidate files. The original ingestion artifacts remain separate and unmodified by validation.

## 13. Admin read-only visibility

`/admin/drone-source-coverage` reads `ingestion-summary.json` server-side and displays the TS recovery state, source/page counts, topic coverage, generated artifact counts, technical contexts, validation eligibility, remaining gaps, unsupported inference count, and 004D/004E preservation status. It provides no mutation action.

## 14. 004D and 004E preservation

- 004D: `PARTIAL_UNCHANGED`
- 004E: `PARTIAL_UNCHANGED`

The two batches were not reclassified, enriched, or mutated. Deferred acquisition remains deferred.

## 15. Canonical and runtime mutation audit

| Target | Before | After | Mutation |
| --- | ---: | ---: | ---: |
| Flight-theory Canonical baseline | 151 | 151 | 0 |
| Active Pack | unchanged | unchanged | 0 |
| AtomicFact | unchanged | unchanged | 0 |
| Graph / Graph Version | unchanged | unchanged | 0 |
| Questions | unchanged | unchanged | 0 |
| Legal runtime | frozen | frozen | 0 |
| Weather runtime | frozen | frozen | 0 |
| Supabase | untouched | untouched | 0 |

## 16. Status and next step

The run status is `COMPLETED_WITH_GAPS`. SOURCE-BATCH-004C is ready for a separate validation step over the prepared input, subject to human review of warnings and tables. Canonical generation is **not** authorized by this report. The TS recovery path remains open and can later contribute new candidates only after file validation and provenance review.
