# Canary Promotion Report

## Second Canary Dry-Run

- 첫 Canary `AF-063`·`AF-064`는 approved 28로 재시작 후에도 유지됐다.
- 다음 최소 AND 단위는 `AF-065`·`AF-066` (`GRP-MC-C3-RANGE`)이다.
- AF-061은 현재 Batch에 companion AF-062가 없어 제외했고, AF-069 이후 OR 그룹은 현재 Canary 안전 범위에서 제외했다.
- 기대 전환은 approved 28→30이며 실제 Apply는 사용자 확인 전까지 실행하지 않는다.

## Phase 68.2 Apply 준비

- 실제 Apply 경로는 `http://localhost:4450`에서만 열리며 Pack 433 / approved 26 / active Graph 11 / AF-063·AF-064 선택 / 최신 Dry-run PASS를 다시 확인한다.
- 사용자가 `APPLY AF-063 AF-064`와 현재 브라우저 메모리의 일회용 토큰을 모두 직접 입력해야 한다. 토큰은 저장하거나 로그에 남기지 않는다.
- 상태 변경 전 전체 Pack 및 Graph payload를 `work/canary-promotion/canary-before-{timestamp}.json`으로 저장하고, 저장 후 repository 재조회 및 compiler/Graph 검증을 수행한다.
- 실패 시 변경 전 localStorage 원문을 복구한다. 현재 판정은 `READY_FOR_USER_CONFIRMATION`이며 실제 Apply·새로고침·서버 재시작 지속성은 아직 실행하지 않았다.
- 2026-08-03 브라우저 확인: `http://localhost:4450`에서 Pack 433 / approved 26 / AF-063·AF-064 / active Graph 11을 확인했고 Dry-run은 PASS했다. 사용자 확인값 미입력 상태에서 Apply는 비활성화되며 데이터 변경은 없었다.

## 실행 판정

- 실행 모드: DRY_RUN
- 실제 CANARY 토큰: 제공되지 않음
- 최종 판정: `CANARY_BLOCKED` (실제 적용만 차단, dry-run 구조 검증 완료)
- 실제 AtomicFact status 변경: 0

## Canary 선택

- Batch 1의 14개 후보는 모두 `COMPOSITE_FACT`이며 `standaloneQuestionAllowed=false`이다.
- 단독 Fact 승격은 선택기에서 차단한다.
- 최초 최소 완결 그룹: `AF-063`, `AF-064` (`GRP-MC-C2-RANGE`, AND)
- Canary unit: `MINIMAL_ATOMIC_GROUP`
- 예상 approved: 26 → 28
- 예상 문제 증가: 최대 +2. 실제 승격 후 compiler 검증 전에는 확정하지 않는다.

## Preflight / Snapshot / Rollback

- localhost origin, Pack ID, Fact 433, approved 26, draft 상태, strict gate, active Graph, rollback 가능 여부를 repository 재조회로 검사한다.
- 적용 직전 `work/canary-promotion/canary-before-{timestamp}.json` 저장이 성공해야 한다.
- Pack 불변식, audit 저장 또는 persistence 검증이 실패하면 localStorage 원본 문자열을 즉시 복원한다.
- active Graph Version과 relation은 읽기 전용이며 변경하지 않는다.

## UI

- `/admin/autonomous-promotion-canary`
- Dry-run PASS 후에만 Apply가 열리며, 현재 브라우저 세션에서 생성한 일회성 토큰을 사용자가 직접 입력해야 한다.
- 이번 실행에서는 토큰을 입력하거나 Apply를 수행하지 않았다.

## 실제 데이터 영향

- AtomicFact / KnowledgePack / Graph / Question DB / Supabase / 기존 audit 변경: 0
- Canary 통과 후에도 나머지 Batch 자동 적용 기능은 제공하지 않는다.

## Phase 68.1 Origin Recovery

- Pack 저장 키: `drone-pass:exam-engine:knowledge-packs`
- ACTIVE alias: `drone-pass:exam-engine:knowledge-packs:active`
- `PACK_MISSING`은 현재 origin의 Pack index/ACTIVE alias에 대상 Pack이 없을 때 발생한다.
- 화면은 Pack 유무와 관계없이 mount 직후 `window.location.origin`을 표시하며 `PACK_FOUND`, `PACK_MISSING`, `STORAGE_ERROR`를 구분한다.
- 다른 origin의 localStorage는 읽지 않는다. `localhost:3000`, `localhost:3001`, `localhost:4450`, `127.0.0.1:4450`은 확인 링크만 제공한다.
- 복구는 기존 origin에서 사용자 다운로드한 checksum 포함 artifact를 현재 origin에서 명시적으로 선택·확인하는 경우에만 수행한다.
- Pack ID, Fact 433, approved 26, active Graph version, relation 11, checksum 및 KnowledgePack schema가 모두 통과하기 전에는 저장하지 않는다.
- Phase 68.1에서는 Apply Canary를 항상 비활성화한다.
