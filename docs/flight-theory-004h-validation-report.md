# FLIGHT-THEORY-004H Validation 및 Canonical 보고서

## 결과

SOURCE-BATCH-004H 입력 36건을 전수 검증했다.

- `VALIDATED`: 19
- `VALIDATED_WITH_WARNING`: 16
- `BLOCKED_RELATIONSHIP`: 1
- Unsupported inference: 0
- Canonical 004H: 35

| 유형 | 검증 결과 | Canonical |
|---|---|---:|
| HumanFactor | Warning 8 | 8 |
| RiskManagement | Validated 6 | 6 |
| CrewCoordination | Validated 1 / Warning 1 | 2 |
| Maintenance | Validated 5 | 5 |
| Inspection | Validated 2 | 2 |
| SafetyKnowledge | Validated 1 / Warning 1 | 2 |
| FlightConcept | Warning 3 | 3 |
| Relationship | Validated 4 / Warning 3 / Blocked 1 | 7 |

## Source currentness

FAA AC 107-2A 기반 지식은 current source로 검증했다. 2016 FAA Remote Pilot Study Guide 기반 16건은 안정적인 ADM·human factors·CRM 원칙 또는 그 직접 관계로 한정하고 `POSSIBLY_OUTDATED_CONCEPT_STABLE_SOURCE` warning을 유지했다. 구버전 source의 운영 수치나 최신 규칙은 승격하지 않았다.

CRM 지식은 `GENERAL_AVIATION` coordination context를 유지하며 드론 전용 역할로 변환하지 않았다. AC 107-2A가 remote PIC와 crewmember를 직접 명시한 coordination만 `UAS_SPECIFIC`으로 유지했다.

## 차단 관계

`flight-h-relation:control-mitigates-risk`는 `risk-control MITIGATED_BY residual-risk` 방향이 뒤집혀 있다. Residual risk가 control을 완화하는 관계가 아니므로 `BLOCKED_RELATIONSHIP` 처리했으며 Canonical에 포함하지 않았다. 기존 ingestion artifact는 수정하지 않았다.

## Duplicate와 domain boundary

- `flight-h-concept:sop-risk-tool`: 004F checklist와 같은 evidence를 참조하지만 실제 checklist item이 아니라 risk-management 역할을 설명하므로 `SAME_EVIDENCE_DIFFERENT_ROLE`이다.
- `flight-inspection:condition-anomaly`: 004G failure와 같은 evidence를 쓰지만 failure 자체가 아닌 maintenance inspection trigger이므로 lineage를 유지한 독립 지식이다.
- Canonical duplicate loser: 0
- 기존 004F/004G Canonical 수정: 0

Procedure Inventory 64건은 `004F_CONFIRMED 8`, `004G_CONFIRMED 5`, `004H_CONFIRMED 6`, `NOT_PROCEDURE 45`로 합계가 유지됐다.

## 안전 경계

Fatigue/rest/sleep/medical threshold, 임의 likelihood·severity·risk score, UAS CRM 역할 확대, 정비·교체·검사 주기, 제조사 기준 일반화, Legal 의무 복제를 발견하거나 생성하지 않았다. Unsupported inference는 0이다.

## Canonical과 Topic Coverage

Canonical checksum은 `sha256-31b23f3fc32fb399262fbc4ac39ccdb881b408b965af177d6da836f45ed4c152`다. timestamp는 checksum에서 제외되며 동일 입력 재실행 결과가 동일하다.

21개 Topic 모두 최소 하나의 검증 및 Canonical 지식을 보유해 topic status는 `VALIDATED 21`이다. 다만 한국 시험 공식 원문 부재와 004C/D/E source gap을 고려해 전체 runtime readiness는 `READY_WITH_GAPS`, freeze는 `READY_WITH_GAPS_FROZEN`으로 판정했다.

## 전체 Flight Theory 상태

- 004A: 36, frozen
- 004B: 26, frozen
- 004F: 28, frozen
- 004G: 26, frozen
- 004H: 35, frozen
- 누계: 151

READY 영역 004A/B/F/G/H의 ingestion, validation, Canonical 생성이 종료됐다. 다음 우선순위는 Question 생성이 아니라 004C/004D/004E 공식 UAS source 확보다.

## Mutation

기존 Canonical, Active Pack, AtomicFact, Graph, Question, Legal/Weather runtime 및 Supabase mutation은 모두 0이다.
