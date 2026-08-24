# Drone Pass Current Implementation Audit — 2026-08

> 기준일: 2026-08-23
> 범위: 현재 workspace의 코드와 artifact를 대상으로 한 read-only 감사
> 주의: 브라우저 `localStorage` 상태는 origin별로 달라질 수 있다. 이 문서에서 저장소 artifact와 브라우저 상태는 구분한다.

## 1. Git / Repository 상태

- Branch: `agent/full-engine-publication`
- HEAD: `daa51698cc00151abbe920c41ff20ce1e0993579`
- Framework: Next.js 15.5.19 App Router, React 19, TypeScript 5.7, Tailwind, Vitest.
- 주요 dependency: `@supabase/ssr`, `@supabase/supabase-js`, `openai`, `zod`, `lucide-react`.
- 조사 전 worktree에는 사용자 소유 변경이 있었다.
  - modified: `src/app/admin/drone-source-coverage/page.tsx`
  - untracked: Flight 004E canonical report/script/test 및 Flight integration audit report/script/code.
- 규모: `src` 712 files, `data` 392, `work` 754, `scripts` 47, `docs` 103, `supabase` 4, `public` 5.
- 주요 루트: `src/app`, `src/components`, `src/data`, `src/domain`, `src/lib`, `src/types`, `data`, `work`, `scripts`, `docs`, `supabase`, `public`.
- 이 감사는 위 변경을 수정하지 않았다. 허용된 이 보고서만 신규 생성했다.

## 2. 전체 Route / UI

### 애플리케이션 기반

- Root layout: `src/app/layout.tsx`; 사용자 shell은 대부분 `src/components/boat/AppFrame.tsx` 또는 `PortalShell`을 사용한다.
- PWA: `public/manifest.json`, `public/sw.js`가 존재한다.
- Middleware: 없음.
- Server Action (`"use server"`): 없음.
- API: `src/app/api/admin/local-recovery-artifact/route.ts`, `src/app/api/sea-info/tide/route.ts`.

### 사용자 route

| Route | 실제 상태 | 데이터 / 연결 |
|---|---|---|
| `/` | IMPLEMENTED_AND_CONNECTED | `HomeLanding`; 정적 포털 UI |
| `/study` | IMPLEMENTED_AND_CONNECTED | 유일한 실제 문제 UI. `getGeneratedQuestions()` 호출 |
| `/exam`, `/random`, `/past` | PLACEHOLDER | 모의고사/랜덤/공식문제 준비중 |
| `/wrong`, `/progress`, `/analysis`, `/theory` | PLACEHOLDER | 새 GeneratedQuestion/fact/concept 연결 예정 문구만 존재 |
| `/dictionary`, `/faq`, `/centers`, `/boatpedia` | IMPLEMENTED_BUT_STATIC | `src/data/drone-*` 정적 데이터 또는 준비중 카드 |
| `/practice/**` | IMPLEMENTED_BUT_STATIC / LEGACY_MIXED | 드론 문구와 수상레저/보트 표현 혼재 |
| `/exam-guide`, `/license-guide`, `/license-issue`, `/safety-guide`, `/official-links` | LEGACY_MIXED | 포털 shell과 수상레저 문구가 production route에 남음 |
| `/fish`, `/fishing-spots`, `/marine-knowledge`, `/leisure-report` | LEGACY | 어종·낚시·해양·수상레저 사용자 화면이 그대로 노출 |
| `/sea-info`, `/fishing-safety` | LEGACY_MIXED | route 명은 해양 계열이나 일부 본문은 드론으로 교체됨 |

Production readiness: 사용자 shell과 정보 페이지는 렌더링되지만, 시험 앱 핵심인 시험·오답·진도·분석은 placeholder이므로 전체 사용자 제품은 준비되지 않았다.

## 3. 현재 Question Source

실제 호출 흐름:

```text
/study (src/app/study/page.tsx)
  -> getGeneratedQuestions({ seed: "study-demo", limit: 5 })
     (src/domain/exam-engine/delivery/question-delivery.ts)
  -> explicit pack || getActiveLocalKnowledgePack() || sampleKnowledgePack()
  -> approved/effective AtomicFact 필터
  -> compileQuestion()
     (src/domain/exam-engine/compiler/question-compiler.ts)
  -> validateGeneratedQuestion()
     (src/domain/exam-engine/validation/question-validator.ts)
  -> seeded shuffle -> QuestionCard
```

