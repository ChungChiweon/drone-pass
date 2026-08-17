# Autonomous Fact Promotion Report

## Promotion Score Criteria

- sourceReference present: +0.20
- official source type LAW/REGULATION: +0.15
- duplicate none: +0.15
- numeric/unit consistency: +0.15
- legal reference signal: +0.15
- graph connection possible: +0.10
- high exam value: +0.10
- duplicate candidate: -0.30
- contradiction: -0.50
- source missing: -0.50

## Decision Rule

- AUTO_APPROVE_CANDIDATE: score >= 0.90 and no duplicate/contradiction/validation error.
- REVIEW_REQUIRED: score from 0.60 to below 0.90 without high-risk blockers.
- REJECT_CANDIDATE: score < 0.60 or high-risk blocker.

## Simulation Result

- Total candidates: 4
- Auto approve candidates: 1
- Review required candidates: 1
- Rejected candidates: 2
- Average confidence: 0.822
- Expected question increase from auto-approve candidates: 2
- Expected coverage increase from auto-approve candidates: 2
- Risk distribution: LOW 1, MEDIUM 1, HIGH 2

## Human Review Boundary

- AUTO_APPROVE_CANDIDATE is a classification only.
- AtomicFact creation, KnowledgePack append, status changes, graph changes, question DB writes, and Supabase writes are intentionally not performed.
