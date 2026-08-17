# Targeted Legal Verification Report

## AF-076 기존 상태

- Status: draft
- Statement: 1종, 2종, 3종 무인멀티콥터 중 어느 하나의 조종 시간이 총 6시간 이상인 사람은 3종 응시기준을 충족한다
- Source: ts-drone-aviation-safety-2021 / p.22
- 기존 blocker: CONDITION_COMPLETENESS

## PDF p.22 좌표 재추출

- 재구성 문구: 1. 1종, 2종, 3종 무인멀티콥터 중 어느 하나 조종 시간이 총 6시간 이상인 사람
- 동일 행·열 confidence: 0.98
- 다른 행/열 병합 경고: 없음

## 공식 원문 대조

- 자료: (한국교통안전공단) 무인비행장치 조종자 증명 운영세칙
- 조항/별표: 제7조 / 별표 2 조종자 증명 종류별 응시기준
- 시행/개정: 2023-10-10 / 한국교통안전공단 규정 제1444호
- 원문: 1종, 2종, 3종 무인멀티콥터 중 어느 하나를 조종한 시간이 총 6시간 이상인 사람
- URL: https://www.law.go.kr/LSW/schlPubRulInfoP.do?schlPubRulSeq=2200000092803

## 조건 해석

- 결론: SINGLE_TYPE_TOTAL
- 의미: 1종·2종·3종 중 선택한 어느 한 종류의 조종시간이 누적 6시간 이상
- 여러 종류 조종시간의 합산으로 해석하지 않음
- Confidence: 0.98

## 최종 Gate

- Policy: 1.0.0
- Result: SAFE_TO_PROMOTE
- Blockers: 0
- Recommendation: SAFE_TO_PROMOTE

## 대체 후보

- AF-076이 SAFE_TO_PROMOTE로 해소되어 대체 후보 선택은 실행하지 않음.
- 검증 코드에는 unsafe 제외 및 SOURCE_EXPANSION_REQUIRED fallback을 포함함.

## 실제 문제 생성 시뮬레이션

- Virtual approved: 26 -> 40
- 생성 성공: 40/40
- Category 수: 8
- Concept 수: 16
- 정답 유일성 실패: 0
- 오답 중복: 0
- unsafe distractor: 0
- GraphUsageScore: 0 (해당 Batch Fact에 승인 Graph relation 없음)
- graph-backed distractor: 0

## Batch 1 최종 구성

- SAFE: 14
- HOLD: 0
- REJECT: 0
- Replacement: 0
- Initial review exceptions: 1
- Official verification으로 해소: 1
- 남은 사람 검수: 0
- Automation success rate: 100%
- Readiness: READY_FOR_CANARY

## Mutation 확인

- AtomicFact/KnowledgePack/Graph/Question DB/Supabase/audit 변경: 0
- 모든 승인 및 문제 생성 결과는 메모리 시뮬레이션
