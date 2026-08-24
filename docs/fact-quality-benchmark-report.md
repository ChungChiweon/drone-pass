# Fact Quality Benchmark Report

## Source

- PDF: C:\Users\USER\Documents\Codex\drone-license-pwa\docs\1. 항공안전법 (1).pdf
- Candidate total: 200

## AUTO_APPROVE Quality

- AUTO_APPROVE count: 68
- EXCELLENT: 10
- GOOD: 5
- ACCEPTABLE: 23
- POOR: 30
- False approve risk count: 30
- False approve risk rate: 44.1%

## REVIEW_REQUIRED Quality

- REVIEW_REQUIRED count: 132
- EXCELLENT: 0
- GOOD: 13
- ACCEPTABLE: 42
- POOR: 77

## Sample Analysis

| Group | Sample | Pass Rate | Issue Rate | False Approve Risk |
| --- | --- | --- | --- | --- |
| REVIEW_REQUIRED | 30 | 0.067 | 1.000 | 0.600 |
| AUTO_APPROVE_CANDIDATE | 30 | 0.233 | 0.967 | 0.300 |

## Threshold Simulation

| Threshold | Auto Approve | Review | Estimated Risk | Risk Rate |
| --- | --- | --- | --- | --- |
| 0.95 | 13 | 187 | 3 | 0.231 |
| 0.92 | 13 | 187 | 3 | 0.231 |
| 0.90 | 68 | 132 | 30 | 0.441 |
| 0.85 | 68 | 132 | 30 | 0.441 |

## Recommended Threshold: 0.95

- Recommendation is analytical only. Auto Promotion threshold was not changed.
- Main improvement: require post-promotion quality validator before trusting AUTO_APPROVE candidates.

## Data Safety

- AtomicFact creation: not performed.
- Fact status changes: not performed.
- KnowledgePack mutation: not performed.
- Graph/Graph Version changes: not performed.
- Question DB writes: not performed.
- Supabase writes: not performed.
