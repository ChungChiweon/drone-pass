# Local Graph Version Activation

## 2026-08-01 Local Activation Implementation

Activation support was added for the repository-persisted candidate:

- versionId: `kg-candidate-kr-drone-license:mrm0omvd-20260730000000000`
- expected packId: `kr-drone-license:mrm0omvd`
- expected AtomicFact count: `433`
- expected approved Fact count: `26`
- expected approved relation count: `11`
- expected contentHash: `fnv1a-3cac6cec`

The activation workflow is available at:

- `http://localhost:4450/admin/graph-activation`

The page performs the following sequence only for `http://localhost:4450`:

1. Reloads the candidate from the local graph repository.
2. Verifies draft status, relation count, content hash, relation IDs, approved relation statuses, approved dependency facts, and absence of an active graph.
3. Saves a pre-activation snapshot under `work/graph-version-snapshots/`.
4. Activates the candidate version and writes `GRAPH_VERSION_ACTIVATED` audit.
5. Runs runtime Graph-aware A/B using `repository.getActiveGraph()`.
6. Performs rollback dry-run.
7. Rolls back to no active graph and writes `GRAPH_VERSION_ROLLED_BACK` audit.
8. Confirms runtime graph usage returns to zero.
9. Reactivates the same candidate and writes a second activation audit.
10. Saves runtime/final artifacts under `work/graph-version-snapshots/`.

Implemented files:

- `src/domain/exam-engine/knowledge-graph/graph-version-activation-service.ts`
- `src/domain/exam-engine/knowledge-graph/graph-version-activation-service.test.ts`
- `src/app/admin/graph-activation/page.tsx`
- `src/app/api/admin/local-recovery-artifact/route.ts`
- `src/domain/exam-engine/knowledge-graph/local-knowledge-graph-repository.ts`
- `src/domain/exam-engine/knowledge-graph/graph-versioning.ts`

### Actual Browser Execution Status

Execution was not applied to production, Supabase, or any deployed server.

The connected in-app browser could open `http://localhost:4450/admin/graph-activation`, but its page environment reported no usable `window.localStorage`. The page therefore showed no ACTIVE Pack state (`null`). Chrome and external browser connector instances were not available in the current Codex session.

Because the target `localhost:4450` localStorage that contains the 26-approved Pack and draft candidate was not reachable from the connected browser, activation was not executed. Existing localStorage data, Pack data, relation review status, Question DB, Supabase, and existing audit records were left unchanged.

Current status for this run:

- activation snapshot: not created in browser because precondition data was unreachable
- activation audit: not created
- active versionId: unchanged by this run
- active relation count: unchanged by this run
- rollback: not executed
- reactivation: not executed
- final verdict: `BLOCKED_UNTIL_TARGET_BROWSER_LOCALSTORAGE_IS_CONNECTED`

### Verification

- `npm run test`: passed, 51 files / 233 tests
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed

### Supabase Status

Supabase was not changed. No DB migration, remote write, production alias change, or deployment was performed.

## 2026-08-01 Button Handling Fix And Activation Verification

The `/admin/graph-activation` button appeared unresponsive because the original UI had a single long-running button and did not expose click receipt, current step, disabled reasons, preflight errors, or final result in a structured visible state panel. Failures could be collapsed into one status line, and there was no separate dry-run/preflight step to prove that the click handler had fired before attempting activation.

Fixes:

- Split controls into `Run Preflight` and `Activate & Verify`.
- Added visible state fields: `clickReceivedAt`, `currentStep`, `isRunning`, `lastError`, `lastResult`, and `preflight`.
- Added step progression: `IDLE`, `CLICK_RECEIVED`, `PRECHECK_RUNNING`, `ACTIVATING`, `BENCHMARK_RUNNING`, `ROLLING_BACK`, `REACTIVATING`, `COMPLETED`, `FAILED`.
- Added visible disabled reasons before activation.
- Added localStorage read/write preflight.
- Wrapped handlers in `try/catch/finally`-equivalent state transitions and visible error reporting.
- Re-read ACTIVE Pack, candidate version, graph relations, and active graph from repositories on click instead of trusting stale React state.
- Kept duplicate clicks blocked while `isRunning=true`.

Browser verification on `http://localhost:4450/admin/graph-activation`:

- Initial state: `Activate & Verify` disabled with reason `Run Preflight first`.
- `Run Preflight` click: `clickReceivedAt` populated and preflight completed with `PASS`.
- `Activate & Verify` click: immediate visible step changed to `ACTIVATING`.
- Activation round-trip completed.

Final active state:

