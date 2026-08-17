# SOURCE-BATCH-003 Weather Ingestion and Gap Acquisition

## Scope and safeguards

Weather-only staging ingestion was executed. Weather validation was prepared but not run. Legal canonical/runtime, Active Pack, AtomicFact, and Active Graph mutation counts remain zero.

## Ingestion sources

- Documents processed: 8
- The original READY set was processed separately by source quality.
- `amo-business-overview` remained PARTIAL because the saved HTML contains only a firewall block message.

## Pages and extraction

- Concepts: 12
- Phenomena: 7
- Hazards: 7
- Observations: 11
- WeatherCode definitions: 6
- Operational impacts: 6
- Relationships: 8
- Visual links: 10

Every generated record preserves raw evidence and a source/page locator. Empty detail fields remain empty rather than inferred.

## 003D official sources

- Aviation Meteorological Office forecast/warning overview (current HTML).
- Aviation Meteorological Office November 2024 newsletter (official PDF; time-sensitive criteria flagged POSSIBLY_OUTDATED).

## 003F official sources

- Ministry of Land, Infrastructure and Transport drone policy Q&A confirms access to regional weather information before flight planning.
- Aviation Meteorological Office current low-altitude weather information scope is retained.
- Detailed drone-specific operational thresholds remain `DRONE_SPECIFIC_SOURCE_MISSING`; no aviation-only limit was generalized to drones.

## Manual attachments

Official attachment URLs were discovered on the publisher pages without login or CAPTCHA bypass. METAR/RMK, military METAR/TAF codes, and IWXXM API guide PDFs were downloaded when available.

## Coverage

- Topics: 47
- Source connected: 39
- Knowledge available: 33

| Batch | Sources | Ingested | Gaps | Status |
|---|---:|---:|---:|---|
| 003A | 5/6 | 5/6 | 1 | INGESTED_WITH_GAPS |
| 003B | 4/5 | 4/5 | 1 | INGESTED_WITH_GAPS |
| 003C | 8/8 | 7/8 | 1 | INGESTED_WITH_GAPS |
| 003D | 11/11 | 7/11 | 4 | INGESTED_WITH_GAPS |
| 003E | 10/10 | 10/10 | 0 | INGESTED |
| 003F | 1/7 | 0/7 | 7 | PARTIAL |

## Remaining gaps

- `air-density`: MISSING_OFFICIAL_SOURCE, MISSING_INGESTED_KNOWLEDGE
- `convection`: MISSING_INGESTED_KNOWLEDGE
- `downburst`: MISSING_INGESTED_KNOWLEDGE
- `hazard-avoidance`: MISSING_OFFICIAL_SOURCE, MISSING_INGESTED_KNOWLEDGE, DRONE_SPECIFIC_SOURCE_MISSING
- `low-altitude-weather`: MISSING_INGESTED_KNOWLEDGE, DRONE_SPECIFIC_SOURCE_MISSING
- `low-visibility`: MISSING_INGESTED_KNOWLEDGE
- `mist`: MISSING_OFFICIAL_SOURCE, MISSING_INGESTED_KNOWLEDGE
- `preflight-weather`: MISSING_OFFICIAL_SOURCE, MISSING_INGESTED_KNOWLEDGE, DRONE_SPECIFIC_SOURCE_MISSING
- `rain-operation`: MISSING_OFFICIAL_SOURCE, MISSING_INGESTED_KNOWLEDGE, DRONE_SPECIFIC_SOURCE_MISSING
- `snow`: MISSING_INGESTED_KNOWLEDGE
- `stationary-front`: MISSING_INGESTED_KNOWLEDGE
- `vlos-visibility`: MISSING_OFFICIAL_SOURCE, MISSING_INGESTED_KNOWLEDGE, DRONE_SPECIFIC_SOURCE_MISSING
- `weather-change`: MISSING_OFFICIAL_SOURCE, MISSING_INGESTED_KNOWLEDGE, DRONE_SPECIFIC_SOURCE_MISSING
- `wind-operation`: MISSING_OFFICIAL_SOURCE, MISSING_INGESTED_KNOWLEDGE, DRONE_SPECIFIC_SOURCE_MISSING

## Acquisition results

- `amo-aviation-forecast-warning-overview`: CHECKSUM_SKIP
- `amo-aviation-weather-newsletter-2024`: CHECKSUM_SKIP
- `amo-metar-rmk-guide`: CHECKSUM_SKIP
- `amo-metar-taf-code-guide`: CHECKSUM_SKIP
- `amo-api-guide`: CHECKSUM_SKIP

## Warnings

- `molit-drone-policy-qna`: HTTP Error 307: The HTTP server returned a redirect error that would lead to an infinite loop.
The last 30x error message was:
Temporary Redirect
- `amo-business-overview`: SOURCE_TEXT_TOO_SHORT_OR_BLOCKED

## Validation preparation

`work/weather-validation/` contains read-only validation inputs. Validation was not executed.

## Quality

- Provenance rate: 1.0
- Relationship evidence rate: 1.0
- Unsupported operational impact count: 0

## Mutation audit

- Legal Runtime: 0
- Legal Canonical Set: 0
- Active Pack: 0
- AtomicFact: 0
- Active Graph: 0
