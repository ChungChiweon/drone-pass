# Legal Table Intelligence Report

## Table Extraction 방식

- Coordinate Table Extractor는 pdfplumber word 좌표(x0/x1/top/bottom)를 읽어 y축 row grouping, x축 column clustering을 수행한다.
- Legal Table Detector는 좌표 후보, PDF quality layer의 text table 후보, 정규화 텍스트의 반복 column 패턴을 합쳐 LegalTableStructure로 변환한다.
- Table Normalizer는 숫자/단위 공백, 억 원/만 원 분리, 이상/이하 분리를 복원한다.
- 이번 단계는 분석/후보 생성만 수행하며 AtomicFact, Graph, Question 저장은 하지 않는다.

## 탐지 결과

- Before extracted tables: 0
- After detected legal tables: 8
- Generated table FactCandidates: 53
- Generated table relation candidates: 18

## Table Quality

| Table | Type | Rows | Columns | Overall | Header | Row | Numeric |
| --- | --- | --- | --- | --- | --- | --- | --- |
| coord-table-p8-1 | EXCEPTION_TABLE | 8 | 2 | 0.975 | 1.000 | 1.000 | 1.000 |
| coord-table-p9-1 | EXCEPTION_TABLE | 3 | 2 | 0.975 | 1.000 | 1.000 | 1.000 |
| coord-table-p11-1 | EXCEPTION_TABLE | 9 | 2 | 0.725 | 0.000 | 1.000 | 1.000 |
| coord-table-p12-1 | OTHER | 2 | 2 | 0.533 | 0.000 | 1.000 | 0.350 |
| coord-table-p13-1 | OTHER | 2 | 2 | 0.695 | 0.000 | 1.000 | 1.000 |
| coord-table-p15-1 | EXCEPTION_TABLE | 12 | 2 | 0.725 | 0.000 | 1.000 | 1.000 |
| coord-table-p17-1 | PENALTY_TABLE | 10 | 6 | 0.725 | 0.000 | 1.000 | 1.000 |
| coord-table-p18-1 | PENALTY_TABLE | 7 | 7 | 0.697 | 0.000 | 1.000 | 0.889 |

## 생성 Fact 후보