- origin: `http://localhost:4450`
- packId: `kr-drone-license:mrm0omvd`
- AtomicFact: `433`
- approved Fact: `26`
- approved relation: `11`
- held relation: `1`
- activeVersionId: `kg-candidate-kr-drone-license:mrm0omvd-20260730000000000`
- activeRelations: `11`
- candidateStatus: `active`
- candidate contentHash: `fnv1a-3cac6cec`
- versionAuditCount: `3`

Activation audit:

- activation audit: `KGV-AUD-ee0ce969-4df2-40b0-b3e8-e2ebbef07d24`
- rollback audit: `KGV-AUD-654ccdcd-157d-4959-9a75-048445b6ce8f`
- reactivation audit: `KGV-AUD-b7b588b2-a83b-4f1b-94bb-f9e6b6a944a2`

Runtime A/B after activation:

| Metric | Classic | Graph-aware |
| --- | ---: | ---: |
| Generated | 26 | 26 |
| Average quality | 0.6719 | 0.7415 |
| Average GraphUsageScore | 0 | 0.3231 |
| Graph-backed distractors | 0 | 27 |
| Used relations | 0 | 11 |
| Source fact coverage | - | 100% |
| Duplicate distractors | - | 0 |
| Unique-answer failures | - | 0 |
| Unsafe distractors | - | 0 |

Rollback verification:

- Rollback dry-run predicted `activeVersionId=null`, `activeRelations=0`, `candidateStatus=draft`.
- Actual rollback produced GraphUsageScore `0` and graph-backed distractors `0`.
- Re-activation restored the candidate to active with `activeRelations=11`.

Persistence:

- Browser reload preserved active graph state.
- Development server restart preserved active graph state for the same origin.

Artifacts:

- Pre-activation snapshot: `work/graph-version-snapshots/graph-activation-before-1785567220456.json`
- Runtime benchmark: `work/graph-version-snapshots/runtime-active-graph-benchmark-20260801.json`
- Final state: `work/graph-version-snapshots/graph-activation-final-state-20260801.json`

Verification:

- `npm run test`: passed, 52 files / 238 tests
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed

Supabase, DB migrations, deployed servers, production aliases, AtomicFact body/sourceReferences, approved Fact statuses, relation review statuses, Question DB, and existing audit records were not modified.

## 2026-08-01 RSC Import Boundary Fix

Repeated development runtime failures with:

- `__webpack_modules__[moduleId] is not a function`

were traced to the `/admin/graph-activation` route entry being a large Client Component. The route `page.tsx` directly imported browser/localStorage repositories, graph activation code, question compiler, graph-aware generation, scoring, and benchmark utilities. Production build could pass, but the Next dev RSC module graph was more fragile during HMR and route reloads because the route entry mixed server route discovery with a broad client/browser import graph.

Structural changes:

- `src/app/admin/graph-activation/page.tsx` is now a thin Server Component wrapper.
- `src/app/admin/graph-activation/graph-activation-client.tsx` owns `"use client"`, UI state, event handlers, localStorage reads, runtime benchmark, and fetch-based artifact writes.
- `src/domain/exam-engine/knowledge-graph/graph-version-activation-types.ts` isolates activation repository/type contracts.
- `src/domain/exam-engine/knowledge-graph/graph-version-activation-service.ts` no longer imports the browser localStorage repository.
- `src/domain/exam-engine/knowledge-graph/graph-version-activation-browser-service.ts` is the browser-facing activation import used by the Client Component.
- Graph activation files now avoid the `@/domain/exam-engine/types` barrel and import concrete type files directly.
- `eslint.config.mjs` excludes `.next*/**` so temporary Next build-output backups are not linted.

Import classification:

| File | Classification | Notes |
| --- | --- | --- |
| `src/app/admin/graph-activation/page.tsx` | server wrapper | Imports only `GraphActivationClient`. No localStorage/service/browser repository import. |
| `src/app/admin/graph-activation/graph-activation-client.tsx` | browser-safe client | Uses React state, localStorage repositories, runtime benchmark, and `fetch("/api/admin/local-recovery-artifact")`. No `fs`, `path`, `next/server`, route import, or top-level browser side effect. |
| `graph-version-activation-service.ts` | shared pure domain | No `window`, `localStorage`, `fs`, `path`, or Next imports. |
| `graph-version-activation-types.ts` | shared pure type/domain | Type contracts only. |
| `graph-version-activation-browser-service.ts` | browser-facing adapter | Re-exports pure activation functions/types for client import clarity. |
| `graph-versioning.ts` | shared pure type/domain | Types only. |
| `local-knowledge-graph-repository.ts` | browser/localStorage repository | Uses `window.localStorage` only inside read/write functions, not at module top-level. |
| `local-recovery-artifact/route.ts` | server-only API route | Imports `node:fs/promises`, `node:path`, and `next/server`; not imported by client. |