핵심 답변:

1. 사용자 문제는 DB에 저장된 고정 문제를 읽지 않는다. 브라우저 origin의 Active Pack에서 런타임 생성하며, 없으면 `src/domain/exam-engine/samples/drone-law-sample.ts`를 사용한다.
2. `src/data/questions.ts`는 없다. `src/lib/questions.ts`는 delivery 함수/type re-export뿐이다.
3. 새 exam-engine compiler/delivery는 `/study`에만 연결돼 있다: **PARTIAL**.
4. Shadow Runtime 결과를 사용자 UI가 읽지 않는다.
5. Active Pack은 서버 artifact가 아니라 `src/domain/exam-engine/import/local-knowledge-pack-repository.ts`의 browser `localStorage` active alias를 통해 읽는다.
6. Question DB/Supabase는 읽지 않는다.
7. sample fallback이 조용히 동작하고 UI에 “샘플 엔진” 안내가 있어 production 데이터와 구별되지만, 강한 runtime environment gate는 없다.

`/study`의 답 선택·점수는 React local state이며 reload persistence, attempt event, mastery update가 없다.

## 4. exam-engine 구현 구조

| 계층 | 판정 | 근거 |
|---|---|---|
| Source acquisition/registry/coverage | IMPLEMENTED | `source-acquisition`, `source-coverage`, registry/adapter/validator 코드와 tests |
| Source ingestion / extraction | IMPLEMENTED | `source-ingestion`, `knowledge-ingestion`; PDF/legal/table/fusion 계층 |
| Validation | IMPLEMENTED | legal/flight/weather 및 question validators |
| Canonical | ADVANCED_PARTIAL | Legal, Weather, Flight artifacts는 성숙; 공통 production canonical repository는 없음 |
| Knowledge Graph | IMPLEMENTED | generator, validator, curation, review, version/activation, local repository |
| Runtime adapter | PARTIAL | domain별 shadow adapter는 있으나 unified production adapter 없음 |
| Question compiler | IMPLEMENTED | deterministic core compiler + domain shadow compilers |
| Distractor engine/index | IMPLEMENTED | core rules, graph strategy, legal/weather indices |
| Template engine | ADVANCED_PARTIAL | core 5종 + legal/weather taxonomy; Flight audit에서 45종 gap |
| Question validator | IMPLEMENTED | uniqueness, one answer, sources, trace, numeric guard; domain quality layers도 존재 |
| Shadow runtime | PARTIAL | Legal/Weather 실행 artifact 존재; Flight는 integration/readiness audit 단계 |
| Promotion/active pack | PARTIAL | local-only gated UI/service와 rollback/versioning 존재; canonical promotion 미완료 |
| Delivery | PARTIAL | `/study`만 연결, browser Active Pack/sample fallback |
| Mastery | IMPLEMENTED_BUT_NOT_CONNECTED | adaptive/analytics/tutor 계산 코드와 tests; UI/persistence 연결 없음 |

## 5. Legal 상태

근거: `work/legal-knowledge-consolidation/*`, `work/legal-shadow-pack/*`, `work/legal-runtime-hardening/*`.

- 입력 후보 2,727, cluster/canonical unit 2,627.
- `CANONICAL_READY` 2,301, `CANONICAL_READY_WITH_WARNING` 115, `ARCHIVE_ONLY` 211.
- blocked conflicts 41, composite 17, gap topics 16.
- Legacy comparison: replaced 121, unverifiable 303, still-valid 9.
- Canonical set checksum: `sha256-d4aa961e1585823685fd637d12e0218453293145ce90cb1a9ecf42f2a9b99acb`.
- Shadow: 2,301 facts, classic/graph generated 2,289, average quality 0.69, status `SHADOW_RUNTIME_PARTIAL`, semantic duplicate 1, template gap `PENALTY_MATCHING` 51.
- Hardening: 2,301 attempts, 2,265 successes, 36 failures, 7 templates, graph usage 0.6125, status `LEGAL_RUNTIME_READY_WITH_GAPS`.
- Mutation count는 artifact상 0. Active Pack에는 이 canonical set이 승격되지 않았다.

## 6. Weather 상태

근거: `work/weather-shadow-runtime/runtime-summary.json` 및 `shadow-pack.json`.

