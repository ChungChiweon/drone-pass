# Legal Fact Reconstruction Report

## 기존 문제

- 기존 PDF 후보 생성은 문장 단위 분할에 가까워 조문·항·호 문맥이 분리될 수 있었다.
- 숫자와 단위만 남은 후보는 sourceReference가 있어도 주체, 조건, 예외가 불완전해 AUTO_APPROVE false approve risk를 높였다.

## Parser 구조

- PDF Source Adapter는 그대로 유지하고, LAW source에 대해 별도 legal reconstruction pipeline을 추가했다.
- 인식 단위: Document -> Chapter -> Article -> Paragraph -> Clause -> Item.
- 인식 cue: 제X조, 제X조의X, 제X장/제X절, ①~⑳, 1., 가., (1), 별표/부칙 문맥.
- 실제 파싱 결과: chapters 0, articles 19, paragraphs 80, clauses 100, items 0.

## Reconstruction 방식

- Article 전체 문맥을 FactContext.fullArticleText에 보존한다.
- Clause 단위 후보를 만들되 sourceLocator는 article/paragraph/clause 경로로 유지한다.
- FactCandidate에 legalSubject, legalAction, condition, exception, threshold, applicability, legalContext를 optional metadata로 추가했다.
- AtomicFact와 KnowledgePack schema는 변경하지 않았다.

## Condition / Exception 처리

- 조건 cue: 경우, 때, 이상, 이하, 초과, 미만, 따른, 해당, 까지, 이내, 대상, 조건.
- 예외 cue: 다만, 단, 제외, 예외, 아니하다, 아니 된다, 불구하고.
- 예외가 있는 후보는 같은 article peer 후보와 LegalExceptionLink로 연결한다.

## Before / After 품질 비교

| Metric | Before sentence extractor | After legal reconstruction |
| --- | --- | --- |
| Candidate count | 200 | 100 |
| Numeric rate | 14.0% | 100.0% |
| Condition rate | 23.5% | 93.0% |
| Exception rate | 6.5% | 84.0% |
| AUTO_APPROVE count | 68 | 7 |
| POOR count | 107 | 0 |
| POOR rate | 53.5% | 0.0% |
| False approve risk count | 30 | 0 |
| False approve risk rate | 44.1% | 0.0% |
| Average confidence | 0.496 | 0.909 |

## Reconstructed Candidate Sample