Boundary tests added:

- `page.tsx` does not import browser-only services or repositories.
- Client component does not import server-only modules.
- API route does not import browser activation code.
- Activation core does not reference browser/Next/server-only APIs.
- Client top-level declarations do not perform `window`, `localStorage`, `fetch`, or `Date` work.

Runtime verification:

- `.next` recursive deletion was blocked by tool policy, so the stale `.next` folder was recoverably moved to `.next-disabled-20260801-graph-activation`; Next created a fresh `.next`.
- Dev server restarted on `http://localhost:4450`.
- `/admin/graph-activation` initial load: passed with no browser console errors.
- Refresh loop: 10/10 successful, no webpack module error.
- Admin page round-trip via `/admin/knowledge-review`: 5/5 successful, no webpack module error.
- Dev server restart and reconnect: successful, no webpack module error.
- HMR check after changing one UI status string: successful, no webpack module error.
- `Run Preflight` after HMR: click event received and visible; activation correctly blocked because the candidate is already active.

Preserved browser state:

- Pack ID: `kr-drone-license:mrm0omvd`
- AtomicFact: `433`
- approved Fact: `26`
- approved relation: `11`
- held relation: `1`
- activeVersionId: `kg-candidate-kr-drone-license:mrm0omvd-20260730000000000`
- activeRelations: `11`
- candidateStatus: `active`
- contentHash: `fnv1a-3cac6cec`
- versionAuditCount: `3`

Verification:

- `npm run test`: passed, 53 files / 243 tests
- `npm run typecheck`: passed
- `npm run lint`: passed
- `npm run build`: passed

No localStorage reset, Graph state mutation, Supabase change, deployment, relation review status change, or existing audit modification was performed during this structural fix.

검증 시각: 2026-07-31 (Asia/Seoul)

최종 판정: **BLOCKED**

## 활성화 전 실제 상태

localhost `http://localhost:4450/admin/knowledge-review`의 현재 브라우저 세션을 읽기 전용으로 확인했다.

| 항목 | 기대값 | 실제값 | 결과 |
| --- | ---: | ---: | --- |
| AtomicFact | 433 | 433 | PASS |
| approved AtomicFact | 26 | 17 | **FAIL** |
| approved Graph relation | 11 | 11 | PASS |
| active Graph Version | 없음 | 없음 | PASS |
| production activeRelations | 0 | 0 | PASS |
| Graph Review Queue | - | 668 | INFO |
| Graph review audit | - | 14 | INFO |

## 후보 Version 확인

- 요구된 candidate versionId: `kg-candidate-kr-drone-license:mrm0omvd-20260730000000000`
- Graph Version 선택 목록 실제 내용: `Activate draft...`
- 지정 candidate 존재 여부: **없음**
- candidate 전체 payload 확인: 불가
- candidate relationCount=11 확인: 불가
- contentHash 재계산 및 비교: 불가

## 사전 검증 결과

다음 필수 조건이 실패했다.

1. approved AtomicFact가 26이 아니라 17이다.
2. 지정 candidate Graph Version이 현재 localhost localStorage에 존재하지 않는다.
3. 따라서 relation 양쪽 Fact가 모두 approved인지 현재 활성화 입력 기준으로 보장할 수 없다.
4. candidate payload가 없어 contentHash를 재계산할 수 없다.

사용자 지시의 “하나라도 실패하면 활성화 중단” 조건에 따라 활성화를 수행하지 않았다.

## 수행하지 않은 작업

- 활성화 전 스냅샷 파일 생성: 후보 payload 부재로 생성하지 않음
- Graph Version 활성화: 수행하지 않음
- activation audit: 생성하지 않음
- runtime Graph-aware A/B: active version이 없어 수행하지 않음
- rollback dry-run 및 실제 rollback: 활성화가 없으므로 수행하지 않음
- 재활성화: 수행하지 않음

## 최종 로컬 상태

- active Graph Version: 없음
- activeRelations: 0
- approved Graph relation: 11
- approved AtomicFact: 17
- AtomicFact: 433
- Graph review audit raw count: 14

검증 과정에서 AtomicFact, relation review status, Knowledge Pack, Question DB, 기존 audit를 수정하지 않았다.

## 복구에 필요한 조건

