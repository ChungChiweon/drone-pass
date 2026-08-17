# SOURCE-BATCH-004G Validation Report

## Scope

`work/flight-theory-validation/004g`의 32건만 검증했다. Canonical 생성과 ID 발급은 수행하지 않았다. Primary evidence는 FAA AC 107-2A로 제한했으며 2016 Study Guide는 primary claim을 대체하지 않았다.

## Result

| Status | Count |
|---|---:|
| VALIDATED | 24 |
| VALIDATED_WITH_WARNING | 2 |
| BLOCKED | 5 |
| DUPLICATE | 1 |
| NO_CANONICAL_CANDIDATE | 0 |

## Knowledge type result

| Type | Validated | Warning | Blocked | Duplicate |
|---|---:|---:|---:|---:|
| FailureMode | 9 | 0 | 0 | 0 |
| FailureSymptom | 8 | 0 | 0 | 0 |
| EmergencyProcedure | 1 | 0 | 0 | 1 |
| EmergencyDecision | 2 | 0 | 0 | 0 |
| SafetyKnowledge | 2 | 1 | 0 | 0 |
| FlightConcept | 1 | 1 | 0 | 0 |
| Relationship | 1 | 0 | 5 | 0 |

## Source and type boundary

모든 승격 후보는 FAA AC 107-2A page/section locator와 직접 evidence를 가진다. Supporting Study Guide만으로 current primary-level claim을 만든 항목은 없다.

FailureMode는 실패·이상 상태, FailureSymptom은 관찰 가능한 징후로 분리되었다. Symptom에 원인이나 대응이 들어간 항목은 없다. EmergencyProcedure 2건은 source에 순서가 없어 모두 unordered 상태를 유지한다.

## Warning decisions

### `flight-emergency-safety:battery-fire`

- Status: `VALIDATED_WITH_WARNING`
- Warning: `NO_SOURCE_SUPPORTED_FIRE_SUPPRESSION_RESPONSE`
- Decision: 조건부 Canonical 후보
- Condition: battery fire hazard와 manufacturer recommendation 기반 preventive handling만 허용한다. Fire suppression 또는 구체 emergency response로 확장하면 안 된다.

### `flight-emergency-concept:emergency-landing-capability`

- Status: `VALIDATED_WITH_WARNING`
- Warning: `NO_EMERGENCY_LANDING_PROCEDURE_IN_SOURCE`
- Decision: 조건부 Canonical 후보
- Condition: emergency landing capability 개념으로만 사용할 수 있다. Procedure, ordered step, forced-landing action으로 출제할 수 없다.

## Duplicate and overlap

`flight-emergency:general-response`는 단일 action이 `flight-emergency-safety:minimize-injury-damage`와 동일한 일반 안전 원칙이다. 독립 EmergencyProcedure로 승격하지 않고 `DUPLICATE`로 분류했다.

기존 004A/B/F Canonical과 의미상 승격을 막아야 할 duplicate는 0건이다. Control-link preflight checks와 004G in-flight delayed-control 대응은 phase, trigger, action이 달라 distinct로 유지했다.

## Relationship blockers

6건 중 `flight-emergency-relation:delay-triggers-decision` 1건만 direction과 endpoint type이 유효하다.

나머지 5건은 `RELATIONSHIP_DIRECTION_OR_TARGET_TYPE_INVALID`로 차단했다.

- `RESULTS_IN`이 SafetyKnowledge를 target으로 사용한 관계 2건
- `DETECTED_BY`가 FailureSymptom 대신 EmergencyDecision을 target으로 사용한 관계 2건
- `CAUSES`가 FailureMode 대신 SafetyKnowledge를 target으로 사용한 관계 1건

동시 언급이나 관련성만으로 relation을 통과시키지 않았다. 원본 relationship artifact는 수정하지 않았다.

## NO_KNOWLEDGE preservation

다음 6개 topic 모두 Knowledge 생성 0을 확인했다.

- emergency-gps-error
- emergency-compass-error
- esc-failure
- rth-error
- forced-landing
- post-accident-response

다른 topic의 Knowledge가 위 gap을 우회해서 채운 사례도 없다. Emergency landing은 capability-only warning 상태이며 procedure gap을 유지한다.

## Unsupported inference

Unsupported inference: 0

배터리 비율·전압, GPS satellite count, RTH altitude/automation, lost-link automation, motor-out/ESC/GPS/compass response, fire suppression, forced landing steps, legal accident reporting procedure는 생성 또는 보완되지 않았다.

## Canonical candidate inventory

- Ready candidates: 24
- Conditional candidates: 2
- Total candidates: 26
- Held: 6
  - Blocked relationship: 5
  - Duplicate procedure: 1

Candidate inventory는 source Knowledge ID만 사용하며 `canonicalId`는 모두 `null`이다. Canonical 파일과 checksum은 생성하지 않았다.

## Deferred and mutation

- 004H deferred: 2, unchanged
- Canonical mutation: 0
- Graph mutation: 0
- Active Pack mutation: 0
- Question mutation: 0
- Supabase mutation: 0

Validation이 완료되어 Canonical 생성 단계로 진행할 수 있지만, 조건부 후보 2건의 제한과 relationship blocker 5건을 그대로 적용해야 한다.
