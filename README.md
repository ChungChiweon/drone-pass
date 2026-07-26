# Drone Pass

Drone Pass(드론패스)는 대한민국 드론 자격시험, 드론 안전, 비행정보를 한 곳에서 다루기 위한 PWA 프로젝트입니다.

- 서비스명: Drone Pass
- 한글명: 드론패스
- 슬로건: 하늘로 가는 가장 쉬운 길
- 운영 표기: Drone Pass Team

## 현재 범위

- 기존 Blue Marina PWA 셸과 카드형 UI를 재사용합니다.
- 기존 보트·해양 고정 문제은행과 문제 로직은 사용하지 않습니다.
- 문제 학습 화면은 새 동적 시험 엔진 샘플 데이터로 연결되어 있습니다.
- 샘플 데이터는 구조 검증용이며 공식 법령, 실제 시험 정답, 수수료, 공역 정보를 대표하지 않습니다.

## 시험 엔진

새 문제 구조는 다음 흐름을 기준으로 합니다.

`AtomicFact + QuestionTemplate + DistractorRule -> QuestionCompiler -> QuestionValidator -> QuestionDelivery`

주요 위치:

- `src/domain/exam-engine/types`
- `src/domain/exam-engine/samples/drone-law-sample.ts`
- `src/domain/exam-engine/compiler/question-compiler.ts`
- `src/domain/exam-engine/validation/question-validator.ts`
- `src/domain/exam-engine/delivery/question-delivery.ts`

## 검증

```bash
npm run check:exam-engine
npm run lint
npm run build
```

로컬 실행:

```bash
npm run dev -- -p 4444
```

## 주의

현재 포함된 드론 문제는 공식 문제가 아닙니다. 실제 문제은행을 만들 때는 공식 출처와 검수 절차를 거친 사실 단위 데이터만 승인 상태로 전환해야 합니다.
