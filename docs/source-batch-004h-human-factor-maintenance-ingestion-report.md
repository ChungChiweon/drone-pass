# SOURCE-BATCH-004H 인적요인·위험관리·정비 Ingestion 보고서

## Source와 처리 범위

Registry에서 004H READY로 연결된 공식 source는 3개였다. 로컬 원문과 checksum을 확인할 수 있는 `FAA AC 107-2A`와 `FAA Remote Pilot Study Guide (2016)` 2개만 처리했다. 한국교통안전공단 시험 페이지는 공개 추출 파일이 없어 지식 근거로 사용하지 않았다.

- 처리 페이지: 21쪽
- Source section: 4개
- Topic: workspace taxonomy 21개
- Study Guide 지식은 `POSSIBLY_OUTDATED` 경계를 반영해 `ELIGIBLE_WITH_WARNING`으로 전달

## Ingestion 결과

| 유형 | 수 |
|---|---:|
| HumanFactorKnowledge | 8 |
| RiskManagementKnowledge | 6 |
| CrewCoordinationKnowledge | 2 |
| MaintenanceKnowledge | 5 |
| InspectionKnowledge | 2 |
| SafetyKnowledge | 2 |
| FlightConcept | 3 |
| FlightRelationship | 8 |
| Visual Link | 0 |

21개 Topic은 모두 전수 평가했고 source-backed knowledge가 연결됐다. 아직 Validation을 하지 않았으므로 `VALIDATED` 상태는 사용하지 않았다.

## 경계 처리

- Fatigue와 stress는 source에 명시된 performance 영향만 저장했다. duty time, 최소 휴식시간, 수면시간 또는 의학적 기준을 만들지 않았다.
- CRM은 Study Guide의 일반 crew 환경을 `GENERAL_AVIATION_CONTEXT`로 유지했다. UAS 관계는 AC 107-2A가 remote PIC와 crewmember를 직접 명시한 범위만 사용했다.
- Risk matrix의 임의 점수는 만들지 않았다. AC가 제공한 정성적 likelihood/severity/risk 구조만 보존했다.
- Maintenance interval은 제조사 schedule이 존재한다는 의미만 `MANUFACTURER_DEFINED`로 표시했다. 시간·cycle·calendar 수치는 일반화하지 않았다.
- 004F checklist는 복제하지 않고 SOP/checklist의 위험관리 도구 개념만 생성했다.
- 004G failure는 복제하지 않고 condition-based inspection lineage만 기록했다.
- 법적 정비 의무와 기록 보존기간은 Legal Knowledge로 복제하지 않았다.

## Deferred와 Procedure Inventory

- 004F → 004H deferred: 2건 회수
- 004G procedure inventory 004H 후보: 6건 재평가
  - 61, 62, 64, 65쪽: `ACCEPTED_004H`
  - 63, 66쪽: 004F deferred evidence와 중복되어 `DUPLICATE_EXISTING_EVIDENCE`
- 64건 최종 분류: 004F 8, 004G 5, 004H 6, NOT_PROCEDURE 45
- 원본 inventory와 deferred artifact는 수정하지 않았다.

004H 처리 중 004C/D/E로 넘길 직접 기술 근거는 새로 발견되지 않았다.

## Quality와 Validation 준비

- Source locator completeness: 1.00
- Provenance completeness: 1.00
- Human/Risk/CRM/Maintenance/Inspection/Relationship structure: 각 1.00
- Extraction quality: 0.96
- Unsupported inference: 0
- Validation input: 36건
  - ELIGIBLE: 23
  - ELIGIBLE_WITH_WARNING: 13
  - BLOCKED: 0

## 기존 상태와 Mutation

004A/B/F/G Canonical은 수정하지 않았다. 004G checksum `sha256-23e5670381ad24f4c3c8b2bac2155111517ef17ced9aa6aa37757623accc73aa`도 유지된다. Active Pack, AtomicFact, Graph, Question, Legal/Weather runtime, Supabase mutation은 모두 0이다. Canonical 생성은 다음 Validation 단계 이후로 보류했다.
