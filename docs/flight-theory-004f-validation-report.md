# FLIGHT-THEORY-004F Validation Report

## Scope

SOURCE-BATCH-004F의 비행 전·중·후 운용 Knowledge 29건만 검증했다. 문제 생성, Active Pack, AtomicFact, Active Graph, Legal/Weather canonical은 변경하지 않았다.

## Validation input and result

| Type | Input | Validated | Warning | Blocked | Canonical |
|---|---:|---:|---:|---:|---:|
| OperationalProcedure | 3 | 3 | 0 | 0 | 3 |
| ChecklistItem | 10 | 10 | 0 | 0 | 9 |
| FlightConcept | 4 | 3 | 1 | 0 | 4 |
| SafetyKnowledge | 3 | 3 | 0 | 0 | 3 |
| OperationalDecision | 3 | 3 | 0 | 0 | 3 |
| Relationship | 6 | 6 | 0 | 0 | 6 |
| Total | 29 | 28 | 1 | 0 | 28 |

검증 점수는 source evidence 30%, structural completeness 25%, operational fidelity 20%, ordering/decision evidence 15%, relationship consistency 10%를 적용했다. blocker가 있으면 점수와 무관하게 차단한다.

## Procedure validation

Procedure 3건은 모두 source reference, raw evidence, phase와 step 구조를 갖췄다. Ordered procedure는 `flight-procedure:postflight-review` 1건이며 Appendix E의 `Post-Flight 1`, `2` 표기와 ordering evidence를 확인했다. 나머지 2건은 확인 항목의 임의 순서화를 피하기 위해 unordered로 유지했다.

## Checklist validation

Checklist 10건은 모두 source locator와 evidence를 갖췄다. `flight-checklist:postflight-evaluation`은 `flight-procedure:postflight-review`의 첫 step과 동일하여 `PROCEDURE_CHECKLIST_OVERLAP`으로 분류했다. 원본 입력과 validation 결과는 보존하고 canonical에서 checklist 쪽만 제외했다.

## Concept validation and Legal/Weather boundary

Concept 4건 중 `flight-concept:operating-environment`은 weather와 airspace를 언급하므로 `LEGAL_OR_WEATHER_REFERENCE_ONLY` warning을 부여했다. 이는 운용 전 확인 절차의 맥락만 유지하며 기상현상 정의나 법적 기준을 004F에 복제하지 않는다.

## Safety validation

SafetyKnowledge 3건 모두 hazard 또는 preventive action과 source evidence를 갖췄다. 일반 안전 상식으로 확장하지 않고 control response, traffic separation, preflight inspection이라는 source-supported 범위만 유지했다.

## Decision and monitoring boundary

OperationalDecision 3건 모두 monitored condition, trigger, decision과 evidence가 있어 `DECISION_CONFIRMED`로 판정했다. Monitoring-only로 재분류된 항목은 0건이다. 배터리 비율, 통신 거리, RTH 고도, GPS 위성 수 등 source가 정하지 않은 threshold는 생성하지 않았다.

## Relationship validation

Relationship 6건 모두 endpoint 존재, 허용 relation type, 방향, evidence와 locator를 확인했다. Synthetic relationship과 missing endpoint는 0건이다.

## Duplicate and overlap

- `PROCEDURE_CHECKLIST_OVERLAP`: 1
- `DISTINCT`: 28
- canonical duplicate loser: `flight-checklist:postflight-evaluation`

원본 Knowledge는 삭제하거나 수정하지 않았다.

## Canonical 004F

- Total: 28
- OPERATIONAL_PROCEDURE: 3
- CHECKLIST_ITEM: 9
- FLIGHT_CONCEPT: 4
- SAFETY_KNOWLEDGE: 3
- OPERATIONAL_DECISION: 3
- OPERATIONAL_MONITORING: 0
- RELATIONSHIP: 6
- Checksum: `sha256-82b08c176512ac4baacb9aa26dc5cb9466a8f2a13d842ad4f04c106e717bfc9e`

Question eligibility는 실제 구조가 지원하는 유형만 표시했다. Unordered procedure에는 `PROCEDURE_ORDER`를 부여하지 않았고 trigger 없는 monitoring에는 `OPERATIONAL_DECISION`을 부여하지 않는 규칙을 적용했다.

## Topic validation coverage

- VALIDATED: 10
- VALIDATED_WITH_GAPS: 2
- NO_KNOWLEDGE: 10

기존 NO_KNOWLEDGE 10개를 임의 해소하지 않았다. Visual asset 0은 blocker가 아니며 별도 gap으로 유지한다.

## Deferred boundary

- 004G: 1
- 004H: 2

세 항목 모두 target batch와 source locator/raw evidence가 보존되었으며 Canonical 004F에서 제외했다.

## Runtime readiness and next batches

판정은 `READY_WITH_GAPS`이며 detached shadow runtime 입력으로 사용할 수 있다. 004A와 004B는 `READY_WITH_GAPS_FROZEN` 상태를 유지한다. 다음 ingestion 준비 대상은 004G와 004H이고, source가 부족한 004C·004D·004E는 계속 blocked다.

## Data impact

- Active Pack mutation: 0
- AtomicFact mutation: 0
- Active Graph mutation: 0
- Question DB write: 0
- Supabase mutation: 0
- Existing 004A/004B canonical mutation: 0
