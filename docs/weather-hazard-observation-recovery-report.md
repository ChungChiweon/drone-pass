# Weather Hazard & Observation Knowledge Recovery Report

Generated: 2026-08-09T04:29:36.137193+00:00

## Fixed baseline

- Hazard: 7
- Observation: 11
- New Hazard/Observation candidates created: 0

## Root cause

The original validator treated operational enrichment fields as if they were core Hazard identity fields and applied nearly uniform measurement requirements to every Observation. Recovery separates core identity from optional operational fields and applies observation-type schemas. It does not relax score thresholds.

## Hazard results

`{'VALIDATED_WITH_WARNING': 7}`. All seven are source-grounded and recovered with warnings because flight-risk and avoidance guidance were not inferred.

## Observation results

`{'VALIDATED': 5, 'VALIDATED_WITH_WARNING': 1, 'BLOCKED_STRUCTURE': 5}`. Recovered: wind, humidity, radar, satellite, METAR, SPECI. Blocked as misclassified/generic: TAF, SIGMET, AIRMET, curriculum `observation`, aviation warning.

## Code relations

Four source-grounded draft relationships were added only to canonical v3: METAR/SPECI represent their coded observations and contain the reported wind observation. No graph repository was changed.

## Manual guideline

Status: **WAITING_FOR_MANUAL_FILE**; blockers: PDF_SIGNATURE_MISSING, FILE_TOO_SMALL. The 130-byte non-PDF body was not ingested.

## Canonical v3 and coverage

- Total: 46
- Distribution: `{'concepts': 5, 'phenomena': 7, 'hazards': 7, 'observations': 6, 'weatherCodes': 6, 'operationalImpacts': 4, 'relationships': 11}`
- Coverage: `{'definedTopics': 47, 'sourceConnectedTopics': 43, 'validatedKnowledgeTopics': 27, 'hazardCoverage': 7, 'observationCoverage': 6, 'weatherCodeCoverage': 6, 'operationalImpactCoverage': 4}`
- Batches: `{'003A': 'COMPLETED', '003B': 'COMPLETED', '003C': 'COMPLETED_WITH_WARNINGS', '003D': 'COMPLETED_WITH_WARNINGS', '003E': 'COMPLETED_WITH_WARNINGS', '003F': 'PARTIAL', '003G': 'COMPLETED_WITH_WARNINGS'}`
- Shadow runtime readiness: **READY_WITH_GAPS**

## Remaining gaps

Five Observation candidates require reclassification rather than forced recovery; drone-specific OperationalImpact remains zero; the 2025 observation guideline still lacks a valid PDF; operational Hazard guidance remains ungrounded.

## Mutation guard

Weather Knowledge 57 and canonical v1/v2 were checksum checked. Mutation count: 0. Legal Runtime, Active Pack, AtomicFact, Graph, Question and Supabase were not connected or modified.
