# Human Expansion Workflow Report

## Workflow Structure

- Pack ID: kr-drone-license:mrm0omvd
- Execution: execution:roadmap:execution-blueprint-40:26
- Current Batch: batch-1-question_count
- Batch Status: READY -> REVIEWING -> COMPLETED/FAILED
- Review Queue Size: 14
- Expected Question Increase: 14

## Review Queue

| Rank | Fact | Priority | Expansion | Balance | Expected Q+ | Risks | Reasons |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | AF-061 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-09 adds a new concept to the simulated exam pool |
| 2 | AF-063 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-09 adds a new concept to the simulated exam pool |
| 3 | AF-064 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-09 adds a new concept to the simulated exam pool |
| 4 | AF-065 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-09 adds a new concept to the simulated exam pool |
| 5 | AF-066 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-09 adds a new concept to the simulated exam pool |
| 6 | AF-069 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-10 adds a new concept to the simulated exam pool |
| 7 | AF-070 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-10 adds a new concept to the simulated exam pool |
| 8 | AF-071 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-10 adds a new concept to the simulated exam pool |
| 9 | AF-072 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-10 adds a new concept to the simulated exam pool |
| 10 | AF-073 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-10 adds a new concept to the simulated exam pool |
| 11 | AF-074 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-10 adds a new concept to the simulated exam pool |
| 12 | AF-075 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-10 adds a new concept to the simulated exam pool |
| 13 | AF-077 | 0.788 | 0.85 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-10 adds a new concept to the simulated exam pool |
| 14 | AF-076 | 0.783 | 0.84 | 0.901 | 14 | none | cat-pilot-certificate-grade is short by 2 questions; C-LIC-10 adds a new concept to the simulated exam pool |

## Evidence Method

- APPROVE requires at least one valid ApprovalEvidence.
- Valid evidence requires sourceId, sourceLocator, verificationType, and confidence >= 0.7.
- REJECT, HOLD, and REQUEST_MORE_SOURCE require reviewer memo.

## Batch Completion Conditions

- Every candidate must have a reviewer action.
- Approved candidates must include valid evidence.
- Rejected or blocked candidates must include a reason memo.

## Impact / Roadmap Connection

- The workflow compares expectedImpact with actualImpact after human review.
- Recovery Planner handles low-impact or failed batches.
- Roadmap Replanner either keeps the next batch or requests recalculation/source expansion.

## Decision Support

| Decision Type | Action | Priority | Human Approval | Reason |
| --- | --- | --- | --- | --- |
| REVIEW_BATCH_REQUIRED | START_HUMAN_BATCH_REVIEW | HIGH | true | Expansion batch candidates are ready for human fact review |

## Data Safety

- This report was generated from simulation and read-only fixture data.
- No AtomicFact status, KnowledgePack, Graph, Graph Version, Question DB, or Supabase state was changed.