- Canonical total 46 = knowledge 35 + relationships 11.
- Knowledge: concepts 5, phenomena 7, hazards 7, observations 6, weather codes 6, operational impacts 4.
- Checksum: `sha256-997183193f3e9fe99f2b9523c197814923a3685c9b4b7814c914989f3902bd91`.
- Question eligible/compiler compatible 35; attempted 35, generated 30, skipped 5.
- Graph: nodes 35, relations 11, graph-backed questions 12, graph-backed distractors 0, usage 0.4.
- Average quality 0.86; uniqueness/source/inference/unsafe failures 0.
- Question types: `CONCEPT_DEFINITION`, `PHENOMENON_IDENTIFICATION`, `HAZARD_IDENTIFICATION`, `OBSERVATION_INTERPRETATION`, `WEATHER_CODE_MEANING`.
- OperationalImpact generated 0; template gaps 5; missing/outdated source gaps가 남아 `WEATHER_RUNTIME_READY_WITH_GAPS`.
- Active Pack 적용 없음.

## 7. Flight Theory 004A~004H

근거: `work/flight-theory-validation/canonical-flight-theory-index.json`, 각 `004?/results/canonical-flight-knowledge-004?.json`, integration `baseline-snapshot.json`.

| Batch | Canonical | Knowledge | Relationship | Formula | Validation/runtime | Freeze | Gap | Checksum suffix |
|---|---:|---:|---:|---:|---|---|---:|---|
| 004A | 36 | 29 | 5 | 2 | FROZEN | FROZEN | 0 | `...e547b1` |
| 004B | 26 | 22 | 4 | 0 | FROZEN | FROZEN | 17 | `...1edda3` |
| 004C | 29 | 20 | 7 | 2 | READY_WITH_GAPS | READY_WITH_GAPS_FROZEN | 7 | `...c1acc9` |
| 004D | 20 | 14 | 6 | 0 | READY_WITH_GAPS | READY_WITH_GAPS_FROZEN | 14 | `...ca064e` |
| 004E | 16 | 11 | 4 | 1 | READY_WITH_GAPS | READY_WITH_GAPS_FROZEN | 9 | `...f7c250` |
| 004F | 28 | 22 | 6 | 0 | FROZEN | FROZEN | 12 | `...7bfc9e` |
| 004G | 26 | 25 | 1 | 0 | READY_WITH_GAPS | READY_WITH_GAPS_FROZEN | 7 | `...cc73aa` |
| 004H | 35 | 28 | 7 | 0 | READY_WITH_GAPS | READY_WITH_GAPS_FROZEN | 0 | `...4c152` |

합계는 정확히 **216**이며 knowledge 171, relationship 40, formula 5이다. Index의 `activePack`은 `false`다.

## 8. Canonical 전체 상태

- Legal: canonical 구조와 대규모 ready set 존재, shadow/hardening 완료 수준이나 active 아님.
- Weather: 46 canonical units와 shadow runtime 존재, gaps 포함, active 아님.
- Flight: 216 frozen canonical units 존재, 통합 감사까지 실행됐으나 runtime compatibility 51에 그침, active 아님.
- 세 영역을 함께 versioning/promotion/delivery하는 단일 Canonical repository 및 unified runtime은 없다.

## 9. Flight Theory Integration Audit

**EXECUTED**. 단, 관련 script/code/report 일부는 현재 untracked이므로 HEAD에 포함된 완료물로 간주하면 안 된다.

- `work/flight-theory-integration-audit/execution.json`: `COMPLETED`, audit-only, canonical mutation 0, artifacts 34.
- Reconciliation: 216/216 `RECONCILED`; canonical IDs 216 unique, malformed legacy-style IDs 8.
- Exact duplicate 0; review cluster 1은 004F/004H의 same entity/different role로 `KEEP_SEPARATE`.
- Hard contradiction 0; formula duplicate/conflict 0; generalization violation 0.
- Graph: nodes 216, edges 25, cross-batch edges 13, orphan 175, components 192.
- Global gaps 102; technical context missing 149.
- Runtime compatible subset 51; fatal canonical blocker 1; runtime gaps 2.
- Final readiness: `NEEDS_CANONICAL_REVIEW`.
- Template preview: canonical question types 46, directly named current type 1, missing 45.

## 10. Shadow Runtime

