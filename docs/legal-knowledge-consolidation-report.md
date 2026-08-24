# LEGAL-KNOWLEDGE-CONSOLIDATION 결과

## 1. 범위

- 입력 Legal Knowledge Candidate: 2,727개
- 입력 상태: `VALIDATED` 2,604 / `VALIDATED_WITH_WARNING` 123
- 실행 기준일: 2026-08-09
- 결과는 별도 `LegalCanonicalKnowledgeSet`이며 기존 KnowledgePack에 연결하지 않았다.

## 2. Rule Cluster 및 Canonical Unit

| 지표 | 결과 |
|---|---:|
| Rule Cluster | 2,627 |
| Canonical Knowledge Unit | 2,627 |
| Consolidation ratio | 96.333% |
| DISTINCT_RULE cluster | 2,569 |
| EXACT_RULE cluster | 43 |
| SAME_RULE_DIFFERENT_SOURCE cluster | 15 |
| 동일 Source 통합 감소 | 64 |
| 교차 Source 통합 감소 | 36 |
| Composite Unit | 17 |

법적 signature는 subject, predicate, fact type, value, unit, operator, applicability, condition, exception을 모두 포함한다. `GT/GTE`, `LT/LTE` 또는 같은 숫자의 다른 적용 조건은 별도 Rule로 유지했다.

안전하게 확인되는 parent/child 별표 결합은 0건이었다. 단순 조문명 또는 법령 계층만으로 이를 강제하지 않았으며, 본문과 별표의 명시적 lineage가 없는 경우 별도 Unit을 유지했다.

## 3. Canonical 상태

| 상태 | 수 |
|---|---:|
| CANONICAL_READY | 2,301 |
| CANONICAL_READY_WITH_WARNING | 115 |
| CONSOLIDATION_REVIEW_REQUIRED | 0 |
| BLOCKED_INCOMPLETE | 0 |
| ARCHIVE_ONLY | 211 |
| 별도 BLOCKED_CONFLICT | 41 |

Canonical Core에는 Ready/Ready with warning만 포함할 수 있다. `ARCHIVE_ONLY`는 서식, 제출문서, 내부 절차 등 시험 관련성이 낮은 행정 세부 규칙이며 삭제하지 않고 lineage를 보존했다.

## 4. Warning 123건 처리

- Canonical Ready with warning에 남은 Unit: 115
- Archive-only로 분리된 warning 계열: 8
- threshold는 낮추지 않았다.
- 숫자·operator·조건을 바꾸는 warning은 Ready로 숨기지 않도록 quality/blocker 경계를 유지했다.

## 5. Conflict 41건

41건 모두 `UNRESOLVED` / `BLOCKED_CONFLICT`로 별도 산출했다. 현행 공식 source 간 operator, value, scope 차이를 자동 승자 결정하지 않았다. 각 항목에는 원 conflict evidence와 사람 검수 권고를 유지한다.

## 6. 조건·예외 및 Provenance

- 조건과 예외는 정규화 후 중복 제거하되 각 값에 source Candidate와 locator lineage를 남겼다.
- 예외가 있는 Unit은 `CONTEXT_REQUIRED`이며 예외 없는 standalone 지식으로 축약하지 않았다.
- primary source는 현행성, 정확한 locator, 공식 source 순으로 결정한다.
- supporting source, locator, Candidate, legal node, attachment lineage를 별도 provenance 파일에 기록했다.

## 7. Composite Unit

17개 Composite Unit을 생성했다. 같은 법적 축 안에서 value/operator/condition이 다른 Unit을 `RANGE_TABLE`, `PENALTY_MATRIX`, `COMPARISON_SET`으로 묶되 원 Unit을 병합하거나 삭제하지 않았다. Composite member는 `COMPOSITE_ONLY` dependency로 추적된다.

## 8. Topic Coverage와 Gap

19개 Topic 결과:

- `VALIDATED`: 3
- `VALIDATED_WITH_GAPS`: 16
- Gap 분석 대상: 16

Gap reason은 Topic별로 다음 범주를 사용한다.

- `MISSING_SUBTOPIC`
- `TABLE_BLOCKED`
- `CONFLICT_BLOCKED`
- `LOW_SOURCE_DIVERSITY`
- `MISSING_EXCEPTION`

Candidate 수만으로 Topic을 완성 처리하지 않았다. 기존에 검증 완료된 3개 Topic은 유지하고, 나머지 16개는 source/subtopic/table/conflict/exception 근거를 별도 분석했다.

## 9. 기존 433 Fact Migration Preview

| 분류 | 수 |
|---|---:|
| LEGACY_STILL_VALID | 9 |
| LEGACY_REPLACED_BY_CANONICAL | 121 |
| LEGACY_UNVERIFIABLE | 303 |
| LEGACY_OUTDATED | 0 |
| LEGACY_NO_MATCH | 0 |

이는 읽기 전용 preview다. 기존 AtomicFact를 수정, 폐기 또는 교체하지 않았다.

## 10. Canonical Knowledge Set

- Checksum: `sha256-d4aa961e1585823685fd637d12e0218453293145ce90cb1a9ecf42f2a9b99acb`
- Source snapshot: `legal-source-registry-20260808`
- 결과 위치: `work/legal-knowledge-consolidation/legal-canonical-knowledge-set.json`

## 11. 주요 산출물

- `normalized-candidates.json`
- `rule-signatures.json`
- `rule-clusters.json`
- `canonical-knowledge-units.json`
- `canonical-ready.json`
- `canonical-ready-with-warning.json`
- `consolidation-review-required.json`
- `blocked-conflicts.json`
- `archive-only.json`
- `composite-knowledge-units.json`
- `source-provenance.json`
- `topic-coverage.json`
- `topic-gap-analysis.json`
- `legacy-migration-preview.json`
- `legal-canonical-knowledge-set.json`
- `consolidation-summary.json`

## 12. 다음 단계 권고

1. Conflict 41건을 current official locator와 법적 scope 기준으로 사람 검수한다.
2. Gap 16 Topic의 missing subtopic과 미해결 표를 우선 보강한다.
3. Canonical Ready with warning 115개를 표본 검수한다.
4. Composite 17개가 문제 유형별로 member 일부를 잘못 분리하지 않는지 검수한다.
5. 별도 승인 Workflow 전에는 Canonical Set을 KnowledgePack 또는 Question Generator에 연결하지 않는다.

## 13. Mutation Guard

실행 전후 상태가 동일하다.

- Pack checksum: `sha256-33e96742305ef64a583991d60047d8db2ecef8fcbfca740ac8d6ba2a15e669ad`
- AtomicFact: 433
- approved Fact: 26
- Active Graph Version: `kg-candidate-kr-drone-license:mrm0omvd-20260730000000000`
- Active relation: 11
- mutation count: 0