| Candidate | Statement | Locator | Condition | Exception |
| --- | --- | --- | --- | --- |
| pdf-aviation-safety-act:legal-candidate-001 | 해당 법령 대상자는 기준값 2에 관하여 해당 법령 기준을 적용받는다. | article:제2조(정의):paragraph-1:clause-1 | - | - |
| pdf-aviation-safety-act:legal-candidate-002 | 무인비행장치는 해당하는 동력비행장치, 행글라 3. "초경량비행장치"란 항공기와 이더, 패러글라이더, 기구류 및 무인비행장치 등"이란 다음 각 경량항공기 외에 공기의 반작용 호의 기준값 3에 관하여 해당 법령 기준을 적용받는다. 다만 제외한 자체중량이  | article:제5조(초경량비행장치의기준):paragraph-1:clause-1 | 해당하는 동력비행장치, 행글라 3. "초경량비행장치"란 항공기와 이더, 패러글라이더, 기구류 및 무인비행장치 등"이란 다음 각 경량항공기 외에  | 제외한 자체중량이 150 킬로그램 이하인 무인비행기, 무인헬리콥터 또는 무인멀티 콥터 나. 무인비행선: 연료의 중량을 |
| pdf-aviation-safety-act:legal-candidate-003 | 무인비행장치는 해당하는 동력비행장치, 행글라 제5조(초경량비행장치의 기준) 법에서 "자체중량, 좌석 수 등 국 어의 뜻은 다음과 같다. 토교통부령으로 정하는 기준에 기준값 1에 관하여 해당 법령 기준을 적용받는다. 다만 제외한 자체중량이 150 킬로그 | article:제5조(초경량비행장치의기준):paragraph-1:clause-2 | 해당하는 동력비행장치, 행글라 제5조(초경량비행장치의 기준) 법에서 "자체중량, 좌석 수 등 국 어의 뜻은 다음과 같다. 토교통부령으로 정하는  | 제외한 자체중량이 150 킬로그램 이하인 무인비행기, 무인헬리콥터 또는 무인멀티 콥터 나. 무인비행선: 연료의 중량을 |
| pdf-aviation-safety-act:legal-candidate-004 | 무인비행장치는 해당하는 동력비행장치, 행글라 3. "초경량비행장치"란 항공기와 이더, 패러글라이더, 기구류 및 무인비행장치 등"이란 다음 각 경량항공기 외에 공기의 반작용 호의 기준값 5에 관하여 해당 법령 기준을 적용받는다. 다만 제외한 자체중량이  | article:제5조(초경량비행장치의기준):paragraph-2:clause-1 | 해당하는 동력비행장치, 행글라 3. "초경량비행장치"란 항공기와 이더, 패러글라이더, 기구류 및 무인비행장치 등"이란 다음 각 경량항공기 외에  | 제외한 자체중량이 150 킬로그램 이하인 무인비행기, 무인헬리콥터 또는 무인멀티 콥터 나. 무인비행선: 연료의 중량을 |
| pdf-aviation-safety-act:legal-candidate-005 | 무인비행장치는 이하인 무인비행기, 무인헬리콥터 또는 무인멀티 콥터 제5조(초경량비행장치의 기준) 법에서 "자체중량, 좌석 수 등 국 어의 뜻은 다음과 같다. 토교통부령으로 정하 기준값 150 킬로그램에 관하여 해당 법령 기준을 적용받는다. 다만 제외한 | article:제5조(초경량비행장치의기준):paragraph-2:clause-2 | 이하인 무인비행기, 무인헬리콥터 또는 무인멀티
콥터 제5조(초경량비행장치의 기준) 법에서 "자체중량, 좌석 수 등 국 어의 뜻은 다음과 같다.  | 제외한 자체중량이 150
킬로그램 이하인 무인비행기, 무인헬리콥터 또는 무인멀티
콥터 제5조(초경량비행장치의 기준) 법에서 "자체중량, 좌석 수 |
| pdf-aviation-safety-act:legal-candidate-006 | 무인비행장치는 이하이고 길이가 20미터 기준값 180킬로그램에 관하여 해당 법령 기준을 적용받는다. 다만 제외한 자체중량이 180킬로그램 이하이고 길이가 20미터 이하인 무인비행선 <이하 생략> 8 제5조(초경량비행장치의 기준) 법에서 "자체중량, 좌 | article:제5조(초경량비행장치의기준):paragraph-2:clause-3 | 이하이고 길이가 20미터 | 제외한 자체중량이 180킬로그램
이하이고 길이가 20미터 이하인 무인비행선 <이하 생략>
8 제5조(초경량비행장치의 기준) 법에서 "자체중량,  |
| pdf-aviation-safety-act:legal-candidate-007 | 무인비행장치는 해당하는 동력비행장치, 행글라 3. "초경량비행장치"란 항공기와 이더, 패러글라이더, 기구류 및 무인비행장치 등"이란 다음 각 경량항공기 외에 공기의 반작용 호의 기준값 2에 관하여 신고 의무를 이행하여야 한다. 다만 제외한 자체중량이  | article:제5조(초경량비행장치의기준):paragraph-3:clause-1 | 해당하는 동력비행장치, 행글라 3. "초경량비행장치"란 항공기와 이더, 패러글라이더, 기구류 및 무인비행장치 등"이란 다음 각 경량항공기 외에  | 제외한 자체중량이 150 킬로그램 이하인 무인비행기, 무인헬리콥터 또는 무인멀티 콥터 나. 무인비행선: 연료의 중량을 |
| pdf-aviation-safety-act:legal-candidate-008 | 해당 법령 대상자는 기준값 122에 관하여 신고 의무를 이행하여야 한다. | article:제122조(초경량비행장치신고):paragraph-1:clause-1 | - | - |
| pdf-aviation-safety-act:legal-candidate-009 | 초경량비행장치 소유자등는 해당하는 것으로서 「항공사업법」에 기준값 24에 관하여 신고 의무를 이행하여야 한다. | article:제24조(신고를필요로하지아니하는초경량비행장치의범위):paragraph-1:clause-1 | 해당하는 것으로서 「항공사업법」에 | - |
| pdf-aviation-safety-act:legal-candidate-010 | 무인동력비행장치는 이하 개인위치정보의 수집 가능 여부 등 인 것 (→ 신고 제외 장치 : 2kg 기준값 5에 관하여 신고 의무를 이행하여야 한다. 다만 제외 장치 : 2kg 이하면서 대여업/사용사업에 사용되지 않는 기체) 을 국토교통부령으로 정하는 바 | article:제129조:paragraph-1:clause-1 | 이하
개인위치정보의 수집 가능 여부 등 인 것
(→ 신고 제외 장치 : 2kg | 제외 장치 : 2kg 이하면서 대여업/사용사업에 사용되지 않는 기체)
을 국토교통부령으로 정하는 바에 제129조제4항에 따른 개인정보 및 5.  |
| pdf-aviation-safety-act:legal-candidate-011 | 무인동력비행장치는 이하, 길이가 7미터 기준값 6에 관하여 신고 의무를 이행하여야 한다. 다만 제외한 자체무게가 12킬로그 따라 국토교통부장관에게 신고하여 램 이하, 길이가 7미터 이하 야 한다. 제129조제4항에 따른 개인정보 및 5. 무인동력비행장 | article:제129조:paragraph-2:clause-1 | 이하, 길이가 7미터 | 제외한 자체무게가 12킬로그
따라 국토교통부장관에게 신고하여
램 이하, 길이가 7미터 이하
야 한다. 제129조제4항에 따른 개인정보 및 5.  |
| pdf-aviation-safety-act:legal-candidate-012 | 무인동력비행장치는 따른 개인정보 및 5. 무인동력비행장치 중에서 최대이륙중량이 2킬로그램 기준값 7에 관하여 해당 법령 기준을 적용받는다. 다만 다만, 대통령령(시행령)으로 정하는 한 초경량비행장치 초경량비행장치는 그러하지 | article:제129조:paragraph-3:clause-1 | 따른 개인정보 및 5. 무인동력비행장치 중에서 최대이륙중량이 2킬로그램 | 다만, 대통령령(시행령)으로 정하는
한 초경량비행장치
초경량비행장치는 그러하지 |

## Quality 변화

- POOR 변화: 107 -> 0.
- False approve risk 변화: 30 -> 0.
- 조건 포함률 변화: 23.5% -> 93.0%.

## 남은 문제

- PDF text extraction 자체의 줄바꿈·띄어쓰기 오류는 완전히 제거하지 못한다.
- 조문 제목과 본문이 페이지 경계에서 분리되는 경우 locator는 article 기준으로 보수적으로 유지한다.
- 별표 표 구조는 텍스트 추출 품질에 따라 추가 table-aware parser가 필요할 수 있다.
- Auto Promotion 기준값은 변경하지 않았다. legal reconstruction signal은 현재 advisory metadata다.

## Data Safety

- AtomicFact 생성/수정: 수행하지 않음.
- Fact status 변경: 수행하지 않음.
- KnowledgePack 변경: 수행하지 않음.
- Graph/Graph Version 변경: 수행하지 않음.
- Question DB 저장: 수행하지 않음.
- Supabase 변경: 수행하지 않음.
