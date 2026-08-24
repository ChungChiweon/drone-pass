# Drone Exam Source Inventory and Coverage Report

## Executive conclusion

The current 433 AtomicFacts are an initial engine-validation corpus, not a representative national drone written-exam knowledge base. Every Fact is connected to one of only two logical source records, both limited to aviation law. Aviation weather has no source-backed Fact, and flight theory/operation has no source-backed Fact.

The former 40-question goal is retired as an operational objective. Source acquisition, revision verification, extraction quality, and subject/topic coverage now determine completion.

## 1. Current source inventory

| Source | Local original | Authority | Date/currentness | Pages | Facts | Approved | Extraction |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| 한국교통안전공단 `항공안전법 무인동력비행장치 온라인교육` | `docs/1. 항공안전법 (1).pdf` | OFFICIAL_EDUCATION | 2021 / POSSIBLY_OUTDATED | 35 | 215 | 11 | REPROCESS_REQUIRED |
| `항공사업법 드론 자격 교육자료` | missing | UNKNOWN | UNDATED | unknown | 218 | 19 | MISSING_FILE |

The PDF was opened and inspected, not classified by filename alone. Its first pages identify the title, year 2021, Korea Transportation Safety Authority, and coverage of aviation-law structure, Aviation Safety Act content, pilot certification operating rules, and device-reporting rules. SHA-256: `4fcaaad959fb95aee461b277736b8494a3b4ad3d964e6e8ad9ece426149d57cd`.

Markdown reports, graph snapshots, exports, and review JSON under `docs/` and `work/` were inspected as derived artifacts or backups. They are not counted as independent source evidence. The Pack export confirms two `SourceDocument` records and the 215/218 Fact split.

## 2. Fact/source distribution

- AtomicFact: 433
- Approved: 30 in the active browser repository
- Draft: 403
- Logical sources used by Facts: 2
- Physical original files currently available: 1
- Aviation Safety Act education source: 215 Facts (49.7%)
- Undated Aviation Business Act training source: 218 Facts (50.3%)
- Source concentration: 100% in aviation-law-related material

## 3. Subject coverage

| Subject | Taxonomy topics | Topics with any source | Coverage | Assessment |
| --- | ---: | ---: | ---: | --- |
| Aviation law | 19 | 12 | 63.2% source presence | Narrow, non-current and incomplete |
| Aviation weather | 23 | 0 | 0% | Missing subject |
| Flight theory and operation | 42 | 0 | 0% | Missing subject |

No topic is `PRODUCTION_READY`: there is no topic with two current official sources, verified official scope, completed extraction, and validated Facts. Approved Fact volume cannot override this rule.

## 4. Largest gaps

1. Official written-exam subject/scope definition is missing, so every taxonomy item remains `officiallyVerified=false`.
2. Current Aviation Safety Act, Enforcement Decree, Enforcement Rule, related tables, and revision/effective dates are missing as versioned originals.
3. Aviation weather has no official source or extracted Fact.
4. Flight theory, aircraft systems, electricity/battery, operation, emergency procedures, and human factors have no official source or extracted Fact.
5. The sole local PDF needs legal-text/table reprocessing because it is a 2021 slide deck with mixed legal layers and layout-dependent tables.
6. The Aviation Business Act training source is undated, has no issuer, and has no original file.

## 5. Additional official sources to acquire

Priority 1:

- current Aviation Safety Act, Enforcement Decree, and Enforcement Rule;
- current pilot certification operating rules and related tables;
- Korea Transportation Safety Authority official exam guide and official subject/scope statement;
- revision and effective-date evidence.

Priority 2:

- official aviation-weather learning material from the Aviation Meteorological Office, Ministry of Land, Infrastructure and Transport, or Korea Transportation Safety Authority.

Priority 3:

- official flight-theory, aircraft-system, electric/battery, operation, inspection, emergency, and safety/human-factor material.

No external URL or current version was guessed, and no file was downloaded during this audit.

## 6. Acquisition manifest and ingestion queue

- Acquisition records: 8
- `ALREADY_AVAILABLE`: 1
- `MANUAL_ACQUISITION_REQUIRED`: 1
- `MISSING`: 6
- READY ingestion jobs: 0
- `REPROCESS_REQUIRED`: 1
- Blocked jobs: 7

Artifacts:

- `work/source-inventory/drone-source-acquisition-manifest.json`
- `work/source-inventory/drone-source-ingestion-queue.json`
- `work/source-inventory/drone-source-coverage-matrix.json`
- `work/source-inventory/drone-source-processing-batches.json`

## 7. Source processing batches

1. `SOURCE-BATCH-001`: current law and official scope
2. `SOURCE-BATCH-002`: operating rules and legal tables
3. `SOURCE-BATCH-003`: aviation-weather fundamentals
4. `SOURCE-BATCH-004`: hazardous weather
5. `SOURCE-BATCH-005`: flight principles
6. `SOURCE-BATCH-006`: aircraft, electricity, and batteries
7. `SOURCE-BATCH-007`: operation, inspection, and emergency procedures
8. `SOURCE-BATCH-008`: human factors and safety management

Each batch completes only when its required source, version, extraction, locator, loss/conflict, and validation conditions pass. Question generation is a downstream measurement and is not a completion condition.

## 8. Canary/promotion freeze

Canary and autonomous-promotion experiments are retained for regression history but hidden from production navigation and blocked outside development with `notFound()`. The detailed freeze and restart criteria are documented in `docs/autonomous-promotion-development-freeze.md`.

## 9. Data safety

- Pack mutations: 0
- AtomicFact status changes: 0
- Graph version/relation changes: 0
- Question DB writes: 0
- Supabase changes: 0
- External downloads: 0