| 대상 | 상태 |
|---|---|
| Legal | 존재하고 실행 artifact도 있음; hardening 후 `LEGAL_RUNTIME_READY_WITH_GAPS` |
| Weather | 존재하고 30 questions artifact 생성; `WEATHER_RUNTIME_READY_WITH_GAPS` |
| Flight | 독립 production shadow runtime은 없음. integration audit가 candidate map/compatibility/readiness만 생성 |
| Unified Legal+Weather+Flight | MISSING |

Core compiler는 seed 기반 deterministic generation을 지원한다. Graph-aware enhancer/generator와 quality validators도 존재한다. 다만 domain별 타입을 공통 Active runtime으로 합치는 연결은 없다.

## 11. Active Pack

- 정의/저장: `KnowledgePack` + `LocalKnowledgePackRepository`; active alias key는 `drone-pass:exam-engine:knowledge-packs:active`.
- 저장소 export `work/dronepass-active-pack--kr-drone-license-mrm0omvd.json`: id `kr-drone-license:mrm0omvd`, concepts 116, AtomicFacts 433, source documents 2, revisions 2, templates 5, distractor rules 7.
- 이 파일 자체의 approved Fact는 **7**이다. 반면 이후 snapshot/consolidation artifact에는 approved 26/30 및 active graph 11 상태가 나타난다. 이는 브라우저 origin별 localStorage와 파일 artifact가 서로 다른 시점의 상태임을 뜻하며, 저장소만으로 현재 사용자의 브라우저 상태를 하나로 확정할 수 없다.
- Legal/Weather/Flight canonical IDs는 이 433-fact export에 포함되지 않으며 Flight index도 `activePack:false`다.
- Promotion gate, canary, graph activation, snapshot/rollback 코드는 존재하지만 browser localStorage 운영 도구이며 server-authoritative production promotion은 아니다.

## 12. AtomicFact / Graph

- `AtomicFact`는 id, conceptId, subject, predicate, value/operator/unit, conditions/exceptions, sourceReferences, version/status 등을 갖는다.
- 저장소 pack artifact count 433.
- Graph relation은 from/to Fact, relationType, confidence, reason, reviewStatus, packId를 가지며 version/snapshot/approval/audit 구조가 있다.
- Local graph repository는 `dronepass.knowledgeGraph*` localStorage keys를 사용한다.
- Snapshot artifact상 active graph version `kg-candidate-kr-drone-license:mrm0omvd-20260730000000000`, approved relations 11인 상태가 존재한다. 그러나 이는 browser-origin snapshot이며 repo export 자체의 단일 production DB state가 아니다.
- Candidate/active graph는 433 AtomicFact 계열이다. Legal/Weather/Flight canonical graph와 통합되지 않았고 Flight 216은 현재 active graph에 없다.

## 13. Question Engine

| 기능 | 판정 | 근거 |
|---|---|---|
| QuestionTemplate/DistractorRule/GeneratedQuestion | IMPLEMENTED | `src/domain/exam-engine/types/*` |
| Seed/determinism | IMPLEMENTED | FNV-style seed + seeded shuffle in compiler/delivery |
| Explanation/source reference/trace | IMPLEMENTED | GeneratedQuestion fields와 compiler |
| Choice uniqueness/single answer | IMPLEMENTED | `validateGeneratedQuestion` |
| Semantic duplicate | PARTIAL | domain shadow reports/validators; core validator는 exact text 중심 |
| Unsafe inference guard | PARTIAL | prohibited phrases/domain audits가 있으나 universal semantic proof 아님 |
| Numeric validation | PARTIAL | unit/operator generation 및 basic validator; 법적 의미 전체 검증 아님 |
| Formula/relationship/procedure/visual | PARTIAL | canonical taxonomy와 일부 adapters/audits 존재; core 5-template delivery에는 보편 지원 없음 |
| Graph-aware generation | IMPLEMENTED_BUT_LIMITED | approved production graph/context가 있을 때만 사용 가능 |

## 14. Question Type Inventory

### Core / Active-pack taxonomy

`SELECT_TRUE`, `SELECT_FALSE`, `NUMERIC_THRESHOLD`, `CONCEPT_COMPARISON`, `CASE_JUDGMENT` — `src/domain/exam-engine/types/template.ts`; `/study` runtime에서 실제 호출 가능.

### Legal shadow taxonomy

`CATEGORY_COMPARISON`, `CONDITION_SELECTION`, `EXCEPTION_SELECTION`, `RANGE_COMPARISON`, `PENALTY_MATCHING`, `PROCEDURE_ORDER`, `RULE_COMPARISON` — legal shadow/hardening artifacts에서 실제 생성됨. 사용자 runtime에서는 호출되지 않는다.

