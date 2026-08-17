# SOURCE-BATCH-004G Emergency, Failure, and Safety Ingestion Report

## Scope and sources

004G workspace taxonomy 20개를 기준으로 FAA AC 107-2A와 FAA Remote Pilot Small UAS Study Guide의 READY source만 처리했다. AC 107-2A는 current source로 사용했고, 2016 Study Guide는 supporting 및 possibly outdated로 표시했다.

처리 범위는 총 10페이지, 5개 section이다.

- AC 107-2A 5.18 In-Flight Emergency
- AC 107-2A 8.3.1 Minimum Distances from a Person
- AC 107-2A Appendix B.5 Battery Fires
- AC 107-2A Appendix B.6 Frequency Utilization
- AC 107-2A Appendix C Table C-1 Small UAS Condition Chart
- Study Guide Chapter 5 Emergency Procedures

## Topic coverage

- INGESTED: 13
- INGESTED_WITH_GAPS: 1
- NO_KNOWLEDGE: 6

NO_KNOWLEDGE는 GPS error, compass error, ESC failure, RTH error, forced landing, post-accident operational response다. Emergency landing은 source에 capability만 있고 procedure가 없어 gap으로 유지했다. 법적 사고 보고 의무는 Legal 영역이므로 복제하지 않았다.

## Extracted knowledge

| Type | Count |
|---|---:|
| FailureMode | 9 |
| FailureSymptom | 8 |
| EmergencyProcedure | 2 |
| Ordered Procedure | 0 |
| Unordered Procedure | 2 |
| EmergencyDecision | 2 |
| SafetyKnowledge | 3 |
| FlightConcept | 2 |
| FlightRelationship | 6 |
| VisualLink | 0 |

### Failure modes

근거가 명시된 RF interference, electrical malfunction indication, propulsion sound anomaly, delayed control response, battery casing distortion, diminishing flight time, structural cracking, loose/missing hardware, lithium battery fire hazard를 구조화했다.

Source가 원인이나 대응을 명시하지 않은 필드는 비워 두었다. 제조사별 RTH, failsafe, GPS mode change, motor-out response는 만들지 않았다.

### Symptoms and responses

Appendix C Table C-1의 관찰 조건을 FailureSymptom으로 분리했다. Electrical burning smell, soot/sparking, propulsion sound change, delayed control input, battery bulging, diminishing flight time, cracking, loose hardware만 포함했다.

대응은 표에 명시된 further inspection, discontinue/avoid further flight, repair assessment, hardware secure/replace 범위로 제한했다.

### Emergency procedures and decisions

In-flight emergency의 일반 대응과 delayed control response를 procedure로 구조화했다. Source에 번호 순서가 없으므로 두 procedure 모두 unordered다.

Delayed/unsynchronized control input과 unsafe-condition inspection만 concrete trigger가 있어 EmergencyDecision으로 생성했다.

### Safety knowledge

- In-flight emergency 중 injury/property damage 최소화
- Lithium battery fire hazard와 manufacturer recommendation 기반 safe handling
- RF obstruction/interference 예방

Source-supported fire suppression 방법이 없어 battery fire response는 warning을 유지했다.

## Relationships

6건 모두 evidence와 locator를 가진 관계다. RF interference와 LOC, delayed control과 decision/collision, battery bulging과 inspection decision, propulsion sound와 inspection decision, battery fire와 safety knowledge를 연결했다. Failure chain은 source가 뒷받침하는 부분까지만 구성했다.

## Visual links

Source inventory에서 해당 페이지에 재사용 가능한 등록 visual asset이 없어 0건이다. Appendix C 표를 임의 visual asset으로 등록하거나 자동 해석하지 않았다.

## Deferred handling

004F deferred 중 004G candidate 1건을 source locator와 raw evidence를 유지한 채 supporting evidence로 회수했다. 004H 후보 2건은 그대로 보존했다.

기존 64 procedure inventory 분류:

- CONFIRMED_004G_EMERGENCY: 2
- CONFIRMED_004G_SAFETY: 3
- 004H_CANDIDATE: 6
- NOT_004G: 53

원본 inventory는 변경하지 않았다.

## Quality and validation input

- Source locator completeness: 1.00
- Failure structure completeness: 1.00
- Symptom evidence completeness: 1.00
- Response evidence completeness: 1.00
- Procedure structure completeness: 1.00
- Ordering evidence completeness: 1.00
- Safety evidence completeness: 1.00
- Relationship evidence completeness: 1.00
- Provenance completeness: 1.00
- Unsupported inference: 0

Validation input은 32건이다.

- ELIGIBLE: 30
- ELIGIBLE_WITH_WARNING: 2
- BLOCKED: 0

이번 단계에서는 validation이나 canonical 생성을 수행하지 않았다.

## Frozen and blocked batches

- 004A: READY_WITH_GAPS_FROZEN
- 004B: READY_WITH_GAPS_FROZEN
- 004F: READY_WITH_GAPS_FROZEN
- 004H: READY, not ingested
- 004C/D/E: BLOCKED_SOURCE_GAP

## Data impact

- Active Pack mutation: 0
- AtomicFact mutation: 0
- Active Graph mutation: 0
- Question generation/write: 0
- Supabase mutation: 0
- Legal/Weather runtime mutation: 0
