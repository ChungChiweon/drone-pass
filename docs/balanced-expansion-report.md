# Balanced Expansion Report

## Problem

- Previous expansion ranking can reach 40 questions but concentrates heavily in business penalties.
- Balanced expansion prefers underrepresented categories, new concepts, and lower redundancy.

## Comparison

| Metric | Top Question Increase | Balanced Top |
| --- | --- | --- |
| Possible questions | 40 | 40 |
| Question increase | 14 | 14 |
| Unique simulated categories | 2 | 11 |
| Expected graph hints | 38 | 45 |
| Remaining coverage gaps | 113 | 101 |
| Readiness | EXAM_READY_BUT_IMBALANCED | EXAM_READY_BUT_IMBALANCED |

## Existing Top14 Candidates

| Rank | Fact ID | Concept |
| --- | --- | --- |
| 1 | AF-353 | C-BIZ-PEN-04 |
| 2 | AF-354 | C-BIZ-PEN-04 |
| 3 | AF-355 | C-BIZ-PEN-04 |
| 4 | AF-356 | C-BIZ-PEN-04 |
| 5 | AF-357 | C-BIZ-PEN-04 |
| 6 | AF-358 | C-BIZ-PEN-04 |
| 7 | AF-359 | C-BIZ-PEN-04 |
| 8 | AF-360 | C-BIZ-PEN-04 |
| 9 | AF-428 | C-BIZ-GEN-02 |
| 10 | AF-429 | C-BIZ-GEN-02 |
| 11 | AF-433 | C-BIZ-GEN-03 |
| 12 | AF-432 | C-BIZ-GEN-03 |
| 13 | AF-430 | C-BIZ-GEN-02 |
| 14 | AF-361 | C-BIZ-PEN-05 |

## Balanced Top Candidates

| Rank | Fact ID | Score | Coverage | Diversity | Penalty | Reasons |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | AF-106 | 0.858 | 0.875 | 0.950 | 0.000 | cat-pilot-certificate-exam-exemption is short by 2 questions; C-LIC-17 adds a new concept to the simulated exam pool |
| 2 | AF-266 | 0.853 | 1.000 | 0.950 | 0.000 | cat-aviation-insurance is short by 1 questions; C-INS-03 adds a new concept to the simulated exam pool |
| 3 | AF-069 | 0.843 | 0.875 | 0.950 | 0.000 | cat-pilot-certificate-grade is short by 2 questions; C-LIC-10 adds a new concept to the simulated exam pool |
| 4 | AF-060 | 0.849 | 1.000 | 0.950 | 0.000 | cat-pilot-certificate-grade is short by 1 questions; C-LIC-08 adds a new concept to the simulated exam pool |
| 5 | AF-428 | 0.836 | 0.875 | 0.950 | 0.000 | cat-aviation-business is short by 2 questions; C-BIZ-GEN-02 adds a new concept to the simulated exam pool |
| 6 | AF-433 | 0.844 | 1.000 | 0.950 | 0.000 | cat-aviation-business is short by 1 questions; C-BIZ-GEN-03 adds a new concept to the simulated exam pool |
| 7 | AF-102 | 0.827 | 0.875 | 0.950 | 0.000 | cat-pilot-certificate-experience-instructor is short by 2 questions; C-LIC-16 adds a new concept to the simulated exam pool |
| 8 | AF-093 | 0.847 | 1.000 | 0.950 | 0.000 | cat-pilot-certificate-experience-instructor is short by 1 questions; C-LIC-15 adds a new concept to the simulated exam pool |
| 9 | AF-018 | 0.818 | 0.875 | 0.950 | 0.000 | cat-report-procedure is short by 2 questions; C-REG-07 adds a new concept to the simulated exam pool |
| 10 | AF-132 | 0.815 | 0.875 | 0.950 | 0.000 | cat-pilot-certificate-suspension-revocation is short by 2 questions; C-LIC-23 adds a new concept to the simulated exam pool |
| 11 | AF-205 | 0.813 | 0.875 | 0.950 | 0.000 | cat-aviation-law-history-structure is short by 2 questions; C-LAW-04 adds a new concept to the simulated exam pool |
| 12 | AF-118 | 0.810 | 0.875 | 0.950 | 0.000 | cat-pilot-certificate-exam-operation is short by 2 questions; C-LIC-20 adds a new concept to the simulated exam pool |
| 13 | AF-047 | 0.809 | 0.875 | 0.950 | 0.000 | cat-pilot-certificate-target is short by 2 questions; C-LIC-03 adds a new concept to the simulated exam pool |
| 14 | AF-181 | 0.803 | 0.875 | 0.950 | 0.000 | cat-penalty-core is short by 2 questions; C-PEN-09 adds a new concept to the simulated exam pool |

## Balanced Category Distribution

| Category | Selected Count |
| --- | --- |
| cat-pilot-certificate-exam-exemption | 1 |
| cat-aviation-insurance | 1 |
| cat-pilot-certificate-grade | 2 |
| cat-aviation-business | 2 |
| cat-pilot-certificate-experience-instructor | 2 |
| cat-report-procedure | 1 |
| cat-pilot-certificate-suspension-revocation | 1 |
| cat-aviation-law-history-structure | 1 |
| cat-pilot-certificate-exam-operation | 1 |
| cat-pilot-certificate-target | 1 |
| cat-penalty-core | 1 |

## Decision Support

| Decision Type | Action | Priority | Human Approval | Reason |
| --- | --- | --- | --- | --- |
| KNOWLEDGE_BALANCE_REQUIRED | PRIORITIZE_UNDERREPRESENTED_KNOWLEDGE | HIGH | true | Question count may be possible, but category/concept balance is still weak |

## Data Safety

- This report is simulation-only.
- AtomicFact status, KnowledgePack, Graph, Graph Version, Question DB, and Supabase were not modified.