| Candidate | Statement | Table | Column | Value | Locator |
| --- | --- | --- | --- | --- | --- |
| pdf-aviation-safety-act:table-candidate-coord-table-p8-1-1-1 | 이더, 패러글라이더, 기구류 및 무인비행장치 등"이란 다음 각는 어의 뜻은 다음과 같다. 기준에서 3. "초경량비행장치"란 항공기와 예외 또는 제외 조건을 가진다. | coord-table-p8-1 | 어의 뜻은 다음과 같다. | 3. "초경량비행장치"란 항공기와 | PDF:page-8:coordinate-table-1:coord-table-p8-1:row-1:col-1 |
| pdf-aviation-safety-act:table-candidate-coord-table-p8-1-5-2 | 1호~ 4호 <생 략>는 토교통부령으로 정하는 기준에 해당하는 동력비행장치, 행글라 기준에서 1호~ 4호 <생 략> 예외 또는 제외 조건을 가진다. | coord-table-p8-1 | 토교통부령으로 정하는 기준에 해당하는 동력비행장치, 행글라 | 1호~ 4호 <생 략> | PDF:page-8:coordinate-table-1:coord-table-p8-1:row-5:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p8-1-6-2 | 5. 무인비행장치: 사람이 탑승하지 아니하는 것으로서 다음 각는 토교통부령으로 정하는 기준에 해당하는 동력비행장치, 행글라 기준에서 5. 무인비행장치: 사람이 탑승하지 아니하는 것으로서 다음 각 예외 또는 제외 조건을 가진다. | coord-table-p8-1 | 토교통부령으로 정하는 기준에 해당하는 동력비행장치, 행글라 | 5. 무인비행장치: 사람이 탑승하지 아니하는 것으로서 다음 각 | PDF:page-8:coordinate-table-1:coord-table-p8-1:row-6:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p8-1-8-2 | 가. 무인동력비행장치: 연료의 중량을 제외한 자체중량이 150는 토교통부령으로 정하는 기준에 해당하는 동력비행장치, 행글라 기준에서 가. 무인동력비행장치: 연료의 중량을 제외한 자체중량이 150 예외 또는 제외 조건을 가진다. | coord-table-p8-1 | 토교통부령으로 정하는 기준에 해당하는 동력비행장치, 행글라 | 가. 무인동력비행장치: 연료의 중량을 제외한 자체중량이 150 | PDF:page-8:coordinate-table-1:coord-table-p8-1:row-8:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p9-1-1-2 | 을 국토교통부령으로 정하는 바에는 인 것 기준에서 (→ 신고 제외 장치 : 2kg 이하면서 대여업/사용사업에 사용되지 않는 기체) 예외 또는 제외 조건을 가진다. | coord-table-p9-1 | 인 것 | (→ 신고 제외 장치 : 2kg 이하면서 대여업/사용사업에 사용되지 않는 기체) | PDF:page-9:coordinate-table-1:coord-table-p9-1:row-1:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p9-1-2-2 | 초경량비행장치는 그러하지 아니하다.는 인 것 기준에서 8. 제작자등이판매가목적이나판매되지아니한것으로서비행에사 예외 또는 제외 조건을 가진다. | coord-table-p9-1 | 인 것 | 8. 제작자등이판매가목적이나판매되지아니한것으로서비행에사 | PDF:page-9:coordinate-table-1:coord-table-p9-1:row-2:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p9-1-3-1 | 제2항~제5항 <생 략>는 개인위치정보의 수집 가능 여부 등 기준에서 제2항~제5항 <생 략> 예외 또는 제외 조건을 가진다. | coord-table-p9-1 | 개인위치정보의 수집 가능 여부 등 | 제2항~제5항 <생 략> | PDF:page-9:coordinate-table-1:coord-table-p9-1:row-3:col-1 |
| pdf-aviation-safety-act:table-candidate-coord-table-p11-1-1-1 | 초경량비행장치소유자등은 신고한 초경는 column-1 기준에서 초경량비행장치소유자등은 신고한 초경 예외 또는 제외 조건을 가진다. | coord-table-p11-1 | column-1 | 초경량비행장치소유자등은 신고한 초경 | PDF:page-11:coordinate-table-1:coord-table-p11-1:row-1:col-1 |
| pdf-aviation-safety-act:table-candidate-coord-table-p11-1-3-2 | 경우에는 국토교통부령으로 정하는 바에는 column-2 기준에서 1. 초경량비행장치의 용도 예외 또는 제외 조건을 가진다. | coord-table-p11-1 | column-2 | 1. 초경량비행장치의 용도 | PDF:page-11:coordinate-table-1:coord-table-p11-1:row-3:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p11-1-4-1 | 따라 국토교통부장관에게 변경신고를 하는 column-1 기준에서 따라 국토교통부장관에게 변경신고를 하 예외 또는 제외 조건을 가진다. | coord-table-p11-1 | column-1 | 따라 국토교통부장관에게 변경신고를 하 | PDF:page-11:coordinate-table-1:coord-table-p11-1:row-4:col-1 |
| pdf-aviation-safety-act:table-candidate-coord-table-p11-1-4-2 | 따라 국토교통부장관에게 변경신고를 하는 column-2 기준에서 2. 초경량비행장치 소유자등의 성명, 명칭 또는 주소 예외 또는 제외 조건을 가진다. | coord-table-p11-1 | column-2 | 2. 초경량비행장치 소유자등의 성명, 명칭 또는 주소 | PDF:page-11:coordinate-table-1:coord-table-p11-1:row-4:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p11-1-5-2 | 여야 한다.는 column-2 기준에서 3. 초경량비행장치의 보관 장소 예외 또는 제외 조건을 가진다. | coord-table-p11-1 | column-2 | 3. 초경량비행장치의 보관 장소 | PDF:page-11:coordinate-table-1:coord-table-p11-1:row-5:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p11-1-6-2 | 경량비행장치가 멸실되었거나 그 초경량는 column-2 기준에서 2 초경량비행장치소유자등은 제1항 각 호의 사항을 변 예외 또는 제외 조건을 가진다. | coord-table-p11-1 | column-2 | 2 초경량비행장치소유자등은 제1항 각 호의 사항을 변 | PDF:page-11:coordinate-table-1:coord-table-p11-1:row-6:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p11-1-7-2 | 비행장치를 해체(정비등, 수송 또는 보관는 column-2 기준에서 경하려는 경우에는 그 사유가 있는 날부터 30일 이내에 별 예외 또는 제외 조건을 가진다. | coord-table-p11-1 | column-2 | 경하려는 경우에는 그 사유가 있는 날부터 30일 이내에 별 | PDF:page-11:coordinate-table-1:coord-table-p11-1:row-7:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p11-1-8-2 | 하기 위한 해체는 제외)한 경우에는 그 사는 column-2 기준에서 지 서식의 초경량비행장치 변경·이전신고서를 한국교통안 예외 또는 제외 조건을 가진다. | coord-table-p11-1 | column-2 | 지 서식의 초경량비행장치 변경·이전신고서를 한국교통안 | PDF:page-11:coordinate-table-1:coord-table-p11-1:row-8:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p11-1-9-1 | 유가 발생한 날부터 15일 이내에 국토교는 column-1 기준에서 유가 발생한 날부터 15일 이내에 국토교 예외 또는 제외 조건을 가진다. | coord-table-p11-1 | column-1 | 유가 발생한 날부터 15일 이내에 국토교 | PDF:page-11:coordinate-table-1:coord-table-p11-1:row-9:col-1 |
| pdf-aviation-safety-act:table-candidate-coord-table-p12-1-2-1 | 로서 국토교통부장관의 허가를 받은 경의 column-1 기준값은 로서 국토교통부장관의 허가를 받은 경이다. | coord-table-p12-1 | column-1 | 로서 국토교통부장관의 허가를 받은 경 | PDF:page-12:coordinate-table-1:coord-table-p12-1:row-2:col-1 |
| pdf-aviation-safety-act:table-candidate-coord-table-p13-1-1-1 | 자 증명 등) 1 동력비행장의 column-1 기준값은 자 증명 등) 1 동력비행장이다. | coord-table-p13-1 | column-1 | 자 증명 등) 1 동력비행장 | PDF:page-13:coordinate-table-1:coord-table-p13-1:row-1:col-1 |
| pdf-aviation-safety-act:table-candidate-coord-table-p15-1-1-1 | 제129조(초경량비행장치 조는 column-1 기준에서 제129조(초경량비행장치 조 예외 또는 제외 조건을 가진다. | coord-table-p15-1 | column-1 | 제129조(초경량비행장치 조 | PDF:page-15:coordinate-table-1:coord-table-p15-1:row-1:col-1 |
| pdf-aviation-safety-act:table-candidate-coord-table-p15-1-1-2 | 제129조(초경량비행장치 조는 column-2 기준에서 제310조(초경량비행장치 조종자의 준수사항) 1 초경량비행장치 조종자는 예외 또는 제외 조건을 가진다. | coord-table-p15-1 | column-2 | 제310조(초경량비행장치 조종자의 준수사항) 1 초경량비행장치 조종자는 | PDF:page-15:coordinate-table-1:coord-table-p15-1:row-1:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p15-1-2-1 | 종자 등의 준수사항) 1 초는 column-1 기준에서 종자 등의 준수사항) 1 초 예외 또는 제외 조건을 가진다. | coord-table-p15-1 | column-1 | 종자 등의 준수사항) 1 초 | PDF:page-15:coordinate-table-1:coord-table-p15-1:row-2:col-1 |
| pdf-aviation-safety-act:table-candidate-coord-table-p15-1-3-2 | 이나 재산에 피해가 발생하는 column-2 기준에서 1. 인명이나 재산에 위험을 초래할 우려가 있는 낙하물을 투하(投下)하는 행위 예외 또는 제외 조건을 가진다. | coord-table-p15-1 | column-2 | 1. 인명이나 재산에 위험을 초래할 우려가 있는 낙하물을 투하(投下)하는 행위 | PDF:page-15:coordinate-table-1:coord-table-p15-1:row-3:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p15-1-4-2 | 지 아니하도록 국토교통부령는 column-2 기준에서 2. 인구가 밀집된 지역이나 그 밖에 사람이 많이 모인 장소의 상공에서 인명 예외 또는 제외 조건을 가진다. | coord-table-p15-1 | column-2 | 2. 인구가 밀집된 지역이나 그 밖에 사람이 많이 모인 장소의 상공에서 인명 | PDF:page-15:coordinate-table-1:coord-table-p15-1:row-4:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p15-1-5-1 | 3 초경량비행장치 조종자는는 column-1 기준에서 3 초경량비행장치 조종자는 예외 또는 제외 조건을 가진다. | coord-table-p15-1 | column-1 | 3 초경량비행장치 조종자는 | PDF:page-15:coordinate-table-1:coord-table-p15-1:row-5:col-1 |
| pdf-aviation-safety-act:table-candidate-coord-table-p15-1-5-2 | 3 초경량비행장치 조종자는는 column-2 기준에서 목의 행위와 지방항공청장 허가를 받은 경우는 제외한다. 예외 또는 제외 조건을 가진다. | coord-table-p15-1 | column-2 | 목의 행위와 지방항공청장 허가를 받은 경우는 제외한다. | PDF:page-15:coordinate-table-1:coord-table-p15-1:row-5:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p15-1-8-2 | 으로정하는바에따라지체없이는 column-2 기준에서 아닌곳에서최저비행고도(150미터) 미만의고도에서비행하는행위 예외 또는 제외 조건을 가진다. | coord-table-p15-1 | column-2 | 아닌곳에서최저비행고도(150미터) 미만의고도에서비행하는행위 | PDF:page-15:coordinate-table-1:coord-table-p15-1:row-8:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p15-1-9-2 | 국토교통부장관에게그사실을는 column-2 기준에서 1) 무인비행기, 무인헬리콥터 또는 무인멀티콥터 중 최대이륙중량이 25킬 예외 또는 제외 조건을 가진다. | coord-table-p15-1 | column-2 | 1) 무인비행기, 무인헬리콥터 또는 무인멀티콥터 중 최대이륙중량이 25킬 | PDF:page-15:coordinate-table-1:coord-table-p15-1:row-9:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p15-1-10-2 | 수 없을 때에는 그 초경량비는 column-2 기준에서 4. 안개 등으로 인하여 지상목표물을 육안으로 식별할 수 없는 상태에서 비 예외 또는 제외 조건을 가진다. | coord-table-p15-1 | column-2 | 4. 안개 등으로 인하여 지상목표물을 육안으로 식별할 수 없는 상태에서 비 | PDF:page-15:coordinate-table-1:coord-table-p15-1:row-10:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p15-1-12-2 | 행장치사고를 보고하여야 한는 column-2 기준에서 5. 비행시정 및 구름으로부터 거리기준을 위반하여 비행하는 행위 예외 또는 제외 조건을 가진다. | coord-table-p15-1 | column-2 | 5. 비행시정 및 구름으로부터 거리기준을 위반하여 비행하는 행위 | PDF:page-15:coordinate-table-1:coord-table-p15-1:row-12:col-2 |
| pdf-aviation-safety-act:table-candidate-coord-table-p17-1-1-1 | 장치신고/에 대해서는 column-1 기준 장치신고/가 적용될 수 있다. | coord-table-p17-1 | column-1 | 장치신고/ | PDF:page-17:coordinate-table-1:coord-table-p17-1:row-1:col-1 |

## Graph 영향 Simulation

- COMPARISON_PAIR candidates: 6
- CONFUSED_WITH candidates: 12
- Expected distractor increase: 18
- All graph candidates are draft simulation objects only. No relation was approved or saved.

## Question 영향 Simulation

- Possible table-based questions: 53
- Comparison questions: 6
- CASE_JUDGMENT-like questions: 53

## 남은 문제

- PDF 원본이 좌표상 표 column을 충분히 분리하지 않으면 table count가 낮게 유지될 수 있다.
- 복잡한 별표 다단 표는 cell merge/header spanning 처리가 추가로 필요하다.
- 실제 Graph 연결은 아직 승인/저장하지 않았고, 사람이 검수할 후보만 생성한다.

## Data Safety

- AtomicFact 생성/수정: 수행하지 않음.
- Fact status 변경: 수행하지 않음.
- KnowledgePack 변경: 수행하지 않음.
- Graph 승인/Graph Version 변경: 수행하지 않음.
- Question DB 저장: 수행하지 않음.
- Supabase 변경: 수행하지 않음.
