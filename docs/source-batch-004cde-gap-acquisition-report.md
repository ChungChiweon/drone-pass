# SOURCE-BATCH-004C/004D/004E Gap Acquisition Report

## Scope and safety boundary

This run acquired and classified sources only. It did not run ingestion, validation, canonical construction, graph updates, question generation, or any runtime write. The frozen Canonical baseline remains 004A 36, 004B 26, 004F 28, 004G 26, and 004H 35 (151 total).

Manufacturer documentation is not primary evidence. Product-specific RTH, failsafe, battery thresholds, motor/ESC parameters, and advertised communication range are explicitly excluded. Radio authorization and output limits remain in the Legal domain; 004E records only the technical lineage.

## Official institutions investigated

Domestic priority checks covered TS Korea Transportation Safety Authority, MOLIT, KIAST, National Radio Research Agency, Central Radio Management Service, RAPA, ETRI, Korean standards channels, KOSHA, and public aviation research channels. Overseas fallback checks covered FAA, NASA, GPS.gov, NTIA/NIST/FCC-family federal technical repositories.

The TS public course page confirms the domestic UAS training context but does not expose a downloadable technical textbook. It remains `MANUAL_ACQUISITION_REQUIRED`. The RRA technical-standard index is official and current, but its legal frequency/output material is not treated as a general radio-technology source.

## Source set

| Source | Authority/currentness | Use | Result |
|---|---|---|---|
| TS ultra-light vehicle training public area | Domestic official / current | Domestic exam and UAS context | Manual file required |
| RRA radio technical-standard index | Domestic official / current | 004E legal lineage only | Manual/legal boundary |
| FAA-H-8083-31B AMT Airframe | FAA official / current (2023) | Electrical, instruments, communication and navigation fundamentals | Acquired, 1,052 pages |
| NASA Li-ion Guidelines, NASA/TM-2010-216727 | NASA public research / concept-stable | Li-ion cell, charging, hazard and handling evidence | Acquired, 99 pages |
| GPS SPS Performance Standard, 5th Edition | U.S. Government / current (2020) | GPS/GNSS signal and performance evidence | Acquired |
| NTIA Report 04-416 | U.S. Government research / concept-stable | Propagation, path loss, antenna and interference fundamentals | Acquired, 193 pages |

Each acquired PDF passed HTTP/MIME handling, `%PDF-` signature, readable page-count, file-size, and SHA-256 checks. The registry contains exact official/download URLs, local paths, checksums, and page counts. The downloader uses one-second request spacing, at most two attempts, resume-safe existing-PDF skip, and a manual queue.

## Coverage result

| Batch | Topics | Source-covered | Local evidence | Domestic direct | UAS-specific direct | Missing | Readiness |
|---|---:|---:|---:|---:|---:|---:|---|
| 004C propulsion/electrical/battery | 27 | 21 | 21 | 0 | 0 | 6 | PARTIAL |
| 004D flight control/sensors/navigation | 24 | 11 | 11 | 0 | 0 | 13 | PARTIAL |
| 004E communication/control/radio | 19 | 13 | 12 | 2 | 0 | 6 | PARTIAL |

The acquired general technical documents close the original `MISSING_LOCAL_FILE` blocker for the mapped foundational topics, but do not by themselves make the batches ingestion-ready. All 70 topics still lack direct UAS-specific technical evidence, and 68 lack a domestic topic-level official source. This is intentionally reported as `PARTIAL`, not inflated to `READY`.

## Remaining gaps

- 004C: BLDC, KV, ESC, propeller pitch/diameter and C-rate still lack direct non-vendor official evidence. Formula evidence remains page-review dependent.
- 004D: flight-controller/IMU integration, holds, attitude estimation, sensor fusion, home point/RTH, geofencing, vision/ultrasonic obstacle detection and manufacturer-independent behavior remain unsupported.
- 004E: controller/telemetry/FPV/video/failsafe/link-loss behavior lacks direct official UAS evidence. RRA covers legal lineage but not the required technical explanations.
- Domestic TS technical teaching material requires authenticated/manual acquisition. Automatic scraping or private course access was not attempted.

## Technical asset inventory

The acquisition pass recorded 233 page-level graphics candidates and 62 table candidates. They are locator-only records with `interpretationRequired=true`; no visual meaning was inferred. No formula was promoted from sampled text because an exact page/expression pair was not confidently detected. `formula-inventory.json` therefore remains empty rather than inventing Ohm-law or RF equations without a verified locator.

## Ingestion queue and next order

Six acquired source/batch mappings are `PARTIAL_SOURCE`; none is `READY` because none is direct UAS evidence. Recommended next order:

1. Manually acquire and validate the TS official technical textbook/material.
2. Run 004C ingestion only for explicitly supported electrical and battery sections; retain BLDC/ESC/KV/propeller gaps.
3. Run 004D only for instrument and GPS/GNSS fundamentals; keep RTH/geofencing/vision behavior blocked.
4. Run 004E only for RF propagation and communication architecture fundamentals; keep legal limits and vendor failsafe/range separate.

## Mutation guard

Canonical 151, Active Pack, AtomicFact, Graph/Graph Version, Legal Runtime, Weather Runtime, questions, and Supabase mutations are all 0. Existing 004A/B/F/G/H artifacts were read but not modified.
