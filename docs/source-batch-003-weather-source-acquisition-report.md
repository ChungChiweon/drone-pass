# SOURCE-BATCH-003 항공기상 공식 Source 확보 보고서

실행일: 2026-08-09  
범위: 공식 Source 확보·분류·Ingestion 준비만 수행. 문제 생성, Fact 승인, Graph 변경은 수행하지 않았다.

## 1. 조사한 공식 기관과 Source

공식 기관은 항공기상청과 기상청 2곳을 우선 조사했다. 국토교통부와 한국교통안전공단은 등록 가능한 기관 범위에 포함했지만, 이번 최초 배치에서 항공기상 전체를 직접 설명하는 다운로드 자료는 채택하지 않았다.

| Source | 기관 | 상태 | Currentness | 활용 범위 |
|---|---|---:|---|---|
| 기초 기상분석 | 기상청 | 다운로드 | POSSIBLY_OUTDATED | 기압·기온·습도·바람·구름·전선·일기도 |
| 2024년도 교육훈련계획 | 기상청 | 다운로드 | CURRENT | 항공기상·관측·위성·레이더·위험기상 교육 범위 |
| 항공기상업무 개요 | 항공기상청 | HTML 다운로드 | CURRENT | METAR/SPECI, TAF, SIGMET/AIRMET, 저고도 예보 |
| METAR/SPECI 및 RMK 해설자료 | 항공기상청 | 수동 확보 필요 | POSSIBLY_OUTDATED | 관측 전문·코드·예시 |
| 항공기상청 API 활용 가이드 | 항공기상청 | 수동 확보 필요 | CURRENT | METAR/SPECI/TAF/SIGMET/AIRMET 제공 범위 |

기초 기상분석 PDF의 서버 Last-Modified는 2014-09-16이므로 현행 자료로 오인하지 않고 `POSSIBLY_OUTDATED`로 분류했다. 항공기상청 첨부파일 URL은 임의로 추측하지 않았으며 공식 게시물의 클릭 경로만 기록했다.

## 2. 실행 결과

- 발견/등록 Source: 5
- 실제 다운로드: 3 (PDF 2, HTML 1)
- Current: 3
- Possibly outdated: 2
- 수동 확보 필요: 2
- 거절: 0
- Taxonomy Topic: 47
- 공식 Source가 연결된 Topic: 24
- READY ingestion job: 3

원문은 `data/sources/drone-license/weather/official/` 아래 기관/Source별 `original` 폴더에 저장했다. 각 Source에는 metadata, extraction, validation, images, tables 전용 폴더가 있다. 체크섬은 Source metadata에 기록했다.

## 3. Weather Taxonomy

003A 기상 기초, 003B 구름·강수·시정, 003C 기압계·전선, 003D 위험기상, 003E 항공기상 관측·정보, 003F 드론 운용 영향으로 구분했다. 법규 Fact 모델을 재사용하지 않고 `WeatherConcept`, `WeatherPhenomenon`, `WeatherHazard`, `WeatherObservation`, `WeatherOperationalImpact`, `WeatherRelationship` 계약을 분리했다.

공식 Source 연결 전에는 `officiallyVerified=true`가 되지 않도록 Source ID를 근거로 계산하는 구조다. 운용 영향도 상식적 추론으로 채우지 않고 공식 근거가 있는 경우에만 생성하도록 Adapter 계약에 명시했다.

## 4. Visual Source 인벤토리

자동 의미 해석은 수행하지 않았다. Source metadata를 기준으로 위치 확인 대상 10개를 등록했다.

- WEATHER_CHART
- FRONT_SYMBOL
- PRESSURE_PATTERN
- CLOUD_DIAGRAM
- RADAR_IMAGE
- SATELLITE_IMAGE
- OBSERVATION_TABLE
- METAR_TAF_EXAMPLE

페이지·bounding box·caption은 다음 extraction 단계에서 원문을 렌더링해 확정해야 한다. 현재 quality 0.5는 “Source 내 존재 가능성 인벤토리” 수준이며 내용 검증 점수가 아니다.

## 5. 003A~003F Coverage

| Batch | Covered/Total | 상태 |
|---|---:|---|
| 003A 기상 기초 | 5/6 | PARTIAL |
| 003B 구름·강수·시정 | 4/5 | PARTIAL |
| 003C 기압계·전선 | 5/8 | PARTIAL |
| 003D 위험기상 | 0/11 | BLOCKED |
| 003E 관측·정보 | 10/10 | READY |
| 003F 드론 운용 영향 | 1/7 | PARTIAL |

가장 큰 Gap은 위험기상(003D)과 드론 저고도 운용 영향(003F)이다. 2024 교육계획은 해당 교육과정의 존재를 보여 주지만 개별 위험기상 지식을 추출할 본문 교재가 아니므로, Topic을 근거 없이 채운 것으로 계산하지 않았다.

## 6. Ingestion Queue와 다음 우선순위

READY 3건은 텍스트·개념·현상·관측·관계 후보와 시각자료 위치만 추출한다. 수동 확보 2건은 공식 첨부를 사람이 다운로드해 MIME/checksum을 검증하기 전까지 실행하지 않는다.

다음 우선순위:

1. 항공기상청 위험기상 공식 교육 본문 확보(003D).
2. METAR/SPECI 및 API 가이드 첨부 수동 확보 후 코드 예시 검증(003E).
3. 저고도·드론 운용 영향을 직접 뒷받침하는 TS/국토교통부 공식 교재 확보(003F).
4. 2014 기초자료의 핵심 개념을 최신 공식 자료로 교차검증.

## 7. Legal Runtime Freeze

실행 전후 `work/legal-runtime-hardening/runtime-summary.json`과 `work/legal-shadow-pack/shadow-pack.json` SHA-256이 일치했다. `legalMutationCount=0`이다. Active Pack, AtomicFact status, Active Graph, Question DB 및 Supabase에는 접근하거나 저장하지 않았다.

## 8. 산출물

- `work/source-ingestion/source-batch-003/`의 registry/acquired/rejected/manual/matrix/gap/visual/queue/batch/execution/summary
- `work/source-inventory/weather-source-coverage-matrix.json`
- `work/source-inventory/weather-source-gap-analysis.json`
- `work/source-inventory/weather-source-ingestion-queue.json`

이 결과는 Source 확보 상태이며 Knowledge 검증 또는 시험 출제 준비 완료를 의미하지 않는다.
