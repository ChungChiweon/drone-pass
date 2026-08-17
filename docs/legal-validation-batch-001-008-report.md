# LEGAL-VALIDATION-BATCH-001~008 결과

## 범위와 안전 경계

- 입력 Candidate: 3,001개
- 자동 검증 실행: 2,926개
- 사전 격리 유지: 75개 (`BLOCKED_CONFLICT` 41, `BLOCKED_SOURCE`/미해결 표 34)
- 검증 기준일: 2026-08-08
- Table Layer: `TABLE_LAYER_PARTIAL`
- 이 결과는 `LegalKnowledgeCandidateSet`이며 KnowledgePack 또는 승인 Fact가 아니다.
- AtomicFact, 승인 상태, Active Graph, Question DB는 변경하지 않았다.

## 최종 분류

| 분류 | 수 |
|---|---:|
| VALIDATED | 2,604 |
| VALIDATED_WITH_WARNING | 123 |
| REVIEW_REQUIRED | 0 |
| NOT_EXAM_RELEVANT | 143 |
| BLOCKED_DUPLICATE | 51 |
| BLOCKED_NUMERIC | 5 |
| 사전 BLOCKED_CONFLICT | 41 |
| 사전 BLOCKED_SOURCE (table unresolved) | 34 |
| Legal Knowledge Candidate Set | 2,727 |

점수 임계값은 `VALIDATED >= 0.95`, `VALIDATED_WITH_WARNING >= 0.90`으로 고정했다. 점수가 높아도 blocker가 있으면 포함하지 않았다.

## Batch별 결과

| Batch | 실행 | VALIDATED | WARNING | NOT_EXAM | DUPLICATE | NUMERIC |
|---|---:|---:|---:|---:|---:|---:|
| 001 정의·분류 | 198 | 173 | 15 | 9 | 0 | 1 |
| 002 조종자 증명·자격 | 765 | 709 | 43 | 3 | 9 | 1 |
| 003 신고·안전성 인증 | 197 | 192 | 2 | 1 | 2 | 0 |
| 004 비행승인·특별비행 | 62 | 54 | 2 | 6 | 0 | 0 |
| 005 준수사항·금지·예외 | 115 | 95 | 3 | 11 | 6 | 0 |
| 006 행정처분·벌칙·과태료 | 54 | 47 | 5 | 0 | 2 | 0 |
| 007 항공사업법 관련 | 117 | 97 | 7 | 10 | 1 | 2 |
| 008 기타 HIGH/MEDIUM | 1,418 | 1,237 | 46 | 103 | 31 | 1 |

모든 Batch는 결과 파일과 checkpoint를 독립 저장했다. 재실행 결과는 Candidate 정렬 및 고정 생성시각을 사용해 deterministic하게 유지된다.

## Blocker와 실패 유형

- 비정규 중복: 51
- 연산자 충돌: 3
- 숫자 값 불일치: 2
- 기존 미해결 충돌: 41
- 미해결 표: 34

미래 시행본만 존재하거나 현행 공식 출처·정확한 locator·원문 증거가 없는 항목은 `VALIDATED`로 승격할 수 없게 했다. 법적 의무/금지/허용 방향, 숫자·단위·operator, 조건 범위와 예외 범위는 blocker 우선 규칙으로 평가한다.

## Duplicate와 Conflict

- Canonical duplicate group: 34개
- 비정규 중복 제외 Candidate: 51개
- 미해결 conflict 결과: 41개

Canonical 선택 순서는 현행성, locator 구체성, 구조 완전성, extraction confidence, Candidate ID 순이다. 공식 출처 간 실질 충돌은 우선순위만으로 자동 해결하지 않고 검수 대상으로 남긴다.

## 기존 433 Fact revision 분석

| 상태 | 수 |
|---|---:|
| CANDIDATE_NEWER | 121 |
| STILL_CURRENT | 9 |
| COMPARISON_UNAVAILABLE | 303 |

이 분석은 `KEEP`, `REPLACE_LATER`, `REVIEW` 권고만 만들며 기존 Fact를 수정하거나 폐기하지 않는다.

## Topic Coverage

- 총 19개 법규 Topic
- `VALIDATED`: 3개
- `VALIDATED_WITH_GAPS`: 16개
- `PRODUCTION_READY`: 0개

후보 수가 많다는 이유만으로 Topic을 완전하다고 판정하지 않았다. 현행 공식 source coverage, 핵심 하위개념, unresolved conflict, source diversity를 함께 반영했다. 특히 법 체계, 기체 정의·분류, 조종자 증명, 신고, 비행승인, 금지구역, 사고 보고, 벌칙, 별표·수치 기준 및 개정 이력은 검증 지식이 존재하지만 추가 검수 gap이 남는다.

## Table Layer 영향

Table Layer가 `PARTIAL`이므로 미해결 표 5개에 연결된 Candidate 34개를 입력 단계에서 격리했다. 표의 행/열·각주 범위가 확정되지 않은 상태에서 숫자 Candidate를 강제 검증하지 않았다.

## 사람 검수 표본

`work/legal-validation/validation-sample-manifest.json`에 71개 표본을 생성했다. 각 Batch에서 상위 VALIDATED, 경계 VALIDATED, warning, conflict, duplicate, numeric, exception 유형을 가능한 범위에서 추출했다. 이는 검수용 manifest이며 UI 대시보드는 만들지 않았다.

## 산출물

- Batch 결과: `work/legal-validation/results/batch-001` ~ `batch-008`
- 통합 결과: `work/legal-validation/results/combined`
- Legal Knowledge Candidate Set: `work/legal-validation/results/combined/legal-knowledge-candidate-set.json`
- Topic coverage: `work/legal-validation/results/combined/topic-coverage.json`
- 검수 표본: `work/legal-validation/validation-sample-manifest.json`

## 다음 단계 권고

1. 41개 source conflict를 공식 현행 locator 기준으로 사람 검수한다.
2. 5개 unresolved table을 좌표·행/열·각주 단위로 확정한다.
3. 숫자 blocker 5개를 원문 값과 operator 기준으로 재검수한다.
4. 123개 warning Candidate를 표본 우선으로 검수한다.
5. Topic gap을 해소한 뒤에만 별도의 Human Review를 거쳐 AtomicFact 승격 후보를 만든다.

## Mutation Guard

실행 전후 상태가 동일하다.

- Pack checksum: `sha256-33e96742305ef64a583991d60047d8db2ecef8fcbfca740ac8d6ba2a15e669ad`
- Pack ID: `kr-drone-license:mrm0omvd`
- AtomicFact: 433
- approved Fact: 26
- Active Graph Version: `kg-candidate-kr-drone-license:mrm0omvd-20260730000000000`
- Active relations: 11
- mutation count: 0