다음 실행 전 동일한 localhost 브라우저 origin에 아래 상태가 먼저 복구되어야 한다.

1. approved AtomicFact 26
2. 지정 candidate version payload
3. candidate relationIds 11개
4. candidate contentHash
5. candidate benchmark 판정 `READY_FOR_ACTIVATION`

복구 후 사전 검증을 처음부터 다시 수행해야 한다. 기존 benchmark 문서만으로 현재 localStorage 후보를 대체하거나 재생성하지 않는다.

## Supabase 및 배포

- Supabase 변경 없음
- DB migration 없음
- 배포 환경 변경 없음
- production 서버 alias 변경 없음

## 2026-07-31 Origin 조사 및 복구 시도

### 조사한 origin

| Origin | 접속 결과 | Drone Pack 상태 |
| --- | --- | --- |
| `http://localhost:3000` | 다른 앱의 404 | 조회 불가 |
| `http://localhost:3001` | 연결 거부 | 개발 서버 없음 |
| `http://localhost:4450` | Drone Pass 관리자 화면 | AtomicFact 433 / approved 17 |
| `http://127.0.0.1:3000` | 다른 앱의 404 | 조회 불가 |
| `http://127.0.0.1:3001` | 연결 거부 | 개발 서버 없음 |
| `http://127.0.0.1:4450` | Drone Pass 접근 확인 화면 | Supabase access check에서 Pack 로드 전 대기 |

`localhost:4450`과 `127.0.0.1:4450`은 포트가 같아도 서로 다른 origin이므로 localStorage를 공유하지 않는다.

### approved 26 발견 여부

approved 26 상태는 조사한 실행 origin에서 발견되지 않았다.

- `localhost:4450`: approved 17
- 확인 가능한 work export: approved 7 또는 17
- 승인 대상 9개(`AF-223`, `AF-224`, `AF-277`, `AF-278`, `AF-297`, `AF-298`, `AF-311`, `AF-312`, `AF-319`)가 approved인 433개 Pack export: 없음

따라서 이전 작업의 approved 26 상태는 현재 localStorage 또는 export에 영속 저장된 상태로 확인되지 않았다. 사용자 지시에 따라 9개 Fact를 임의로 재승인하거나 status만 직접 변경하지 않았다.

### Candidate payload가 없던 원인

candidate는 `graph-version-candidate-benchmark.test.ts`의 benchmark 실행 중 메모리 객체로 생성되었고 결과 문서만 작성되었다. `LocalKnowledgeGraphPersistenceRepository.saveVersion()`을 호출하는 명시적 저장 단계가 없었으므로 `dronepass.knowledgeGraphVersions`에 저장되지 않았다.

기대 candidate:

- versionId: `kg-candidate-kr-drone-license:mrm0omvd-20260730000000000`
- relationCount: 11
- contentHash: `fnv1a-3cac6cec`

현재 candidate 저장의 선행조건인 approved AtomicFact 26이 충족되지 않으므로 benchmark 산출물을 localStorage에 복원하지 않았다.

### 복구 전 상태 기록

`work/graph-version-snapshots/origin-recovery-before-20260731-014545.json`

이 파일에는 민감정보나 Pack 본문을 넣지 않고 origin, 관련 storage key 이름, Fact/Relation/Version 요약만 기록했다.

### 관리자 UI 보강

관리자 화면 상단에 다음 읽기 전용 정보를 표시하도록 보강했다.

- current origin
- ACTIVE Pack ID
- approved Fact count
- draft Graph Version count
- active Graph Version

또한 호스트명 또는 포트가 다른 origin의 localStorage는 자동 공유되지 않는다는 경고를 표시한다. 자동 복사·자동 동기화 기능은 추가하지 않았다.

### 최종 상태와 재시도 판정

- AtomicFact: 433
- approved AtomicFact: 17
- approved Graph relation: 11
- candidate version: 없음
- active Graph Version: 없음
- activeRelations: 0
- 복구 mutation: 없음

활성화 재시도 가능 여부: **BLOCKED**

approved 26 상태가 포함된 실제 Pack export 또는 동일 origin의 영속 상태를 먼저 확보해야 한다. 그 후 candidate의 11개 relation, 양쪽 approved Fact, hash를 재검증하고 draft 저장해야 활성화 사전 검증을 다시 시작할 수 있다.

## 2026-07-31 승인 복구 재확인

동일 origin의 최신 `LocalKnowledgePackRepository`를 별도 복구 화면에서 다시 읽은 결과, 실제 저장소 상태는 다음과 같았다.

