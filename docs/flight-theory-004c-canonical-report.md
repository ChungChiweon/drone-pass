# FLIGHT-THEORY-004C Canonical Report

## 1. Build boundary

Validation을 다시 실행하거나 재판정하지 않고 `canonical-candidate-inventory.json`의 29건만 사용했다. 입력 조건은 READY 9, READY_WITH_WARNING 20, BLOCKED 0, 기존 canonicalId 전부 null로 확인됐다.

## 2. Canonical result

| Metric | Count |
| --- | ---: |
| Canonical input | 29 |
| Canonical generated | 29 |
| Knowledge units | 22 |
| Relationship units | 7 |
| READY | 9 |
| READY_WITH_WARNING | 20 |

Canonical ID는 `flight-004c:<type>:<stable-key>` 형식이며 random UUID와 timestamp를 사용하지 않는다.

## 3. Type distribution

| Type | Count |
| --- | ---: |
| ELECTRICAL_CONCEPT | 6 |
| POWER_CONCEPT | 2 |
| PROPULSION_COMPONENT | 1 |
| BATTERY_KNOWLEDGE | 9 |
| BATTERY_SAFETY | 2 |
| TECHNICAL_FORMULA | 2 |
| RELATIONSHIP | 7 |

## 4. Warning preservation

READY_WITH_WARNING 20건을 포함하되 warning을 제거하지 않았다. `GENERAL_TECHNICAL_CONTEXT`, `NOT_UAS_SPECIFIC`과 UAS/LiPo/threshold 관련 금지 constraint가 Canonical metadata에 유지된다. Supporting visual unresolved 상태는 별도 manifest에 보존된다.

## 5. Technical context and question constraints

| Context | Count |
| --- | ---: |
| ELECTRICAL_GENERAL | 12 |
| AVIATION_GENERAL | 2 |
| BATTERY_GENERAL | 15 |

Electrical은 개념·공식 해석·관계 선택만 허용하고 UAS-specific operation을 금지한다. Battery는 일반 개념·안전·C-rate만 허용하며 drone LiPo, threshold, product-specific rule을 금지한다. Aviation은 component function과 technical concept만 허용하며 drone-specific configuration을 금지한다.

## 6. Formula and relationship

Formula는 검증 완료된 `E = I × R`, `P = I² × R` 2건만 포함했다. KV, cell voltage, propeller, C-rate 확장 공식은 없다.

Relationship 7건은 기존 source/target endpoint, direction, relation type, evidence, locator를 보존하고 Canonical endpoint ID를 함께 기록했다. 새 relation은 생성하지 않았다.

## 7. Battery and LiPo boundary

Battery 9건과 Safety 2건은 `GENERAL_LITHIUM_ION`/`BATTERY_GENERAL` 문맥을 유지한다. C-rate NASA source reference도 유지된다. `flight:lipo` Canonical은 생성하지 않았고 Gap으로 남겼다.

## 8. 004B / 004G lineage

- `propulsion-component:motor`: `SAME_ENTITY_DIFFERENT_ROLE` (004B)
- `battery-safety:battery-fire`: `TECHNICAL_VS_EMERGENCY_ROLE` (004G)

Lineage metadata만 기록했으며 기존 Canonical은 수정하지 않았다.

## 9. Visual and table isolation

Visual 102건은 `canonical-visual-support.json`에 `SUPPORTIVE_UNRESOLVED`로 유지했다. Visual Canonical Knowledge 생성은 0이다.

Table 2건은 `canonical-exclusions.json`에 `PAGE_REVIEW_REQUIRED`로 기록했다. Table Canonical 생성은 0이며 다른 29건을 차단하지 않았다.

## 10. Gap and topic coverage

Gap 7개를 보존했다: BLDC, KV, ESC, propeller pitch, propeller diameter, LiPo, battery storage.

27 Topic별 canonical knowledge, warning, formula, relationship, visual, table count를 재계산했다. 지식이 있는 topic은 General-context warning에 따라 `READY_WITH_GAPS`, 7개 gap topic은 `NO_KNOWLEDGE`다.

## 11. Runtime readiness and freeze

- Runtime readiness: `READY_WITH_GAPS`
- Freeze: `READY_WITH_GAPS_FROZEN`
- Next batch: `004D`

재개 조건은 TS 공식 기술 교재 확보, 신규 공식 UAS source 확보, 치명적 Validation/Runtime 오류로 제한한다. Shadow runtime과 문제 생성은 실행하지 않았다.

## 12. Canonical total

기존 004A/B/F/G/H 누계 151은 변경하지 않았다. 신규 004C 실제 Canonical 29를 더한 Flight Theory artifact 누계는 180이다.

## 13. TS manual

TS 상태는 `WAITING_FOR_MANUAL_FILE`이다. Gap이나 Context를 임의 해소하지 않았으며 향후 source version 추가 ingestion 조건으로 남겼다.

## 14. Deterministic checksum

Canonical checksum은 timestamp를 제외한 정렬 serialization으로 계산한다. 동일 입력 재실행 결과가 동일한지 검사하며 summary에 `checksumReproducible: true`를 기록한다.

Current checksum: `sha256-c1815cbd504a742d51251d49ff5118fa921b4ddd912edf57bb3ef225f9c1acc9`

## 15. Mutation guard

| Target | Mutation |
| --- | ---: |
| Existing Canonical 004A/B/F/G/H | 0 |
| Active Pack / AtomicFact | 0 |
| Graph / Graph Version | 0 |
| Question | 0 |
| Legal / Weather runtime | 0 |
| Supabase | 0 |
