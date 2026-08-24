# Full Pipeline Benchmark Report

## 1. Input Source

| Field | Value |
| --- | --- |
| Pack ID | kr-drone-license:mrm0omvd |
| PDF | C:\Users\USER\Documents\Codex\drone-license-pwa\docs\1. 항공안전법 (1).pdf |
| PDF exists | true |
| Source ID | drone-air-safety-act-pdf |
| Title | 항공안전법 PDF |

## 2. Extraction Results

| Metric | Value |
| --- | --- |
| Pages processed | 1 |
| Extraction quality | 0.595 |
| Encoding score | 0.921 |
| Table count | 0 |
| Numeric preservation | 1.000 |
| Warnings | 2 |

## 3. Candidate Results

| Metric | Value |
| --- | --- |
| General extraction candidates | 22 |
| Legal reconstruction candidates | 6 |
| Table intelligence candidates | 69 |
| Total candidates | 84 |
| Duplicate candidates | 0 |
| Review candidates | 0 |
| Promotion candidates | 0 |

## 4. Promotion Results

| Decision | Count |
| --- | --- |
| AUTO_PROMOTION_ELIGIBLE | 0 |
| REVIEW_REQUIRED | 0 |
| REJECT | 84 |

### Top Promotion / Expansion Candidates

| Candidate | Decision | Promotion Score | Expansion Score |
| --- | --- | --- | --- |
| drone-air-safety-act-pdf:table-candidate-coord-table-p9-1-1-2 | REJECT_CANDIDATE | 0.820 | 0.824 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p8-1-1-1 | REJECT_CANDIDATE | 0.820 | 0.818 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p8-1-6-2 | REJECT_CANDIDATE | 0.820 | 0.818 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p9-1-2-2 | REJECT_CANDIDATE | 0.820 | 0.818 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p11-1-4-2 | REJECT_CANDIDATE | 0.820 | 0.815 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p8-1-5-2 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p8-1-8-2 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p9-1-3-1 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p11-1-3-2 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p11-1-5-2 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p11-1-6-2 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p11-1-7-2 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p11-1-9-1 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p15-1-1-1 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p15-1-1-2 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p15-1-2-1 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p15-1-3-2 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p15-1-4-2 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p15-1-5-1 | REJECT_CANDIDATE | 0.820 | 0.808 |
| drone-air-safety-act-pdf:table-candidate-coord-table-p15-1-8-2 | REJECT_CANDIDATE | 0.820 | 0.808 |

## 5. Coverage Change

| Metric | Before | After Simulation |
| --- | --- | --- |
| Possible questions | 26 | 68 |
| Covered categories | 7 | 8 |
| Covered concepts | 14 | 16 |
| 40-question exam possible | false | true |

## 6. Graph Change

| Metric | Value |
| --- | --- |
| Active relations | 11 |
| Simulation RELATED | 14 |
| Simulation COMPARISON_PAIR | 14 |
| Simulation CONFUSED_WITH | 14 |
| Simulation EXCEPTION | 14 |
| Expected relations | 56 |
| Graph density | 0.155 |
| Isolated reduction estimate | 14 |

## 7. Question Change

| Metric | Value |
| --- | --- |
| Classic generated | 26 |
| Graph-aware generated | 26 |
| Simulation estimated generated | 26 |
| Classic avg quality | 0.672 |
| Graph-aware avg quality | 0.742 |
| Graph usage score | 0.323 |
| Graph-backed distractors | 27 |
| Category balance score | 0.111 |
| Difficulty balance score | 1.000 |

## 8. 40-Question Exam Feasibility

**YES**

- Exam size: 40
- Missing categories: cat-aviation-business, cat-aviation-business-penalties, cat-aviation-law-history-structure, cat-device-type-definition, cat-flight-approval, cat-penalty-core, cat-pilot-certificate-exam-exemption, cat-pilot-certificate-exam-operation, cat-pilot-certificate-experience-instructor, cat-pilot-certificate-grade, cat-pilot-certificate-misconduct, cat-pilot-certificate-suspension-revocation, cat-pilot-certificate-target, cat-pilot-compliance-flight, cat-report-marking, cat-report-penalty, cat-report-procedure, cat-safety-certification
- Missing concepts sample: C-BIZ-COMMON-01, C-BIZ-COMMON-02, C-BIZ-COMMON-03, C-BIZ-COMMON-04, C-BIZ-COMMON-05, C-BIZ-COMMON-06, C-BIZ-COMMON-07, C-BIZ-COMMON-08, C-BIZ-COMMON-09, C-BIZ-GEN-01, C-BIZ-GEN-02, C-BIZ-GEN-03, C-BIZ-LEISURE-05, C-BIZ-LEISURE-06, C-BIZ-LEISURE-07, C-BIZ-PEN-01, C-BIZ-PEN-02, C-BIZ-PEN-03, C-BIZ-PEN-04, C-BIZ-PEN-05, C-BIZ-PEN-06, C-BIZ-PEN-07, C-BIZ-PEN-08, C-BIZ-RENT-01, C-BIZ-RENT-03, C-BIZ-RENT-04, C-BIZ-RENT-05, C-BIZ-USE-01, C-BIZ-USE-04, C-BIZ-USE-05
- Missing fact/template types: -

## 9. Decision Support

| Type | Priority | Reason |
| --- | --- | --- |
| FACT_EXPANSION_REQUIRED | HIGH | Current possible questions 26/40. |
| GRAPH_EXPANSION_REQUIRED | MEDIUM | Active relations=11, simulated new relations=56. |

## 10. Bottlenecks

- PDF extraction quality below 0.70.
- No reliable legal table extracted.
- Approved Fact coverage is below 40-question blueprint.
- Active graph remains sparse.
- No candidate is safe for automatic promotion; human review remains required.

## 11. Safety

- No AtomicFact mutation.
- No Fact status change.
- No KnowledgePack write.
- No Graph relation or Graph Version change.
- No Question DB write.
- No Supabase change.
