# FLIGHT-THEORY-004C Validation Report

## 1. Validation boundary

SOURCE-BATCH-004C의 detached 입력만 검증했다. Canonical ID 발급, Canonical Set 생성, Active Pack 반영, AtomicFact·Graph·Question·Supabase 변경은 수행하지 않았다. 기존 004A/B/F/G/H는 frozen 상태이며 004D/E는 `PARTIAL_UNCHANGED`이다.

## 2. Input layer separation

| Layer | Count | Treatment |
| --- | ---: | --- |
| PRIMARY_KNOWLEDGE | 29 | 기술·근거·문맥 Validation 수행 |
| SUPPORTING_VISUAL | 102 | provenance/linkage만 확인, Knowledge 점수와 분리 |
| BLOCKED_TABLE | 2 | 제한 검토 후 page review 차단 유지 |
| Raw total | 133 | 레이어별 별도 집계 |

PRIMARY_KNOWLEDGE는 Concept 8, Propulsion 1, Battery 9, Safety 2, Formula 2, Relationship 7이다.

## 3. Electrical concepts

8건 모두 `VALIDATED_WITH_WARNING`이다. name, definition, variables, units, source, page/section locator, raw evidence와 technical context가 존재한다. 전압·전류·저항·전력·직렬·병렬·Ohm 관계는 `ELECTRICAL_GENERAL` 또는 원래 지정된 일반 항공 context로 유지했다. 일반 전기 근거를 UAS 전용 규칙으로 바꾸지 않도록 question constraint를 부여했다.

## 4. Propulsion component

`propulsion-component:motor` 1건은 `VALIDATED_WITH_WARNING`이다. FAA 근거는 항공기 engine starter motor의 전기·기능 역할을 직접 지지하지만 UAS/BLDC motor 근거는 아니다. Context는 `AVIATION_GENERAL`이며 `UAS_SPECIFIC_OPERATION` 문제 생성을 금지한다.

004B와의 경계는 `SAME_ENTITY_DIFFERENT_ROLE`이다. 004B 구조 Component를 수정하거나 중복 Canonical로 만들지 않았다.

## 5. Battery knowledge

9건 모두 `VALIDATED_WITH_WARNING`이다. 모든 항목은 `GENERAL_LITHIUM_ION` 및 `BATTERY_GENERAL` 범위를 보존한다. Battery, cell, capacity, C-rate, charging, discharging, overcharge, overdischarge, cell balancing을 검증했다.

C-rate는 NASA page 88의 raw definition, rate 의미, 예제와 locator가 존재하여 검증됐다. 이는 일반 Li-ion C-rate 근거이며 LiPo 또는 드론 배터리 운용 규칙으로 확장하지 않는다.

## 6. Battery safety

2건 모두 `VALIDATED_WITH_WARNING`이다. 004C는 charge/protection/thermal-runaway의 기술 안전 context이고, 004G는 emergency/fire response context이다. Battery fire overlap은 `TECHNICAL_VS_EMERGENCY_ROLE`로 분류했으며 004G Canonical을 수정하지 않았다.

## 7. Formula validation

| Formula | Locator | Result |
| --- | --- | --- |
| `E = I × R` | FAA p.418 | `FORMULA_VALIDATED` |
| `P = I² × R` | FAA p.436 | `FORMULA_VALIDATED` |

두 식 모두 PDF 원문 text layer에서 직접 확인했다. p.436의 superscript `²`가 추출 text에서 `2`로 보존되는 표기 차이만 정규화했다. KV, battery cell voltage, C-rate 확장식, propeller 공식은 생성하거나 검증하지 않았다.

## 8. Relationship validation

7건 모두 `VALIDATED`이다. Endpoint 존재, relation type, 방향, evidence, source/page locator를 검사했다. 허용된 관계는 `DEPENDS_ON`, `INCREASES`, `PART_OF`, `AFFECTS`, `CAUSES` 범위이며 단순 동시 언급 관계는 포함하지 않았다.

## 9. Visual support

102건 모두 `SUPPORTIVE_UNRESOLVED`이다. Asset ID, source page, topic/knowledge linkage와 interpretation flag만 검사했다. 전부 supporting visual이므로 Knowledge Validation을 차단하지 않는다. 이미지 내용을 자동 해석하지 않았으며 구조 이해가 필요한 항목은 향후 visual review 대상으로 남겼다.