### Weather shadow taxonomy

`CONCEPT_DEFINITION`, `PHENOMENON_IDENTIFICATION`, `HAZARD_IDENTIFICATION`, `OBSERVATION_INTERPRETATION`, `WEATHER_CODE_MEANING` 및 OperationalImpact 관련 template gap — `question-templates/weather`, weather shadow runtime. 5종은 artifact에서 실제 생성됨.

### Flight taxonomy

Canonical units에 46개 question taxonomy가 분산돼 있으나 current runtime의 직접 명명 지원은 1종, 45종은 template gap이다. 004F/G/H의 51 units만 adapter-required compatible subset으로 판정됐다. 실제 사용자 생성은 0.

Legacy fixed-question taxonomy는 현재 사용자 route에서 동작하지 않는다; boat storage는 deprecated no-op이다.

## 15. Attempt 구조

- 새 engine type `LearnerAttemptEvent`: learnerId, questionId, factId, isCorrect, selectedAnswer, correctAnswer, difficulty, timestamp (`adaptive/learner-state.ts`).
- conceptId, categoryId를 포함한 analytics event 계산 코드도 존재한다.
- 하지만 `/study`는 이 event를 생성/저장하지 않는다. exam session, canonicalKnowledgeId, sourceRevision, packVersion persistence도 없다.
- `src/lib/boat/storage.ts`의 legacy progress/history API는 모두 빈 값/no-op이며 `LegacyLicenseType = "deprecated"`.

따라서 현재 실제 학습기록은 **정적 ID 기반도 Canonical 기반도 아니며, 사용자 runtime에서 영속 기록 자체가 없다**.

## 16. Mastery / 개인화

- 구현 코드: fact-level mastery/confidence/counts/status/nextReview, adaptive priority, weak fact/concept/category analytics, tutor context.
- Tests에서는 정상 동작한다.
- Spaced-review 날짜 필드와 selection 계산은 있으나 scheduling UI/job은 없다.
- `/progress`, `/wrong`, `/analysis`는 placeholder이고 attempt 입력/persistence가 없어 실제 사용자에게는 동작하지 않는다.

판정: 계산 엔진 `IMPLEMENTED_BUT_NOT_CONNECTED`; production mastery `NO`.

## 17. Supabase

- Client/server factory: `src/lib/supabase/client.ts`, `server.ts`; env가 없으면 browser client는 null 처리.
- Schema: profiles, institutions, memberships, uploaded_images, generated_contents, generation_records, usage/subscriptions, `blue_marina_learning_states`.
- Migration: legacy Blue Marina learning state 및 knowledge pack server storage (`knowledge_packs`, `knowledge_pack_active`, review metadata/audit, RPC).
- `SupabaseKnowledgePackRepository`와 cached wrapper 코드는 존재한다.
- 실제 app 사용은 content studio/settings/auth 계열과 admin repository 선택 가능성에 한정된다. `/study` question/attempt/mastery는 Supabase를 읽거나 쓰지 않는다.

| 항목 | 상태 |
|---|---|
| Auth/profile | SCHEMA_EXISTS + CODE_EXISTS; 일부 legacy/dashboard component 사용 |
| Learning state | legacy schema exists; sync code는 명시적 deprecated no-op |
| Attempts/questions/mastery/progress/wrong answers | 새 exam-engine용 schema/persistence NOT_USED 또는 MISSING |
| Knowledge packs/active/review | migration + repository CODE_EXISTS; browser delivery 기본은 local repository |
| Canonical knowledge/source revisions/graph | production schema/persistence MISSING |

## 18. Legacy 코드

- `boat` 참조 파일 57, marine 6, fish 12, yacht 4, KidsAuto/kidsauto 5, blue_marina 2, legacy licenseType 2.
- `src/components/boat/**`는 AppFrame/QuestionCard를 포함해 현재 production path에서 사용되므로 즉시 삭제 불가.
- `/fish`, `/fishing-spots`, `/marine-knowledge`, `/leisure-report`, 일부 license/practice 문구는 실제 사용자 route에 노출된다.
- Supabase의 `blue_marina_learning_states`는 schema만 남고 sync는 deprecated no-op.
- 과거 storage API는 dead/no-op이지만 imports 영향 확인 후 migration해야 한다.
- 따라서 legacy는 단순 dead code가 아니라 UI shell과 route에 혼재한 production contamination이다.

