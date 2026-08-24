# SOURCE-BATCH-001 공식 법령 원문 확보 보고서

기준 시각은 2026-08-05 KST이다. 이 작업은 공식 원문 확보와 Source Registry 등록만 수행했으며 AtomicFact, KnowledgePack, Graph, Question 데이터는 변경하지 않았다.

## 1. 확인한 공식 법령

| Source | 현재 시행본 | 공포 정보 | PDF | 페이지 | 검증 |
|---|---:|---|---|---:|---|
| 항공안전법 | 2026-07-01 | 법률 제21268호, 2025-12-30 | `aviation-safety-act/original/current-full-text.pdf` | 114 | READY |
| 항공안전법 시행령 | 2026-07-09 | 대통령령 제36476호, 2026-06-30 | `aviation-safety-act-enforcement-decree/original/current-full-text.pdf` | 19 | READY |
| 항공안전법 시행규칙 | 2026-07-01 | 국토교통부령 제1601호, 2026-07-01 | `aviation-safety-act-enforcement-rule/original/current-full-text.pdf` | 132 | READY |
| 항공사업법 | 2026-06-03 | 법률 제21189호, 2025-12-02 | `aviation-business-act/original/current-full-text.pdf` | 41 | READY |
| 항공사업법 시행령 | 2026-06-03 | 대통령령 제36354호, 2026-05-26 | `aviation-business-act-enforcement-decree/original/current-full-text.pdf` | 14 | READY |
| 항공사업법 시행규칙 | 2025-12-30 | 국토교통부령 제1548호, 2025-12-30 | `aviation-business-act-enforcement-rule/original/current-full-text.pdf` | 29 | READY |

모든 항목은 [국가법령정보센터](https://www.law.go.kr/)의 법령 페이지 및 PDF 출력 endpoint에서 직접 확보했다. 각 source에 공식 wrapper HTML, 전체 조문 HTML, PDF의 3개 파일을 저장했다. 총 18회 요청은 모두 HTTP 200과 비어 있지 않은 응답을 받았고 PDF 6개는 `%PDF` signature, SHA-256 checksum, 페이지 수를 검증했다.

## 2. 현재/미래 시행본 분리

- 현재 시행본: 6개이며 `CURRENT_EFFECTIVE`, `READY_FOR_EXTRACTION`이다.
- 미래 시행본: 항공안전법 `lsiSeq=286951`, 시행 예정일 2026-12-17을 별도 후보로 기록했다.
- 미래 시행본은 비교·추출 대상으로만 사용할 수 있고 현재 문제 근거로 사용할 수 없다.
- Registry는 `currentEffectiveVersionId`, `futureEffectiveVersionIds`, `historicalVersionIds`를 분리할 수 있는 구조다.

## 3. 저장 및 검증 산출물

- 원문 루트: `data/sources/drone-license/official-law/`
- Source별 metadata: 각 source의 `metadata/source-metadata.json`
- Registry: `data/sources/drone-license/official-law/manifests/metadata/official-source-registry.json`
- 실행 로그: `work/source-inventory/source-batch-001-execution.json`
- 법령 위임 계층: `work/source-inventory/legal-source-hierarchy.json`
- 갱신된 acquisition manifest: `work/source-inventory/drone-source-acquisition-manifest.json`
- 갱신된 ingestion queue: `work/source-inventory/drone-source-ingestion-queue.json`

## 4. 별표·서식 및 수동 확보 항목

공식 PDF 생성 시 별표 포함 옵션을 사용했으나, 법령정보센터의 정적 HTML 응답은 별표·별지·서식을 독립 파일 URL로 완전하게 제공하지 않았다. 따라서 별도 attachment를 확보했다고 과장하지 않는다.

- 검증된 독립 attachment: 0
- `LEGAL_ATTACHMENT` blocked job: 6
- 상태: `BLOCKED_MISSING_ATTACHMENT`
- 후속 조치: 각 공식 페이지의 별표/서식 UI에서 파일별 링크를 수동 확인하고, 공식 URL·파일명·checksum·pageCount를 기록해야 한다.
- 별도 확인 대상 행정규칙: 초경량비행장치 조종자 증명 관련 전문행정규칙, 무인비행장치 조종자 증명 운영지침, 신고·안전성인증 관련 행정규칙. 현재 상태는 `MANUAL_ACQUISITION_REQUIRED`이다.

## 5. 법령 계층

확인 가능한 일반 위임 계층만 `IMPLEMENTED_BY`로 기록했다.

- 항공안전법 → 항공안전법 시행령 → 항공안전법 시행규칙
- 항공사업법 → 항공사업법 시행령 → 항공사업법 시행규칙

특정 조문 번호는 원문에서 명시적으로 대조하지 않은 상태이므로 `referencedArticle=null`이다. 추정 조문 연결은 생성하지 않았다.

## 6. Taxonomy 예상 Coverage

공식 법령 6개는 항공법규 taxonomy의 법령 체계, 장치 정의·분류, 조종자 증명, 기체 신고, 안전성인증, 비행 승인, 운항 규칙, 행정처분·벌칙, 사업 등록·사용사업 및 법정 표/서식 영역의 근거 source가 될 것으로 예상된다. 이는 source metadata 기반 예상 mapping이며 Fact를 추출하거나 검증한 결과가 아니므로 상태는 `SOURCE_ONLY`이다.

기상 및 비행이론·운용 영역은 이 배치로 충족되지 않는다. 해당 영역에는 공식 교육자료를 별도 확보해야 한다.

## 7. Ingestion Queue

- 공식 source 본문 `LEGAL_TEXT`: READY 6
- 법정 표 분석 `LEGAL_TABLE`: READY 6
- 현행/미래 비교 `LEGAL_VERSION_COMPARISON`: READY 6
- 독립 attachment `LEGAL_ATTACHMENT`: BLOCKED_MISSING_ATTACHMENT 6
- 합계: READY 18, attachment blocked 6

Source 확보만으로 `EXTRACTED` 또는 `VALIDATED` 상태로 올리지 않았다.

## 8. 기존 자료 상태

- 2021 한국교통안전공단 교육자료: `POSSIBLY_OUTDATED`, `REPROCESS_REQUIRED` 유지. 현행 법령 대체 근거로 사용하지 않는다.
- 발행기관·연도·원본 파일이 없는 항공사업법 교육자료: `UNDATED`, `BLOCKED_SOURCE_VERIFICATION` 유지.

## 9. SOURCE-BATCH-002 진입 조건

1. 6개 법령의 독립 별표·서식 파일 수동 확보 및 checksum 검증
2. 관련 행정규칙의 현행본 공식 페이지와 버전 확인
3. `LEGAL_TEXT`, `LEGAL_TABLE`, `LEGAL_VERSION_COMPARISON` job 실행
4. 기존 2021 교육자료와 현행 법령의 조항별 diff
5. 추출 결과 검수 전까지 Fact 승인·문제 생성 금지

## 10. Mutation 확인

Pack, AtomicFact 433개, approved 상태 30개, active Graph relation 11개, Question DB 및 Supabase에는 쓰기 작업을 수행하지 않았다.