## 10. Table validation

2건 모두 `PAGE_REVIEW_REQUIRED`이다.

- `technical-table:faa-battery-troubleshooting`
- `technical-table:nasa-liion-glossary`

Source와 page는 확인되지만 headers/boundary가 아직 구조적으로 확정되지 않았고 interpretation이 필요하다. 표 엔진을 확대하거나 수치 Fact를 생성하지 않았다.

## 11. Knowledge status

| Status | Count |
| --- | ---: |
| `VALIDATED` | 9 |
| `VALIDATED_WITH_WARNING` | 20 |
| `BLOCKED` | 0 |

Validated 9건은 Formula 2와 Relationship 7이다. Context 제한이 필요한 Concept·Propulsion·Battery·Safety 20건은 warning을 유지한다.

## 12. Technical context

| Context | Count |
| --- | ---: |
| `ELECTRICAL_GENERAL` | 12 |
| `AVIATION_GENERAL` | 2 |
| `BATTERY_GENERAL` | 15 |

General context도 안정적인 Canonical 후보가 될 수 있지만 UAS-specific 표현으로 문제를 만들 수 없도록 허용·금지 question type을 후보 Inventory에 기록했다.

## 13. Li-ion / LiPo boundary

`GENERAL_LITHIUM_ION → LIPO_SPECIFIC` 자동 변환은 validator에서 `BLOCKED_CONTEXT_GENERALIZATION`으로 차단한다. 현재 입력에서는 위반 0건이며 `flight:lipo`는 `NO_KNOWLEDGE`로 유지된다.

## 14. 004B / 004G overlap

| 004C Knowledge | Existing batch | Classification |
| --- | --- | --- |
| `propulsion-component:motor` | 004B | `SAME_ENTITY_DIFFERENT_ROLE` |
| `battery-safety:battery-fire` | 004G | `TECHNICAL_VS_EMERGENCY_ROLE` |

Exact duplicate는 발견되지 않았다. 기존 Canonical 변경은 0이다.

## 15. Canonical candidate inventory

29건이 후보 Inventory에 포함됐다.

- `READY`: 9
- `READY_WITH_WARNING`: 20
- `BLOCKED`: 0
- `ARCHIVE_ONLY`: 0

모든 항목의 `canonicalId`는 `null`이다. 후보 Inventory는 다음 Canonical build 단계의 입력일 뿐 실제 Canonical Set이 아니다.

## 16. Gap and topic coverage

27개 Topic 결과:

- `VALIDATED_WITH_GAPS`: 20
- `NO_KNOWLEDGE`: 7

보존된 Gap은 BLDC, KV, ESC, propeller pitch, propeller diameter, LiPo, battery storage다. C-rate는 복구·검증됐다. 각 topic에는 source count, ingested/validated knowledge, candidate count, visual/table support와 gap 사유를 기록했다.

## 17. Runtime readiness preview

판정은 `READY_FOR_CANONICAL_BUILD_WITH_GAPS`이다. 이는 Canonical 생성 승인이 아니라, 29개 후보를 별도 Canonical build 검토로 넘길 수 있다는 읽기 전용 preview다. Gap 7개와 table 2개는 계속 분리되어 있다.

## 18. TS recovery

TS 공식 기술 교재 상태는 `WAITING_FOR_MANUAL_FILE`이다. 현재 Validation blocker로 사용하지 않았다. 향후 파일이 확보되면 검증된 새 source version으로 별도 ingestion해야 한다.

## 19. Artifacts

`work/flight-theory-validation/004c/results/`에 다음을 생성했다.

- validation-results, validated, validated-with-warning, blocked
- electrical, propulsion, battery, safety, formula, relationship validation
- visual-validation, table-validation
- duplicate-boundary-analysis
- canonical-candidate-inventory
- topic-validation-coverage
- runtime-readiness-preview
- validation-summary

## 20. Mutation guard

| Target | Mutation |
| --- | ---: |
| Canonical | 0 |
| Active Pack | 0 |
| AtomicFact | 0 |
| Graph / Graph Version | 0 |
| Question | 0 |
| Legal runtime | 0 |
| Weather runtime | 0 |
| Supabase | 0 |

기존 Canonical 누계는 151이며 004C Canonical 생성 및 Canonical ID 발급은 모두 `false`다.
