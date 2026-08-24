# PDF Extraction Quality Report

## 기존 문제

- Legal Reconstruction은 조건/예외 문맥을 크게 개선했지만 PDF extraction 단계에는 한글 깨짐, 표 손실, 별표 구조 손실, 숫자/단위 분리 문제가 남아 있었다.
- 이번 레이어는 PDF 원문을 저장하거나 Pack에 반영하지 않고, Text/Structure 품질 측정과 정규화 결과만 만든다.

## 개선 방법

- Text Normalizer: UTF-8 unicode normalization, 제어문자 제거, 줄바꿈 정리, 숫자 주변 공백 정리.
- Encoding Detector: replacement character, 비정상 unicode, mojibake-like pattern, affected page를 측정.
- Table Extractor: pipe/whitespace 기반 표 후보를 PdfTable 구조로 변환.
- Legal Table Parser: 별표, 별지, 기준표, 등록요건표, 처벌표 성격을 LegalTableFactCandidate로 분류.
- Number Preservation: value, unit, operator(이상/이하/초과/미만)를 PreservedNumber로 보존.
- Quality Scorer: encoding/structure/table/numeric 각 25% 가중으로 extractionQualityScore를 계산.

## Before / After

| Metric | Before source adapter | After quality layer + legal reconstruction |
| --- | --- | --- |
| Candidate count | 200 | 87 |
| Numeric rate | 14.0% | 100.0% |
| Condition rate | 23.5% | 92.0% |
| Exception rate | 6.5% | 83.9% |
| AUTO_APPROVE count | 56 | 3 |
| POOR count | 107 | 0 |
| False approve risk count | 20 | 0 |
| False approve risk rate | 35.7% | 0.0% |

## Extraction Score

- overallScore: 0.833
- encodingScore: 0.983
- structureScore: 1.000
- tableScore: 0.350
- numericScore: 1.000
- warnings: TABLE_LOSS:MEDIUM

## Table 결과

- extracted tables: 0
- legal table cells: 0
- No reliable table structure detected in the first extraction window.

## 숫자 보존 결과

- preserved numbers: 192
| Raw | Value | Unit | Operator | Locator |
| --- | --- | --- | --- | --- |
| 2021 | 2021 | - | - | PDF:1. 항공안전법 (1).pdf:number-1 |
| 1 | 1 | - | - | PDF:1. 항공안전법 (1).pdf:number-2 |
| 2 | 2 | - | - | PDF:1. 항공안전법 (1).pdf:number-3 |
| 1 | 1 | - | - | PDF:1. 항공안전법 (1).pdf:number-4 |
| 3 | 3 | - | - | PDF:1. 항공안전법 (1).pdf:number-5 |
| 1 | 1 | - | - | PDF:1. 항공안전법 (1).pdf:number-6 |
| 4 | 4 | - | - | PDF:1. 항공안전법 (1).pdf:number-7 |
| 1 | 1 | - | - | PDF:1. 항공안전법 (1).pdf:number-8 |
| 5 | 5 | - | - | PDF:1. 항공안전법 (1).pdf:number-9 |
| 1 | 1 | - | - | PDF:1. 항공안전법 (1).pdf:number-10 |
| 6 | 6 | - | - | PDF:1. 항공안전법 (1).pdf:number-11 |
| 1 | 1 | - | - | PDF:1. 항공안전법 (1).pdf:number-12 |
| 7 | 7 | - | - | PDF:1. 항공안전법 (1).pdf:number-13 |
| 2 | 2 | - | - | PDF:1. 항공안전법 (1).pdf:number-14 |
| 2 | 2 | - | - | PDF:1. 항공안전법 (1).pdf:number-15 |
| 5 | 5 | - | - | PDF:1. 항공안전법 (1).pdf:number-16 |
| 3 | 3 | - | - | PDF:1. 항공안전법 (1).pdf:number-17 |
| 1 | 1 | - | - | PDF:1. 항공안전법 (1).pdf:number-18 |
| 4 | 4 | - | - | PDF:1. 항공안전법 (1).pdf:number-19 |
| 5 | 5 | - | - | PDF:1. 항공안전법 (1).pdf:number-20 |

## Normalized Text Sample

```text
무인동력비행장치 온라인교육 항공안전법 2021 한국교통안전공단 1 목 차
•
항공 법규 체계
•
항공안전법 주요내용
•
무인비행장치 조종자증명 운영세칙
•
초경량비행장치 신고 업무 운영세칙 2
1. 항공 법규 체계
3
1. 항공 법규 체계
 항공안전법
 항공사업법
 공항시설법
4
1. 항공 법규 체계
 항공안전법
 항공사업법
 공항시설법
5
1. 항공 법규 체계
항공안전법 : 법제처 국가법령정보센터 6
1. 항공 법규 체계
무인비행장치 조종자증명 등 운영세칙 : 한국교통안전공단 홈페이지 7
2. 항공안전법 주요내용 - 정의 항공안전법 시행규칙
제2조(정의) 이 법에서 사용하는 용 제5조(초경량비행장치의 기준) 법에서 "자체중량, 좌석 수 등 국 어의 뜻은 다음과 같다. 토교통부령으로 정하는 기준에 해당하는 동력비행장치, 행글라
3. "초경량비행장치"란 항공기와 이더, 패러글라이더, 기구류 및 무인비행장치 등"이란 다음 각 경량항공기 외에 공기의 반작용 호의 기준을 충족하는 동력비행장치, 행글라이더, 패러글라이더,
으로 뜰 수 있는 장치로서 자체 기구류, 무인비행장치, 회전익비행장치, 동력패러글라이더 및 중량, 좌석 수 등 국토교통부령 낙하산류 등을 말한다.
(시행규칙)으로 정하는 기준에 1호~ 4호 <생 략>
해당하는 동력비행장치, 행글라 5. 무인비행장치: 사람이 탑승하지 아니하는 것으로서 다음 각 이더, 패러글라이더, 
```

## 남은 문제

- PDF extractor가 이미 잘못 디코딩한 텍스트는 정규화만으로 원문 복원이 불가능하다.
- 표가 실제 PDF 내부에서 선/좌표만 있고 텍스트 column alignment가 약하면 table count가 낮게 나온다.
- 별표의 복잡한 다단 표는 향후 pdfplumber table settings 또는 OCR/table-aware extractor가 필요하다.
- 이번 단계는 품질 레이어만 추가했으며 Auto Promotion threshold와 Fact 승격 로직은 변경하지 않았다.

## Data Safety

- AtomicFact 생성/수정: 수행하지 않음.
- Fact status 변경: 수행하지 않음.
- KnowledgePack 변경: 수행하지 않음.
- Graph/Graph Version 변경: 수행하지 않음.
- Question DB 저장: 수행하지 않음.
- Supabase 변경: 수행하지 않음.
