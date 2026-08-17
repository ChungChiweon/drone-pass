# Knowledge Expansion Intelligence Report

## Score Structure

- qualityScore: 30%
- coverageImpactScore: 30%
- examYieldScore: 20%
- graphPotentialScore: 10%
- noveltyScore: 10%

## Simulation Result

- Total candidates: 4
- Average expansion score: 0.783
- Predicted question increase: 14
- Predicted coverage increase: 2.401
- Priority distribution: CRITICAL 2, HIGH 1, MEDIUM 1, LOW 0
- High quality + high expansion: 2
- High quality + low expansion: 0

## Top Expansion Candidates

| Rank | Candidate | Score | Priority | Quality | Coverage | Yield | Graph | Novelty |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | FC-A | 0.932 | CRITICAL | 0.950 | 0.967 | 0.944 | 0.685 | 1.000 |
| 2 | FC-C | 0.918 | CRITICAL | 0.880 | 1.000 | 0.979 | 0.585 | 1.000 |
| 3 | FC-D | 0.685 | HIGH | 0.450 | 1.000 | 0.708 | 0.160 | 0.920 |

## Difference from Auto Promotion

- Auto Promotion answers whether a candidate is safe enough to classify as an approval candidate.
- Expansion Intelligence answers whether that candidate materially improves exam coverage, graph utility, and question yield.
- The Auto Promotion threshold is not changed; expansionScore is advisory only.

## Data Safety

- No AtomicFact creation, Fact status update, KnowledgePack mutation, graph mutation, Question DB write, or Supabase write is performed.