## 19. 드론 시험 도메인 및 UI 연결

- 데이터/domain에는 Drone license, exam blueprint, subject/category/concept 구조가 있다.
- UI는 1~4종 안내 문구와 필기/실기 정보가 흩어져 있으나 exam-engine blueprint/Subject와 화면 선택 상태가 연결되지 않는다.
- `/exam`은 placeholder, `/study`는 seed 5문제 샘플 흐름뿐이다.
- 공통 학과/등급별 시험 세션/실기 평가를 하나의 사용자 runtime으로 구성하는 기능은 없다.

## 20. Source → User 연결 추적

```text
[Artifact pipeline]
Official/local sources
  -> acquisition/ingestion/validation
  -> Legal / Weather / Flight Canonical artifacts
  -> Legal, Weather Shadow runtimes / Flight integration audit
  -X-> unified canonical repository
  -X-> production Active Pack promotion
  -X-> user delivery

[현재 사용자 pipeline]
Browser localStorage Active KnowledgePack
  OR sampleKnowledgePack()
  -> approved AtomicFact
  -> core QuestionTemplate + compileQuestion
  -> validateGeneratedQuestion
  -> /study QuestionCard
  -X-> LearnerAttemptEvent
  -X-> persistence/Supabase
  -X-> mastery/progress UI
```

## 21. Artifact vs Production

| 자산 | 분류 |
|---|---|
| Legal canonical / shadow questions | SHADOW_ONLY + ARTIFACT_ONLY |
| Weather canonical / shadow questions | SHADOW_ONLY + ARTIFACT_ONLY |
| Flight canonical 216 / integration audit | ARTIFACT_ONLY (일부 code/report untracked) |
| 433 AtomicFact local pack | RUNTIME_CONNECTED (browser origin localStorage 의존) |
| 11-relation graph snapshots | RUNTIME_CONNECTED locally, server production 아님 |
| `/study` questions | PRODUCTION_CONNECTED UI, sample/local runtime |
| Adaptive/mastery | TEST_ONLY / IMPLEMENTED_BUT_NOT_CONNECTED |
| Supabase knowledge pack repository | CODE_EXISTS, delivery 기본 path 아님 |
| Boat/marine routes | LEGACY but PRODUCTION_CONNECTED |

## 22. Admin 구현 상태

- `/admin/import`: local/server repository import, overwrite/activate 기능 — **write**.
- `/admin/knowledge-review`: Fact/Graph/Intake/Operations review UI, local/server repository 연계 — **read + write**.
- `/admin/graph-activation`: preflight, activation, benchmark, rollback/reactivation, artifacts — **write**, browser localStorage.
- `/admin/local-recovery`: 특정 pack/fact/graph 복구 — **write**, 강하게 hard-coded된 운영 도구.
- `/admin/autonomous-promotion-canary`: dry-run/phrase/token/snapshot/rollback gated canary — **write**.
- `/admin/autonomous-promotion-batch-plan`: 개발 환경 batch plan — 주로 계획/검토.
- `/admin/drone-source-coverage`: filesystem artifacts를 읽는 coverage UI — 주로 **read-only**, 단 현재 사용자 수정 상태.
- API artifact route는 `work` 하위 JSON을 쓰므로 public production admin API로 노출하기에는 authorization/환경 gate 검토가 필요하다.
- Canonical 통합, unified runtime metrics, source revision lifecycle을 한곳에서 운영하는 admin은 없다.

## 23. 테스트 / 빌드

- Test inventory: 121 files (휴리스틱 분류: unit/domain 88, source 20, runtime 4, canonical 4, UI 4, integration 1). 전용 browser E2E suite는 확인되지 않았다.
- `npm run test -- --maxWorkers=2`: **PASS**, 121 files / 553 tests.
- `npm run build`: **PASS**, Next 15.5.19, 45 routes/pages generated.
- `npm run typecheck`: **PASS**.
- `npm run lint`: **PASS**.
- `git diff --check`: 오류 없음. 기존 여러 파일의 LF→CRLF 경고만 출력.

## 24. 구현 완성도 Matrix

