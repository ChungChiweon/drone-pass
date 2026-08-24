# SOURCE-BATCH-001 Ingestion 보고서

실행 기준: 2026-08-05 KST. 공식 현행 법령 6종의 PDF 349페이지와 HTML snapshot을 실제 Source Ingestion Pipeline에 투입했다. 모든 결과는 `work/source-ingestion/source-batch-001/`에만 저장했으며 KnowledgePack, AtomicFact, active Graph, Question DB에는 쓰지 않았다.

## 1. 실행 Source와 파일

| Source | PDF pages | Articles | Addenda | Paragraphs | Items | Appendix/form references | Candidates | Relations | Quality |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 항공안전법 | 114 | 208 | 42 | 531 | 367 | 0 | 912 | 1,461 | 0.8099 |
| 항공안전법 시행령 | 19 | 38 | 0 | 48 | 36 | 5 | 99 | 132 | 0.7873 |
| 항공안전법 시행규칙 | 132 | 353 | 0 | 583 | 641 | 162 | 1,177 | 1,290 | 0.8077 |
| 항공사업법 | 41 | 96 | 0 | 250 | 169 | 0 | 421 | 453 | 0.8083 |
| 항공사업법 시행령 | 14 | 38 | 0 | 34 | 51 | 11 | 94 | 138 | 0.7753 |
| 항공사업법 시행규칙 | 29 | 82 | 0 | 98 | 125 | 46 | 212 | 279 | 0.8064 |

합계는 본문 조문 815개, 부칙 조문 42개, 항 1,544개, 호 1,389개이다. 같은 조문 번호가 부칙에서 다시 등장한 경우 본문 조문과 합치지 않고 `ADDENDUM` 노드로 분리했다.

## 2. HTML/PDF 대조

6개 HTML 파일은 국가법령정보센터의 동적 화면 shell이며 저장된 응답 안에는 조문 본문이 없다. 따라서 모든 source가 `MISSING_IN_HTML`이다. PDF에는 정상 텍스트 레이어가 존재했고 대표 페이지 렌더링을 통해 제목, 조·항·호, 개정표시, 페이지 locator의 가독성을 확인했다.

- HTML sections processed: 0
- PDF pages processed: 349
- HTML/PDF agreement: 0 (본문이 없는 HTML을 일치로 간주하지 않음)
- 처리: PDF fallback + `COMPLETED_WITH_WARNINGS`

## 3. Fact Candidate

총 2,915개를 생성했다. 각 candidate는 하나의 조·항·호 leaf에만 연결되며 다음을 보존한다.

- 법령/버전/source locator와 PDF 페이지
- 원문 evidence와 정규화 statement
- 수치, 단위, `GTE/LTE/GT/LT/WITHIN/BEFORE/AFTER`
- 조건, 예외, 적용 범위, 조문 인용
- AND/OR group 의미

모든 candidate에는 `SOURCE_INGESTION_UNVALIDATED` blocker가 있다. 예외 범위가 조 단위로 불명확한 40건에는 `EXCEPTION_SCOPE_REVIEW_REQUIRED`도 추가했다. 따라서 자동 승인·승격 대상은 0개이다.

## 4. 표·별표

PDF 본문에서 별표·별지서식 참조 224개를 탐지했다. 그러나 확보된 PDF는 이들을 언급만 하고 별표/서식 원본 페이지를 포함하지 않았으며, `pdfplumber` 좌표/선/rectangle 검사에서도 구조화 가능한 실제 표가 발견되지 않았다.

- References detected: 224
- Structured tables extracted: 0
- `LEGAL_TABLE`: 4개 `PARTIAL`, 별표 참조가 없는 법률 2개는 warning 완료
- 별도 `LEGAL_ATTACHMENT`: 6개 모두 `BLOCKED_MISSING_ATTACHMENT` 유지
- 원본 별표·서식 파일을 확보하기 전 `tablesExtracted`를 성공 처리하지 않는다.

## 5. Relation Candidate

