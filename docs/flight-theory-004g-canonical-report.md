# FLIGHT-THEORY-004G Canonical 생성 보고서

## 결과 요약

검증 완료 inventory 26건만 입력으로 사용해 Canonical 004G 세트를 생성했다. Validation 판정은 재계산하지 않았다. 결과는 25개 지식 unit과 1개 relationship unit, 총 26개다.

| 유형 | Canonical 수 |
|---|---:|
| FailureMode | 9 |
| FailureSymptom | 8 |
| EmergencyProcedure | 1 |
| EmergencyDecision | 2 |
| SafetyKnowledge | 3 |
| FlightConcept | 2 |
| Relationship | 1 |
| 합계 | 26 |

Deterministic checksum은 `sha256-23e5670381ad24f4c3c8b2bac2155111517ef17ced9aa6aa37757623accc73aa`다. `generatedAt`은 checksum 입력에서 제외된다.

## 입력과 제외

- READY 후보: 24
- CONDITIONAL 후보: 2
- 차단된 Relationship: 5 — Canonical에 포함하지 않고 `canonical-exclusions.json`에 원 relation type, 양 endpoint, blocker와 사유를 보존했다.
- 중복 Procedure: `flight-emergency:general-response` — `flight-emergency-safety:minimize-injury-damage`와 의미가 중복되어 제외했다.
- 기존 004A/B/F Canonical과의 추가 중복: 0

## Warning 2건의 경계

`flight-emergency-safety:battery-fire`는 `NO_SOURCE_SUPPORTED_FIRE_SUPPRESSION_RESPONSE`를 유지한다. 제조사 권고 기반 예방 handling만 허용하며, 화재 진압 procedure와 source에 없는 emergency action은 허용하지 않는다.

`flight-emergency-concept:emergency-landing-capability`는 `NO_EMERGENCY_LANDING_PROCEDURE_IN_SOURCE`를 유지한다. capability 질문만 허용하며 procedure 및 ordered procedure 질문은 허용하지 않는다.

## Procedure와 관계

유일한 EmergencyProcedure `flight-emergency:delayed-control-response`는 `ordered=false`다. `PROCEDURE_ORDER`는 지원 유형에서 제외했다. 검증 통과 관계 `flight-emergency-relation:delay-triggers-decision`만 Canonical 관계로 생성했다.

## Topic coverage와 gap

004G의 20개 topic을 재계산했다. 다음 6개는 계속 `NO_KNOWLEDGE`다.

- `flight:emergency-gps-error`
- `flight:emergency-compass-error`
- `flight:esc-failure`
- `flight:rth-error`
- `flight:forced-landing`
- `flight:post-accident-response`

숫자 임계값, 자동화 동작, 제조사 failsafe, procedure 순서 또는 source에 없는 emergency action을 보충하지 않았다.

## Runtime readiness와 Freeze

- Runtime readiness: `READY_WITH_GAPS`
- Freeze: `READY_WITH_GAPS_FROZEN`
- Canonical provenance 누락: 0
- Canonical 내부 critical blocker: 0
- Unsupported inference: 0
- 004H deferred: 2건 그대로 보존하며 004G에 포함하지 않았다.

현재 Canonical 자체는 shadow runtime 입력으로 사용할 수 있으나, 6개 핵심 gap은 공식 source가 추가되기 전까지 유지된다. 다음 단계는 004H이며, 공식 source 추가·치명적 구조 오류·shadow runtime 실제 문제 중 하나가 없으면 004G 엔진을 재개하지 않는다.

## Mutation guard

004A/B/F Canonical, 004G validation 원본, 004H deferred의 실행 전후 checksum을 비교했다. Active Pack, AtomicFact, graph, question, Supabase mutation은 모두 0이다.
