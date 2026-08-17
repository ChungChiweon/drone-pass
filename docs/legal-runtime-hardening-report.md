# LEGAL-RUNTIME-HARDENING 결과

## Baseline → Hardened

| 지표 | Baseline | Hardened |
|---|---:|---:|
| 시도 | 2,301 | 2,301 |
| 생성 성공 | 2,289 | 2,265 |
| 실패 | 12 | 36 |
| Stem 반복률 | 49.45% | 10.99% |
| GraphUsageScore | 0.00909 | 0.612(실제 explanation 사용 제외 재해석) |
| Classic compile | 57.18초 | 2.25초 |
| Peak heap | 350MB | 142MB |
| Semantic duplicate group | 1 | 0 |

Index 기반 최대 50개 후보 pool로 compile 시간이 96.06% 감소했다. full scan fallback은 사용하지 않았다. 다만 제한 pool 때문에 기존 실패 12개 외 24개가 추가되어 성공률은 98.44%이며 99% 기준에는 미달한다.

## 실제 생성 Template

- CATEGORY_COMPARISON 1,026
- CONDITION_SELECTION 983
- EXCEPTION_SELECTION 156
- PENALTY_MATCHING 46
- RANGE_COMPARISON 22
- PROCEDURE_ORDER 19
- RULE_COMPARISON 13

총 7종이다. `COMPOSITE_CASE`는 완전한 dependency signal이 없어 생성하지 않았다.

## 안전성

- uniqueness failure 0
- duplicate distractor 0
- unsafe distractor 0
- source trace failure 0
- active data mutation 0

## 실패 분석

36건은 `runtime-failure-analysis.json`에 기록했다. 주 원인은 제한 후보 pool에서 기존 Compiler가 요구하는 안전한 distractor 수를 확보하지 못한 경우다. 정확성을 완화하지 않았으며, 추후 재개 시 실패 건에 한정한 bounded secondary index가 필요하다.

## Graph 실활용

2,265개 생성 문제에 관계 ID를 연결했다. Graph 기반 Template 선택, 관계 후보 우선 distractor, comparison 여부를 개별 기록했다. 실제 해설에 relation 차이를 삽입하지 않았으므로 해당 항목은 사용 점수에서 제외해야 하며 보수적 재해석 점수는 약 0.612다.

## 최종 판정

`LEGAL_RUNTIME_READY_WITH_GAPS`

안전성, 7종 다양성, Stem 반복률, 성능은 통과했다. 생성 성공률이 98.44%로 99% 기준에 미달하므로 `READY`로 과대 판정하지 않는다.

## 남은 Gap과 Freeze

- 실패 36건에 한정된 secondary index
- Composite dependency가 확정된 경우에만 COMPOSITE_CASE 활성화
- Graph 비교 근거를 해설에 실제 포함하는 builder

법규 런타임 기능 개발은 동결한다. 재개 조건은 법령 개정, 치명적 안전 오류, 새로운 시험유형 요구다. 다음 데이터 단계는 SOURCE-BATCH-003 항공기상이다.

기존 Pack, Fact, Active Graph, Question DB, Supabase 변경은 0이다.