조문 인용을 기준으로 3,753개를 생성했다. 같은 source version 안에서 target 조문이 확인되면 `CANDIDATE`, 다른 법·시행령·시행규칙을 가리키거나 target을 확정하지 못하면 `UNRESOLVED_REFERENCE`이다. 관계는 저장·승인하지 않았다.

## 6. 기존 433 Fact Revision 비교

| 결과 | Count |
|---|---:|
| STILL_CURRENT | 9 |
| UPDATED_VALUE | 121 |
| SOURCE_UNVERIFIABLE | 160 |
| NO_MATCH | 143 |

이는 자동 판정이 아니라 검수 queue용 고정밀도 heuristic이다. 0.70 미만 text agreement는 match로 취급하지 않았다. `REPEALED`, `MOVED_ARTICLE`, 조건·예외 변경은 별표 원본과 HTML 조문 구조가 확보된 후 별도 검증이 필요하다.

## 7. Conflict

총 46건이다.

- VALUE_CONFLICT: 45
- OPERATOR_CONFLICT: 1
- 대표 검수 대상: AF-005, AF-018, AF-027, AF-130, AF-131, AF-132, AF-148, AF-149, AF-163, AF-165

현행 공식 법령을 우선 evidence로 표시하되 기존 Fact를 수정·폐기하지 않고 모두 `REVIEW_REQUIRED`로만 기록했다.

## 8. Topic Coverage 전후

Before:

- AVIATION_LAW: 19 topics 중 source 연결 12
- AVIATION_WEATHER: 23 중 0
- FLIGHT_THEORY_OPERATION: 42 중 0

After source ingestion:

- AVIATION_LAW: 19 topics 중 현행 공식 source 연결 18
- candidate가 실제 keyword evidence를 가진 topic: 16
- `legal-tables`: source/reference는 있으나 표 원본 미확보로 `PARTIALLY_EXTRACTED`
- `revision-history`: current/future source는 있으나 개정문 구조 validation 전이므로 `PARTIALLY_EXTRACTED`
- `airport-facilities-act`: 이번 6종 범위 밖이므로 `NO_SOURCE`
- 기상 및 비행이론·운용 coverage는 변하지 않음

최대 상태는 `EXTRACTED`이며 `VALIDATED` 또는 `PRODUCTION_READY`로 올리지 않았다.

## 9. Job 실행 결과

- 실행한 READY job: 18
- COMPLETED_WITH_WARNINGS: 14
- PARTIAL: 4
- FAILED: 0
- attachment blocked: 6 유지

HTML 본문 누락, 별표 원본 부재, unresolved cross-law reference 때문에 warning/partial 상태다. 동일 checksum 재실행 시 산출물 경로를 그대로 갱신하며 job별 실행 결과와 checksum을 `ingestion-execution.json`에 보존한다.

## 10. 품질

평균 extraction quality는 0.7992이다. 페이지 locator와 수치·조건·예외의 구조화 보존은 성공했지만 HTML/PDF agreement가 0이고 표 extraction이 0이므로 검증 완료로 볼 수 없다. source별 quality 범위는 0.7753~0.8099이다.

## 11. 산출물

- `runs/ingestion-summary.json`
- `documents/documents.json`
- `legal-nodes/legal-nodes.json`
- `tables/tables.json`
- `fact-candidates/fact-candidates.json`
- `relation-candidates/relation-candidates.json`
- `conflicts/conflicts.json`
- `reports/revision-comparison.json`
- `ingestion-execution.json`

## 12. 다음 검증 단계

1. 공식 별표·별지서식 원본 6개 묶음 수동 확보
2. 표 좌표/merged-cell 시각 검수
3. unresolved cross-law reference를 source hierarchy로 해결
4. `UPDATED_VALUE` 121건과 conflict 46건 사람 검수
5. 조문별 HTML 원문을 확보한 뒤 PDF와 재대조
6. 검수 전 자동 Fact 승인·Graph 저장·문제 생성 금지

## 13. Mutation 확인

실행 전후 Pack hash는 모두 `dde146d770d31988ef8a1b145b364fd8196508b2d3132eadb4fcf568b42ad9bc`이다. AtomicFact 433, approved 30, active Graph relations 11에는 mutation이 없다.
