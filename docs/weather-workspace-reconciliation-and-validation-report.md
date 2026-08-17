# Weather Workspace Reconciliation and Validation Report

Generated: 2026-08-09T02:38:22.681999+00:00

## Decision

The current **57-item** workspace is preserved as the source of truth. No rollback, deletion, legal-runtime change, active-pack mutation, or database write was performed.

## Reconciliation

| Metric | Result |
|---|---:|
| Current knowledge | 57 |
| Recorded baseline | 35 |
| Added after baseline | 22 |
| Registry records | 10 |
| Ingestion-source records | 8 |
| New ingestion sources | 5 |
| Valid local sources | 7 |

The immutable 35-item payload is no longer present, so membership was reconstructed from the recorded per-type counts and stable artifact order. This is sufficient to identify the 22 additions, but **not** to prove which baseline payloads were modified; `modifiedIds` is therefore intentionally `null`.

## Added knowledge provenance

{"PROVENANCE_VERIFIED": 19, "PROVENANCE_MISSING": 3}

The five new ingestion sources are: amo-metar-rmk-guide, amo-api-guide, amo-observation-guideline-2025, amo-aviation-forecast-warning-overview, amo-aviation-weather-newsletter-2024. The registry contains two further manual records, so registry total (10) and ingestion-source total (8) are intentionally reported separately. The 130-byte `amo-business-overview` firewall body remains blocked.

## Validation

Eligibility: `{'BLOCKED_STRUCTURE': 33, 'ELIGIBLE': 19, 'ELIGIBLE_WITH_WARNING': 4, 'BLOCKED_RELATIONSHIP': 1}`  
Results: `{'BLOCKED_STRUCTURE': 33, 'VALIDATED': 19, 'VALIDATED_WITH_WARNING': 4, 'BLOCKED_RELATIONSHIP': 1}`

WeatherCode: `{'BLOCKED_STRUCTURE': 6}`. Code meaning alone was not accepted; missing position/dependency/example structure remains visible. Synthetic audit IDs were used only in reports because the source type has no `codeId`.

OperationalImpact: `{'VALIDATED_GENERAL_AVIATION_IMPACT': 4, 'BLOCKED_UNSUPPORTED_INFERENCE': 2}`. General aviation evidence was never promoted to drone-specific evidence.

Relationships: `{'BLOCKED_RELATIONSHIP': 1, 'VALIDATED': 7}`. Unresolved endpoints, missing evidence, and unsupported directions are blocked.

## Canonical set

Only `VALIDATED` and `VALIDATED_WITH_WARNING` entries were admitted. Counts: `{'concepts': 5, 'phenomena': 7, 'hazards': 0, 'observations': 0, 'weatherCodes': 0, 'operationalImpacts': 4, 'relationships': 7}`. File: `work/weather-validation/results/canonical-weather-knowledge-set.json`.

## Topic coverage and 003A–003F

`{'definedTopicCount': 47, 'sourceConnectedTopicCount': 40, 'validatedKnowledgeTopicCount': 15, 'weatherCodeCoverage': 0, 'operationalImpactCoverage': 4, 'sourceBatch003': {'003A': 'COMPLETED', '003B': 'COMPLETED', '003C': 'COMPLETED_WITH_WARNINGS', '003D': 'COMPLETED_WITH_WARNINGS', '003E': 'PARTIAL', '003F': 'BLOCKED_MANUAL_SOURCE'}}`

## Manual recovery

- METAR/RMK guide: INGESTED (valid official local artifact)
- API guide: INGESTED (valid official local artifact)
- 2025 observation guideline: WAITING (official page known; no valid local original)

## Remaining gaps

- Immutable baseline-35 payload is unavailable, so baseline modification history cannot be cryptographically reconstructed.
- WeatherCode structural rules/examples are incomplete.
- Hazard records lack trigger/operation structure.
- Operational impacts are general aviation evidence, not direct drone evidence.
- Visual inventory records have no page locator and no interpretation, so they remain unresolved support assets.
- The 2025 observation guideline still needs manual acquisition.

## Mutation guard

Existing Weather Knowledge inputs, source originals, Legal Runtime, Active Pack, AtomicFact, Graph, Question data, Supabase, and the reconciliation snapshot were not changed by validation.