| 영역 | 구현도 | 실제 연결 | 데이터 | Runtime | UI | Production |
|---|---|---|---|---|---|---|
| Source ingestion | ADVANCED_PARTIAL | batch/script | 풍부 | batch | admin 일부 | PARTIAL |
| Legal Knowledge | COMPLETE artifact | shadow | 2,627 | ready with gaps | 없음 | NO |
| Weather Knowledge | ADVANCED_PARTIAL | shadow | 46 | ready with gaps | 없음 | NO |
| Flight Knowledge | ADVANCED_PARTIAL | audit | 216 | 51 compatible | 없음 | NO |
| Canonical | ADVANCED_PARTIAL | 분리됨 | 풍부 | 분리됨 | 없음 | NO |
| Graph | ADVANCED_PARTIAL | local 433-pack | 11 snapshot | local active 가능 | admin | LOCAL_ONLY |
| Runtime Adapter | PARTIAL | domain별 | 있음 | unified 없음 | 없음 | NO |
| Question Compiler | ADVANCED_PARTIAL | `/study` | 5 core types | 동작 | study | PARTIAL |
| Distractor Engine | ADVANCED_PARTIAL | core/shadow | 있음 | 동작 | 간접 | PARTIAL |
| Question Validator | ADVANCED_PARTIAL | core/shadow | reports | 동작 | 간접 | PARTIAL |
| Shadow Runtime | ADVANCED_PARTIAL | Legal/Weather | 있음 | Flight/unified 없음 | 없음 | NO |
| Promotion | PARTIAL | local admin | snapshots | gated | admin | NO |
| Active Pack | PARTIAL | localStorage | 433 | origin별 | study | NO server authority |
| Delivery | PARTIAL | study only | local/sample | 동작 | study | PARTIAL |
| Attempts | EARLY | 없음 | 없음 | types only | 없음 | NO |
| Mastery | PARTIAL | 없음 | test fixtures | calculator | placeholder | NO |
| Supabase | PARTIAL | legacy/admin | 일부 schema | repository | 일부 legacy | NO exam persistence |
| User UI | EARLY | study only | static/legacy | 부분 | 혼재 | NO |
| Admin UI | ADVANCED_PARTIAL | local operations | artifacts | 다수 | 있음 | dev-only 위험 |

## 25. 핵심 Blocker TOP 10

1. **Unified canonical-to-runtime promotion 부재** — Legal/Weather/Flight가 Active Pack 및 delivery에 들어오지 않는다.
2. **서버 authoritative Active Pack/Graph 부재** — origin별 localStorage가 상태 source라 일관성과 복구가 불안정하다.
3. **Flight runtime/template gap** — 216 중 compatible subset 51, template taxonomy 45 gap, fatal blocker 1.
4. **사용자 시험 flow 미구현** — `/exam`, `/random`, blueprint-based 40문제 session이 placeholder다.
5. **Attempt persistence 부재** — 실제 답안/세션/pack/source/canonical trace가 저장되지 않는다.
6. **Mastery UI/runtime 연결 부재** — adaptive 계산기는 있으나 입력과 persistence가 없다.
7. **Legacy maritime contamination** — production routes와 shell에 보트/낚시/해양 내용이 남는다.
8. **Domain별 question contract 불일치** — core 5종과 Legal/Weather/Flight taxonomy가 통합되지 않았다.
9. **Production authorization/operations 경계 미완성** — mutation 가능한 local admin 도구와 artifact API가 dev 중심이다.
10. **Artifact/repository/browser state divergence** — approved 7/26/30 등 서로 다른 snapshot을 하나의 현재 상태처럼 사용할 위험이 있다.

## 26. DO_NOT_REOPEN

- Frozen Flight batches 004A~H의 근거 없는 재생성/ID 재발급.
- Legal 2,627 consolidation과 이미 완료된 hardening을 단순 숫자 증가 목적으로 재실행.
- Weather 46 canonical 및 30-question shadow benchmark의 반복 실행.
- Flight 216 reconciliation/duplicate/contradiction audit의 동일 조건 반복.
- 관계 수, canary 수치, 문제 수만 맞추기 위한 heuristic tuning.
- source 근거 없이 gaps를 자동 보충하거나 shadow 결과를 active로 위조.

## 27. 다음 개발단계