- origin: `http://localhost:4450`
- Pack ID: `kr-drone-license:mrm0omvd`
- AtomicFact: 433
- approved AtomicFact: **26**
- 지정 9개 Fact: 모두 `approved`
- Fact audit: 9
- approved Graph relation: 11
- held relation: 1
- Graph review audit: 14
- active Graph Version: 없음
- activeRelations: 0

이전 관리자 화면의 approved 17 표시는 localStorage 값이 아니라 오래 열린 React 탭의 메모리 상태였다. 9개의 승인은 실제 localStorage repository에 이미 영속돼 있었으므로 중복 audit를 막기 위해 재승인하지 않았다.

### 복구 실행 도구

localhost 전용 명시적 복구 화면을 추가했다.

- `/admin/local-recovery`
- 기존 17/draft 상태이면 9건을 각각 `approvalMode=single`로 처리한다.
- 이미 26/approved 상태이면 승인 호출을 no-op으로 건너뛴다.
- Pack export와 draft candidate를 저장하기 전 모든 선행조건을 다시 확인한다.
- production 환경에서는 artifact 저장 API가 차단된다.

브라우저 확인창 제어가 응답 대기 상태에 걸려 artifact 저장 및 candidate `saveVersion()` 단계는 이 실행에서 완료되지 않았다. 따라서 candidate와 active alias는 모두 기존 상태를 유지한다.

### 현재 판정

- approved 26 영속 상태: 확인 완료
- 신규 중복 Fact audit: 생성하지 않음
- 26-approved export: 미생성
- candidate repository 저장: 미실행
- Graph Version 활성화: 미실행
- activeRelations: 0
- 활성화 재시도: candidate 저장 및 repository 재로드 검증 전까지 **BLOCKED**

## 2026-08-01 Candidate Repository Persistence

localhost `http://localhost:4450`의 실제 local repository에서 다음 상태를 재확인했다.

- Pack ID: `kr-drone-license:mrm0omvd`
- AtomicFact: 433
- approved Fact: 26
- approved Graph relation: 11
- held relation: 1
- Fact audit: 9
- Graph review audit: 14
- active Graph Version: 없음
- activeRelations: 0

### 저장 전 snapshot

`work/graph-version-snapshots/candidate-save-before-20260731-021000.json`

후보가 최초 저장되기 전에 기록된 repository 상태를 보존한 snapshot이다. 당시 graph version 목록은 비어 있고 active version도 없었다.

### saveVersion 및 재조회

`LocalKnowledgeGraphPersistenceRepository.saveVersion()`으로 다음 candidate를 저장했다.

- versionId: `kg-candidate-kr-drone-license:mrm0omvd-20260730000000000`
- status: `draft`
- relationCount: 11
- contentHash: `fnv1a-3cac6cec`
- createdAt: `2026-07-30T00:00:00.000Z`
- createdBy: `local-admin`
- benchmarkSummary: 저장됨

저장 직후 `getVersion(versionId)`으로 payload를 다시 읽어 versionId, relationIds, relationCount, contentHash, status를 대조했다. 동일 version을 다시 저장해도 version 배열에는 한 건만 유지된다.

브라우저 새로고침 후에도 candidate가 draft로 표시됐고 active Graph Version은 없으며 activeRelations는 0이었다.

### 26-approved export

`work/exports/prod-active-export-20260731-26approved.json`

- AtomicFact: 433
- approved: 26
- Category: 32
- Concept: 116
- 검수 대상 9개 포함
- sourceReference 총 연결 수: 481
- validation errors: 0

### Repository payload 기반 A/B

입력 candidate는 benchmark 내부에서 새로 만들지 않고 `getVersion()` 결과를 저장한 repository artifact에서 읽었다.

| Metric | Classic | Graph-aware |
| --- | ---: | ---: |
| 생성 성공 | 26/26 | 26/26 |
| 평균 QuestionQualityScore | 0.6719 | 0.7415 |
| 평균 GraphUsageScore | - | 0.3231 |
| graph-backed distractor | - | 27 |
| sourceFactIds 포함률 | - | 100% |
| 오답 중복 | - | 0 |
| 정답 유일성 실패 | - | 0 |
| unsafe distractor | - | 0 |

실제 활용 relation은 11/11이다. 결과 artifact는 `work/graph-version-snapshots/repository-candidate-benchmark.json`이다.

### 최종 판정

**READY_FOR_ACTIVATION**

이번 단계에서는 candidate 저장과 검증만 수행했다. active alias, production graph, Fact status, relation review status, Question DB 및 Supabase는 변경하지 않았다.
