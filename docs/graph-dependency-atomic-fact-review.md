# Graph Dependency AtomicFact Review

검수 기준일: 2026-07-31
Pack ID: kr-drone-license:mrm0omvd
Graph candidate: kg-candidate-kr-drone-license:mrm0omvd-20260730000000000

## 공식 근거

- 국가법령정보센터 항공사업법 시행령 [시행 2026. 6. 3.] 별표 8, 별표 9, 별표 10
- 항공사업법 제48조제2항제1호의 25kg 이하 무인비행장치 사용사업 자본요건 제외 단서
- 한국교통안전공단 초경량비행장치사용사업 신규 등록요건 안내

## 9개 Fact 검수 결과

| Fact | 판정 | 공식 locator | 검증 memo |
| --- | --- | --- | --- |
| AF-223 | PASS | 시행령 별표 9 | 법인 납입자본금 3천만원; 최대이륙중량 25kg 이하 무인비행장치만 사용 시 법 제48조제2항제1호 단서 적용 |
| AF-224 | PASS | 시행령 별표 9 | 개인 자산평가액 3천만원; 최대이륙중량 25kg 이하 무인비행장치만 사용 시 법 제48조제2항제1호 단서 적용 |
| AF-277 | PASS | 시행령 별표 8 | 항공기를 포함해 대여하는 법인 납입자본금 2억5천만원; 경량항공기·초경량비행장치만 대여 시 3천만원 |
| AF-278 | PASS | 시행령 별표 8 | 항공기를 포함해 대여하는 개인 자산평가액 3억7,500만원; 경량항공기·초경량비행장치만 대여 시 3천만원 |
| AF-297 | PASS | 시행령 별표 10 제1호 | 법 제2조제26호가목 법인 3억원; 경량항공기·초경량비행장치만 사용 시 3천만원 |
| AF-298 | PASS | 시행령 별표 10 제1호 | 법 제2조제26호가목 개인 4억5천만원; 경량항공기·초경량비행장치만 사용 시 3천만원 |
| AF-311 | PASS | 시행령 별표 10 제2호 | 법 제2조제26호나목 법인 2억5천만원; 경량항공기·초경량비행장치만 대여 시 3천만원 |
| AF-312 | PASS | 시행령 별표 10 제2호 | 법 제2조제26호나목 개인 3억7,500만원; 경량항공기·초경량비행장치만 대여 시 3천만원 |
| AF-319 | PASS | 시행령 별표 10 제3호 | 법 제2조제26호다목 개인 자산평가액 3천만원 |

모든 Fact의 subject/predicate/operator/value/unit과 법인·개인, 사업 가·나·다목 구분이 현행 공식 원문과 일치했다. 예외는 각 Fact의 conditions/exceptions 구조에 포함되어 있다.

## 승인 결과

- 승인 전 approved: 17
- 신규 단건 승인: 9
- 승인 후 approved: 26
- 승인 ID: AF-223, AF-224, AF-277, AF-278, AF-297, AF-298, AF-311, AF-312, AF-319
- HOLD / REJECT / UPDATE_REQUIRED: 없음

## Classic vs Graph-aware 재벤치마크

| Metric | Classic | Graph-aware |
| --- | --- | --- |
| 생성 성공 수 | 26 | 26 |
| 평균 QuestionQualityScore | 0.67 | 0.74 |
| 평균 GraphUsageScore | - | 0.32 |
| graph-backed distractor | - | 27 |
| 오답 중복 | - | 0 |
| 정답 유일성 실패 | - | 0 |
| unsafe distractor | - | 0 |

## Target Fact별 Graph 활용

| Target Fact | Graph distractor | sourceFactIds 포함률(%) | GraphUsageScore |
| --- | --- | --- | --- |
| AF-223 | 3 | 100 | 0.80 |
| AF-224 | 3 | 100 | 1.00 |
| AF-277 | 3 | 100 | 0.90 |
| AF-278 | 3 | 100 | 1.00 |
| AF-297 | 3 | 100 | 0.90 |
| AF-298 | 3 | 100 | 1.00 |
| AF-311 | 3 | 100 | 0.80 |
| AF-312 | 3 | 100 | 1.00 |
| AF-319 | 3 | 100 | 1.00 |

## Relation별 활용

| Relation | 상태 | 문제 수 | Target Fact |
| --- | --- | --- | --- |
| KG-CONFUSED_WITH-AF-223-AF-277 | USED | 3 | AF-223, AF-277, AF-297 |
| KG-CONFUSED_WITH-AF-224-AF-278 | USED | 5 | AF-224, AF-278, AF-298, AF-312, AF-319 |
| KG-CONFUSED_WITH-AF-224-AF-298 | USED | 5 | AF-224, AF-278, AF-298, AF-312, AF-319 |
| KG-CONFUSED_WITH-AF-224-AF-312 | USED | 5 | AF-224, AF-278, AF-298, AF-312, AF-319 |
| KG-CONFUSED_WITH-AF-277-AF-297 | USED | 4 | AF-223, AF-277, AF-297, AF-311 |
| KG-CONFUSED_WITH-AF-278-AF-298 | USED | 5 | AF-224, AF-278, AF-298, AF-312, AF-319 |
| KG-CONFUSED_WITH-AF-278-AF-319 | USED | 5 | AF-224, AF-278, AF-298, AF-312, AF-319 |
| KG-CONFUSED_WITH-AF-297-AF-311 | USED | 3 | AF-277, AF-297, AF-311 |
| KG-CONFUSED_WITH-AF-298-AF-312 | USED | 5 | AF-224, AF-278, AF-298, AF-312, AF-319 |
| KG-CONFUSED_WITH-AF-298-AF-319 | USED | 4 | AF-224, AF-278, AF-312, AF-319 |
| KG-CONFUSED_WITH-AF-312-AF-319 | USED | 5 | AF-224, AF-278, AF-298, AF-312, AF-319 |

## 활성화 준비 판정

**READY_FOR_ACTIVATION**

- graph-backed distractor >= 1: true
- GraphUsageScore > 0: true
- 정답 유일성 실패 0: true
- 오답 중복 0: true
- unsafe distractor 0: true
- Classic 대비 평균 품질 하락 없음: true
- candidate relation 실제 활용: true

## 불변 확인

- AtomicFact 총수 433
- candidate relation 11개 상태 변경 없음
- candidate Graph Version은 draft 유지
- active Graph Version 생성·활성화 안 함
- production alias 및 Question DB 변경 없음

## 남은 위험

- 교육자료 locator는 발행연도 미상 자료의 페이지 번호이므로, 향후 Pack 본문을 개정할 때 공식 시행령 별표 locator로 교체 검토가 필요하다.
- 이 문서의 A/B는 비활성 candidate를 benchmark context에만 주입한 결과다.