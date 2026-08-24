# LEGAL-SHADOW-PACK Runtime Validation

## 입력과 격리

- Canonical 입력: `CANONICAL_READY` 2,301개
- 제외: Ready with warning 115, Archive-only 211, Conflict 41
- Canonical checksum: `sha256-d4aa961e1585823685fd637d12e0218453293145ce90cb1a9ecf42f2a9b99acb`
- Shadow Fact 상태 `SHADOW_APPROVED`는 기존 AtomicFact 승인과 무관하다.
- 기존 Pack repository 및 Active Graph에는 저장하지 않았다.

## Shadow Pack 변환과 호환성

| 항목 | 결과 |
|---|---:|
| Shadow Fact | 2,301 |
| DIRECTLY_COMPATIBLE | 2,301 |
| COMPATIBLE_WITH_ADAPTER | 0 |
| COMPOSITE_SUPPORTED | 0 |
| TEMPLATE_MISSING (기본 생성 경로) | 0 |
| STRUCTURE_UNSUPPORTED | 0 |
| Question Eligible | 2,301 |

모든 Unit은 최소 `TRUE_FALSE/SELECT_TRUE` 기본 경로와 호환됐다. 이는 모든 고급 법규 유형을 지원한다는 의미가 아니다. 실제 다양성 분석에서 `PENALTY_MATCHING` 전용 Template gap이 확인됐다.

## Classic Compiler 실제 실행

- 시도 Unit: 2,301
- 생성 성공: 2,289
- 실패: 12
- 성공률: 99.4785%
- Question DB 저장: 0

현재 Compiler를 직접 호출했으며, 별도 모의 생성기로 대체하지 않았다.

## Graph-aware 실제 실행

- Shadow graph node: 2,301
- Shadow relation: 2,291
- Graph usable Unit: 2,301
- Graph-aware 생성: 2,289
- Graph-backed distractor 문제: 2,289
- 평균 GraphUsageScore: 0.00909
- unsafe relation: 0
- contradiction: 0

GraphUsageScore가 매우 낮아, relation이 존재하더라도 실제 선택지 품질에 미치는 영향은 제한적이다. 기존 Active Graph Version은 사용하거나 변경하지 않았다.

## 품질 결과

| 지표 | 결과 |
|---|---:|
| 평균 QuestionQualityScore | 0.69 |
| 정답 유일성 실패 | 0 |
| 중복 distractor | 0 |
| unsafe distractor | 0 |
| source trace 실패 | 0 |
| semantic duplicate group | 1 |

안전성 오류는 없었지만 평균 품질은 높지 않다. 주요 원인은 낮은 Graph 활용과 범용 Template 의존이다.

## 문제 다양성

| Question Type | 수 |
|---|---:|
| SELECT_TRUE | 1,137 |
| CASE_JUDGMENT | 1,108 |
| NUMERIC_THRESHOLD | 44 |

- 고유 Knowledge Unit 재사용률: 0
- Stem pattern 반복률: 49.45%
- 정의/조건 문제는 생성 가능하지만 Template 표현의 반복이 크다.
- 생성 결과는 수량 목표로 잘라내지 않고 실제 적합 Template 결과를 기록했다.

## Topic Runtime Readiness

법규 Taxonomy 19개 Topic 모두 `RUNTIME_READY_WITH_GAPS`로 판정했다. 생성 자체는 가능하지만 Canonical Topic과 현재 Compiler Topic 축의 정밀 mapping, 고급 Template 다양성 및 Graph 활용이 부족하다.

## Knowledge-to-Question Yield

- Canonical Unit: 2,301
- Compiler compatible: 2,301
- Question eligible: 2,301
- 실제 생성 성공 Unit: 2,289
- 실제 생성 문제: 2,289
- compatibility rate: 100%
- generation success rate: 99.4785%
- average questions per Unit: 0.9948
- usable knowledge rate: 99.4785%

이 수치는 기본 Template로 최소 한 문제를 만들 수 있는 비율이다. 문제 유형 다양성이나 고품질 출제 비율과 동일하지 않다.

## Template Gap

| 우선순위 | 유형 | 영향 Unit | 영향 Topic |
|---|---|---:|---|
| P1 | PENALTY_MATCHING | 51 | penalty, certification, compliance, reporting, safety |

추가로 실제 분포상 `PROCEDURE_ORDER`, `COMPOSITE_RULE`, 풍부한 `RANGE_COMPARISON/EXCEPTION_SELECTION` Template가 필요하지만 현재 Canonical supported type 신호에는 충분히 표기되지 않아 정량 gap으로 확정하지 않았다.

## 성능

- Shadow Pack build: 약 13ms
- Compatibility 분석: 약 1ms
- Classic compile: 약 57.18초
- Shadow Graph build: 약 3ms
- Graph-aware generation: 약 56.83초
- 측정 peak heap: 약 350MB

주 병목은 2,301 Fact 전체 pool에서 distractor를 반복 탐색하는 Compiler 경로다. OOM이나 timeout은 발생하지 않았다.

## 최종 판정

`SHADOW_RUNTIME_PARTIAL`

근거:

- 구조 변환과 source trace는 안정적이다.
- Classic/Graph-aware 모두 99.48% 생성 성공했다.
- uniqueness/unsafe/source trace 실패는 0이다.
- 그러나 실제 문제 유형은 3종에 집중됐다.
- Stem pattern 반복률이 약 49.45%다.
- 평균 GraphUsageScore가 0.009 수준이다.
- 19개 Topic 모두 runtime gap이 남는다.

## 다음 우선순위

1. P1 `PENALTY_MATCHING` Template 추가 검토
2. 조건·예외·절차·Composite 전용 Template compatibility 신호 보강
3. Fact/Topic별 distractor index로 대규모 Compiler 탐색 비용 감소
4. Shadow Graph relation 정밀도와 graph-backed choice 사용 기준 강화
5. 실패 Unit 12개의 구조 및 적합 Template 원인 검수
6. 100개 review sample 사람 검수

## 기존 데이터 영향

- Active Pack 수정: 없음
- AtomicFact/status 변경: 없음
- Active Graph Version/relation 변경: 없음
- Question DB/Supabase 저장: 없음
- mutation count: 0
