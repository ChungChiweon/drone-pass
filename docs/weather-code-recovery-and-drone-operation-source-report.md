# WeatherCode Recovery and Drone Operation Source Report

Generated: 2026-08-09T04:10:28.221169+00:00

## WeatherCode baseline and recovery

The target was fixed to the existing six IDs; no additional code was created. Baseline missing fields and blockers are recorded in `work/weather-code-recovery/weather-code-baseline.json`.

| Code | Result | Position basis | Dependency |
|---|---|---|---|
| weather-code:metar:metar | VALIDATED_WITH_WARNING | STRICT | not required/not found |
| weather-code:speci:speci | VALIDATED_WITH_WARNING | STRICT | not required/not found |
| weather-code:taf:taf | VALIDATED_WITH_WARNING | STRICT | not required/not found |
| weather-code:sigmet:sigmet | VALIDATED_WITH_WARNING | EXAMPLE_ORDER_ONLY | not required/not found |
| weather-code:airmet:airmet | VALIDATED_WITH_WARNING | EXAMPLE_ORDER_ONLY | not required/not found |
| weather-code:rmk:rmk | VALIDATED_WITH_WARNING | STRICT | source-grounded |

All six are `VALIDATED_WITH_WARNING`. METAR, SPECI, TAF, and RMK have source-grounded strict positions. SIGMET and AIRMET retain `EXAMPLE_ORDER_ONLY`; this was not promoted to an absolute order. Units are not intrinsic to these report/product markers. 003E is **COMPLETED_WITH_WARNINGS**.

## 2025 observation guideline

Status: **WAITING_FOR_MANUAL_FILE**. The local file is 130 bytes and failed: PDF_SIGNATURE_MISSING, FILE_TOO_SMALL. It was not ingested and no firewall bypass was attempted.

## 003F official source research

Institutions checked: Korea Transportation Safety Authority, Ministry of Land/Infrastructure/Transport, Korea Institute of Aviation Safety Technology, Aviation Meteorological Office, and public Drone One-stop material.

Three relevant official web sources were acquired: KIAT drone-business weather-impact context, DCC environmental testing, and flight-test AMOS information. Two are drone/UAS specific, but neither states a weather threshold or direct go/no-go operating rule. Therefore no drone-specific OperationalImpact was generated. 003F is **PARTIAL**.

## OperationalImpact revalidation

{'VALIDATED_GENERAL_AVIATION': 4, 'BLOCKED_UNSUPPORTED': 2}; drone-specific: 0. Existing general-aviation evidence was not promoted.

## Coverage and canonical v2

- Coverage: `{'definedTopics': 47, 'sourceConnectedTopics': 43, 'validatedKnowledgeTopics': 21, 'weatherCodeCoverage': 6, 'operationalImpactCoverage': 4, 'droneSpecificImpactCoverage': 0, 'sourceGaps': ['direct-drone-weather-operating-limits', '2025-observation-guideline-valid-pdf']}`
- Batch status: `{'003A': 'COMPLETED', '003B': 'COMPLETED', '003C': 'COMPLETED_WITH_WARNINGS', '003D': 'COMPLETED_WITH_WARNINGS', '003E': 'COMPLETED_WITH_WARNINGS', '003F': 'PARTIAL'}`
- Canonical v2 total: 29
- Distribution: `{'concepts': 5, 'phenomena': 7, 'hazards': 0, 'observations': 0, 'weatherCodes': 6, 'operationalImpacts': 4, 'relationships': 7}`
- Checksum: `sha256-a5abb1f552e6307d66d34a4f466b8817fcb0717a2590239b74179974dbba0d9f`
- Shadow runtime: **NEEDS_MORE_SOURCE**

Remaining gaps are direct official drone weather operating limits, a valid 2025 observation-guideline PDF, and validated Hazard/Observation structures.

## Mutation guard

Raw Weather Knowledge 57 and canonical v1 were checksum-checked after the run. Mutation count: 0. Legal Runtime, Active Pack, AtomicFact, Graph, Question and Supabase were not connected or changed.
