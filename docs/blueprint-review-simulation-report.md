# Blueprint Review Simulation Report

## Base State

- Pack ID: kr-drone-license:mrm0omvd
- Base approved facts: 26
- Base possible questions: 26
- Target exam size: 40

## Simulated Facts

| Rank | Fact ID | Original Status |
| --- | --- | --- |
| 1 | AF-353 | draft |
| 2 | AF-354 | draft |
| 3 | AF-355 | draft |
| 4 | AF-356 | draft |
| 5 | AF-357 | draft |
| 6 | AF-358 | draft |
| 7 | AF-359 | draft |
| 8 | AF-360 | draft |
| 9 | AF-428 | draft |
| 10 | AF-429 | draft |
| 11 | AF-430 | draft |
| 12 | AF-361 | draft |
| 13 | AF-362 | draft |
| 14 | AF-364 | draft |

## Coverage Delta

- After possible questions: 40
- Question increase: 14
- Resolved coverage gaps: 6
- Remaining coverage gaps: 113

| Dimension | ID | Before | After | Delta | Required |
| --- | --- | --- | --- | --- | --- |
| CATEGORY | cat-aviation-business-penalties | 0 | 11 | 11 | 2 |
| CATEGORY | cat-aviation-business | 0 | 3 | 3 | 2 |
| CONCEPT | C-BIZ-PEN-04 | 0 | 8 | 8 | 1 |
| CONCEPT | C-BIZ-GEN-02 | 0 | 3 | 3 | 1 |
| CONCEPT | C-BIZ-PEN-05 | 0 | 2 | 2 | 1 |
| CONCEPT | C-BIZ-PEN-07 | 0 | 1 | 1 | 1 |

## Question Yield

| Fact ID | Expected Questions | Templates | Difficulty | Distractor Potential |
| --- | --- | --- | --- | --- |
| AF-353 | 3 | SELECT_TRUE, SELECT_FALSE, CONCEPT_COMPARISON | easy, medium | 0.650 |
| AF-354 | 3 | SELECT_TRUE, SELECT_FALSE, CONCEPT_COMPARISON | easy, medium | 0.650 |
| AF-355 | 3 | SELECT_TRUE, SELECT_FALSE, CONCEPT_COMPARISON | easy, medium | 0.650 |
| AF-356 | 3 | SELECT_TRUE, SELECT_FALSE, CONCEPT_COMPARISON | easy, medium | 0.650 |
| AF-357 | 3 | SELECT_TRUE, SELECT_FALSE, CONCEPT_COMPARISON | easy, medium | 0.650 |
| AF-358 | 3 | SELECT_TRUE, SELECT_FALSE, CONCEPT_COMPARISON | easy, medium | 0.650 |
| AF-359 | 3 | SELECT_TRUE, SELECT_FALSE, CONCEPT_COMPARISON | easy, medium | 0.650 |
| AF-360 | 3 | SELECT_TRUE, SELECT_FALSE, CONCEPT_COMPARISON | easy, medium | 0.650 |
| AF-428 | 5 | SELECT_TRUE, SELECT_FALSE, NUMERIC_THRESHOLD, CONCEPT_COMPARISON, CASE_JUDGMENT | easy, medium, hard | 1.000 |
| AF-429 | 4 | SELECT_TRUE, SELECT_FALSE, NUMERIC_THRESHOLD, CONCEPT_COMPARISON | easy, medium | 1.000 |
| AF-430 | 4 | SELECT_TRUE, SELECT_FALSE, NUMERIC_THRESHOLD, CONCEPT_COMPARISON | easy, medium | 1.000 |
| AF-361 | 3 | SELECT_TRUE, SELECT_FALSE, CONCEPT_COMPARISON | easy, medium | 0.850 |
| AF-362 | 3 | SELECT_TRUE, SELECT_FALSE, CONCEPT_COMPARISON | easy, medium | 0.850 |
| AF-364 | 4 | SELECT_TRUE, SELECT_FALSE, NUMERIC_THRESHOLD, CONCEPT_COMPARISON | easy, medium | 0.650 |

## Graph Impact Simulation

- Expected relation hints: 37
| Relation Type | Count |
| --- | --- |
| RELATED | 14 |
| CONFUSED_WITH | 5 |
| CONTRASTS_WITH | 1 |
| PREREQUISITE_FOR | 0 |
| EXCEPTION_OF | 0 |
| DERIVED_FROM | 0 |
| SAME_CONCEPT | 12 |
| COMPARISON_PAIR | 5 |
| APPLIES_TO | 0 |

## Exam Selection Simulation

- Can build 40-question exam: YES
- Possible questions after simulation: 40

## Remaining Gaps

| Gap Type | Target | Current | Required | Priority |
| --- | --- | --- | --- | --- |
| CATEGORY | cat-aviation-law-history-structure | 0 | 2 | CRITICAL |
| CATEGORY | cat-device-type-definition | 0 | 2 | CRITICAL |
| CATEGORY | cat-flight-approval | 0 | 2 | CRITICAL |
| CATEGORY | cat-penalty-core | 0 | 2 | CRITICAL |
| CATEGORY | cat-pilot-certificate-exam-exemption | 0 | 2 | CRITICAL |
| CATEGORY | cat-pilot-certificate-exam-operation | 0 | 2 | CRITICAL |
| CATEGORY | cat-pilot-certificate-experience-instructor | 0 | 2 | CRITICAL |
| CATEGORY | cat-pilot-certificate-grade | 0 | 2 | CRITICAL |
| CATEGORY | cat-pilot-certificate-misconduct | 0 | 2 | CRITICAL |
| CATEGORY | cat-pilot-certificate-suspension-revocation | 0 | 2 | CRITICAL |
| CATEGORY | cat-pilot-certificate-target | 0 | 2 | CRITICAL |
| CATEGORY | cat-pilot-compliance-flight | 0 | 2 | CRITICAL |
| CATEGORY | cat-report-marking | 0 | 2 | CRITICAL |
| CATEGORY | cat-report-penalty | 0 | 2 | CRITICAL |
| CATEGORY | cat-report-procedure | 0 | 2 | CRITICAL |
| CATEGORY | cat-safety-certification | 0 | 2 | CRITICAL |
| CONCEPT | C-BIZ-COMMON-01 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-COMMON-02 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-COMMON-03 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-COMMON-04 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-COMMON-05 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-COMMON-06 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-COMMON-07 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-COMMON-08 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-COMMON-09 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-GEN-01 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-GEN-03 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-LEISURE-05 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-LEISURE-06 | 0 | 1 | HIGH |
| CONCEPT | C-BIZ-LEISURE-07 | 0 | 1 | HIGH |

## Decision Support

| Decision Type | Action | Priority | Human Approval | Reason |
| --- | --- | --- | --- | --- |
| EXAM_READY_AFTER_EXPANSION | VERIFY_SIMULATED_EXPANSION_REVIEW | HIGH | true | Simulated fact review can satisfy the exam blueprint |

## Data Safety

- Simulation uses memory-only virtual approved facts.
- AtomicFact status, KnowledgePack, Graph, Graph Version, Question DB, and Supabase were not modified.