1. 서버 authoritative pack/canonical/graph version source와 environment boundary를 확정한다.
2. Legal/Weather/Flight를 공통 immutable runtime contract로 매핑하고 provenance/version을 보존한다.
3. Flight fatal blocker 1과 runtime gap 2, 필요한 template subset을 우선 해소한다.
4. Unified shadow runtime에서 세 domain을 함께 compile/validate하고 deterministic regression baseline을 고정한다.
5. Promotion gate를 server-side audit/rollback과 연결한 뒤 새 canonical을 versioned Active Pack 후보로 만든다.
6. `/exam`에 blueprint-based session과 40문제 selection을 연결한다.
7. Attempt schema를 generatedQuestionId + canonicalKnowledgeId/factId + sourceRevision + packVersion으로 확정하고 Supabase에 영속화한다.
8. adaptive/mastery/progress/wrong UI를 persisted attempts에 연결한다.
9. maritime legacy route/content를 분리 저장소로 이동하거나 Drone navigation에서 제거한다.
10. 브라우저 E2E로 source trace → question → attempt → mastery 전체 경로를 검증한다.

## 28. 현재 Architecture Diagram

```text
[현재 구현]
Local Active Pack (433 AtomicFacts, browser origin)
  -> Core compiler (5 question types)
  -> Core validator
  -> /study

[부분 구현]
Official/local Source
  -> acquisition -> ingestion -> validation
  -> Legal Canonical 2,627 -> Legal Shadow/Hardening
  -> Weather Canonical 46 -> Weather Shadow
  -> Flight Canonical 216 -> Integration Audit (51 runtime-compatible)
  -> domain adapters / graph / quality reports

[미구현 연결]
Legal + Weather + Flight Canonical
  -X-> Unified Runtime
  -X-> Versioned server Active Pack
  -X-> Exam session / selection UI
  -X-> Persisted Attempt
  -X-> Mastery / progress / wrong-answer UI
```

## 29. 핵심 질문 15개

1. **공식 Source 자동 수집 시스템이 존재하는가? — PARTIAL.** acquisition/registry/validator는 있으나 지속 운영 scheduler와 end-to-end 자동 승격은 없다.
2. **Legal Canonical은 구축됐는가? — YES.** 2,627 units 및 checksum/artifacts가 존재한다.
3. **Weather Canonical은 구축됐는가? — YES.** 46 units(knowledge 35 + relations 11)가 존재한다.
4. **Flight Theory Canonical 216은 실제 존재하는가? — YES.** 8 batch 합계와 index가 216으로 일치한다.
5. **Flight Theory Integration Audit은 이미 실행됐는가? — YES.** `execution.json=COMPLETED`; 단 실행 코드 일부는 untracked다.
6. **Flight Theory Shadow Runtime은 존재하는가? — NO.** candidate map/readiness audit은 있으나 독립 실행 shadow runtime/문제 artifact는 없다.
7. **Legal+Weather+Flight 통합 Runtime은 존재하는가? — NO.** domain별 결과만 있다.
8. **검증된 문제 생성기는 존재하는가? — YES.** core compiler/validator 및 Legal/Weather shadow generators가 있다.
9. **새 문제엔진이 실제 사용자 UI와 연결됐는가? — PARTIAL.** `/study`만 local Active Pack/sample로 연결된다.
10. **Active Pack에 새 Canonical이 승격됐는가? — NO.** Legal/Weather/Flight canonical은 active pack 밖이다.
11. **Attempt가 Canonical Knowledge와 연결되는가? — NO.** 실제 attempt 생성/저장이 없다.
12. **Mastery가 실제로 동작하는가? — NO.** 계산 코드/tests만 있고 사용자 flow 연결이 없다.
13. **Supabase가 새 exam-engine을 영속화하는가? — NO.** pack repository code는 있으나 question/attempt/mastery production persistence는 없다.
14. **Legacy boat/general 구조가 아직 production path에 남아 있는가? — YES.** AppFrame/QuestionCard와 다수 해양 route가 실제 app에 있다.
15. **지금 바로 실제 Drone Pass 시험앱으로 서비스 가능한가? — NO.** 학습 demo는 가능하지만 시험, persistence, mastery, canonical promotion 및 legacy 분리가 미완료다.

## 결론

**현재 Drone Pass는 검증된 지식·그래프·문제 엔진 artifact가 풍부하지만 사용자 production runtime과 영속 학습 흐름이 끊긴 고도화된 통합 전 단계이며, 다음 최우선 작업은 Legal·Weather·Flight Canonical을 서버 권위의 versioned unified runtime/Active Pack으로 연결하는 것이다.**
