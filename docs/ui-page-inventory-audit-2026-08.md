# Drone Pass UI Page Inventory Audit — 2026-08

> 기준: 현재 `src/app`, 2026-08-23 production build route table, Architecture Reference v1.0, current implementation audit
> 방법: route 수와 재사용 가능한 디자인 template 수를 분리했다. Legacy flag와 Placeholder flag는 route category와 중첩될 수 있다.

## 1. 핵심 숫자

| Metric | Count | 산정 기준 |
|---|---:|---|
| TOTAL_ROUTE_COUNT | **45** | Next production build: page 42 + API 2 + framework `_not-found` 1 |
| SRC_APP_ROUTE_COUNT | **44** | `page.tsx` 42 + `route.ts` 2 |
| VISUAL_PAGE_ROUTE_COUNT | **42** | 실제 page component가 있는 route |
| USER_ROUTE_COUNT | **35** | visual page 42 - admin 7 |
| ADMIN_ROUTE_COUNT | **7** | `/admin/**` page route |
| API_OR_NON_VISUAL_COUNT | **2** | API route 2; `_not-found`는 framework-generated |
| LEGACY_ROUTE_COUNT | **17** | boat/fishing/marine/수상레저 계보 또는 오염 flag |
| PLACEHOLDER_ROUTE_COUNT | **10** | 화면 전체가 준비중/재구성 예정인 route |
| UNIQUE_USER_UI_TEMPLATE_COUNT | **15** | 최종 Drone 사용자 기능 기준 template family; legacy-only는 제외 |
| UNIQUE_ADMIN_TEMPLATE_COUNT | **5** | 관리자 redesign은 2차 범위 |

### 디자인 레퍼런스 이미지 수

- **MINIMUM_REFERENCE_SET: 6장**
- **RECOMMENDED_REFERENCE_SET: 10장**
- **COMPLETE_REFERENCE_SET: 15장**

따라서 route 45개에 이미지 45장이 필요한 것이 아니다. 사용자용 UI 전체를 안정적으로 redesign하는 실무 기준은 **10장**이다.

## 2. Route/build 교차검증

- `src/app`에는 42개의 `page.tsx`와 2개의 `route.ts`가 있다.
- production build는 위 44개에 framework `_not-found`를 추가해 45개 항목을 출력한다.
- 별도 nested `layout.tsx`, `loading.tsx`, `error.tsx`는 없다. 모든 visual route는 `src/app/layout.tsx`만 공유한다.
- redirect route는 없다.
- Dynamic page는 `/coming-soon`(query 기반)과 `/theory/[tag]`(path parameter)이다.
- `/admin/autonomous-promotion-batch-plan`, `/admin/autonomous-promotion-canary`는 production에서 `notFound()`를 반환하는 development-only visual route다.
- API route는 `/api/admin/local-recovery-artifact`, `/api/sea-info/tide`이며 이미지가 필요 없다.

## 3. Category 정의 및 카운트 해석

분류는 다음처럼 사용한다.

- `CORE_USER_UI`: Drone 학습·시험의 핵심 흐름.
- `SECONDARY_USER_UI`: 정보, 사전, 도움말, 정책 등 보조 화면.
- `ADMIN_UI`: 운영/검수/복구 화면.
- `LEGACY_UI`: boat/yacht/fishing/marine/general 계보. `DESIGN_REFERENCE_NOT_REQUIRED`.
- `PLACEHOLDER_UI`: route는 있으나 기능 화면이 미완성. 핵심 기능이면 `PLACEHOLDER_BUT_DESIGN_REQUIRED`.
- `INTERNAL_OR_UTILITY`: coming-soon, map test, dev-only 도구.
- `API_OR_NON_VISUAL`: API.

Legacy와 Placeholder는 별도 flag이므로 합계 45에 단순 합산하면 안 된다. 예를 들어 `/exam`은 사용자 route이면서 placeholder이고, `/practice/course`는 사용자 visual route이면서 legacy-contaminated다.

## 4. 공통 Layout과 재사용 Component

### 전역

- `src/app/layout.tsx`: Inter font, metadata, viewport, PWA registration.
- `src/components/PwaRegister.tsx`: service worker 등록.

### 사용자 shell

- `src/components/boat/AppFrame.tsx`: sticky header, desktop nav, mobile bottom nav, responsive content width, desktop footer.
- `src/components/boat/BottomNav.tsx`: mobile 6-tab navigation.
- `src/components/boat/portal/PortalShell.tsx`: hero + cards 기반 안내 portal.
- `src/components/boat/QuestionCard.tsx`: stem, 4 choices, answer feedback, explanation을 같은 card state로 처리.
- `HomeLanding`, `PortalCard`, 반복 rounded card/grid/filter 패턴이 여러 route에서 재사용된다.

### 중복 이미지가 필요 없는 이유

- Header/footer/mobile nav는 모든 사용자 reference에 반복해서 별도 이미지로 받을 필요가 없다. Home 또는 Study reference에서 design system을 확정하면 된다.
- Question solving과 answer feedback은 같은 `QuestionCard`의 pre/post-answer state다. 최소·권장 set에서는 한 장에 두 state를 함께 표현할 수 있다.
- `/practice/checklist`, `/practice/course`, `/practice/fail-items`, `/practice/videos`는 하나의 practice-detail system으로 묶을 수 있다.
- `/privacy`, `/terms`, `/contact`는 content/form system 하나로 처리한다.
- PortalShell 계열 안내 route는 hero/card template 하나면 충분하다.

현재 chart component, progress dashboard, modal system, exam result panel은 production user flow에 구현돼 있지 않다. 해당 placeholder는 현재 amber 준비중 card가 아니라 최종 기능 화면을 기준으로 reference를 받아야 한다.

## 5. Unique 사용자 UI Template 15개

| ID | Template | 대표 route | 현재 상태 | Priority | Responsive |
|---|---|---|---|---|---|
| U01 | HOME_LANDING | `/` | 구현됨 | P0 | BOTH_REQUIRED |
| U02 | QUESTION_SESSION_FEEDBACK | `/study` | 부분 구현, 실제 engine 연결 | P0 | BOTH_REQUIRED |
| U03 | THEORY_STUDY_DASHBOARD | `/theory` | placeholder | P1 | MOBILE_REFERENCE_RECOMMENDED |
| U04 | CONCEPT_ARTICLE_DETAIL | `/theory/[tag]` | placeholder | P1 | SAME_RESPONSIVE_DESIGN |
| U05 | PRACTICE_HUB | `/practice` | legacy mixed, 최종 Drone용 재설계 필요 | P0 | MOBILE_REFERENCE_RECOMMENDED |
| U06 | PRACTICE_LESSON_DETAIL | `/practice/checklist` 등 | legacy mixed | P1 | MOBILE_REFERENCE_RECOMMENDED |
| U07 | MOCK_EXAM | `/exam` | placeholder | P0 | BOTH_REQUIRED |
| U08 | WRONG_ANSWER_REVIEW | `/wrong` | placeholder | P0 | MOBILE_REFERENCE_RECOMMENDED |
| U09 | PROGRESS_MASTERY | `/progress` | placeholder | P0 | BOTH_REQUIRED |
| U10 | LEARNING_ANALYTICS | `/analysis` | placeholder | P0 | DESKTOP_REFERENCE_RECOMMENDED |
| U11 | SEARCHABLE_DIRECTORY | `/dictionary`, `/faq`, `/centers`, `/boatpedia` | 정적/부분 구현 | P1 | SAME_RESPONSIVE_DESIGN |
| U12 | SAFETY_INFORMATION_DASHBOARD | `/fishing-safety`, `/sea-info`의 Drone 대체본 | route/name legacy mixed | P1 | SAME_RESPONSIVE_DESIGN |
| U13 | LICENSE_PORTAL_GUIDE | `/exam-guide` 계열의 Drone 대체본 | legacy mixed | P1 | SAME_RESPONSIVE_DESIGN |
| U14 | LEGAL_CONTACT_CONTENT | `/privacy`, `/terms`, `/contact` | 구현됨 | P2 | SAME_RESPONSIVE_DESIGN |
| U15 | FEATURE_PLACEHOLDER | `/coming-soon` | utility | P3 | SAME_RESPONSIVE_DESIGN |

`EXAM_RESULT` 전용 route는 현재 존재하지 않는다. 향후 `/exam` 내부 state 또는 별도 route로 구현할 때 U07 reference의 result state로 먼저 처리할 수 있다. 별도 route가 확정되면 complete set에 1장을 추가한다.

## 6. 핵심 사용자 Flow

현재 route와 최종 기능 의도를 함께 놓으면 다음과 같다.

```text
Home `/`
  -> Study/Question `/study`
  -> Theory dashboard `/theory`
       -> Concept detail `/theory/[tag]`
  -> Practice hub `/practice`
       -> Practice lesson `/practice/*`
  -> Mock exam `/exam`
       -> Result state (전용 route 없음)
  -> Wrong answers `/wrong`
  -> Progress/Mastery `/progress`
  -> Analytics `/analysis`
```

실제 동작하는 문제 flow는 `/study`뿐이다. `/exam`, `/wrong`, `/progress`, `/analysis`, `/theory`는 `PLACEHOLDER_BUT_DESIGN_REQUIRED`다.

## 7. Admin UI

관리자 visual route는 7개, unique template은 5개다.

| Admin template | Routes | 상태 | 사용자 redesign 동시 필요 |
|---|---|---|---|
| A01 ADMIN_DATA_TABLE_REVIEW | `/admin/knowledge-review` | dense table/tab/action UI | 아니오, 2차 |
| A02 ADMIN_IMPORT_FORM | `/admin/import` | upload/preview/import | 아니오, 2차 |
| A03 ADMIN_SOURCE_COVERAGE_DASHBOARD | `/admin/drone-source-coverage` | metrics/filter/detail | 아니오, 2차 |
| A04 ADMIN_SAFE_OPERATION_PANEL | graph activation, local recovery, canary | preflight/status/audit/action | 아니오, 2차 |
| A05 ADMIN_BATCH_PLAN | autonomous batch plan | development-only planning | 아니오, 2차 |

Admin reference를 별도로 완성하려면 5장이지만, 이는 사용자 COMPLETE_REFERENCE_SET 15장에 포함하지 않는다.

## 8. Placeholder 판정

| Route | 현재 문구/상태 | 디자인 판정 |
|---|---|---|
| `/analysis` | 학습분석 준비중 | PLACEHOLDER_BUT_DESIGN_REQUIRED |
| `/boatpedia` | 기체/장비 데이터 준비 | PLACEHOLDER_BUT_DESIGN_REQUIRED |
| `/coming-soon` | 범용 feature 준비중 | DESIGN_REFERENCE_NOT_REQUIRED |
| `/exam` | 드론 모의고사 준비중 | PLACEHOLDER_BUT_DESIGN_REQUIRED |
| `/past` | 기출/공식 문제 준비중 | U11 또는 U03로 흡수 가능 |
| `/progress` | 학습 진도 재설계 예정 | PLACEHOLDER_BUT_DESIGN_REQUIRED |
| `/random` | 랜덤문제 준비중 | U02로 흡수 가능 |
| `/theory` | 이론학습 재구성 예정 | PLACEHOLDER_BUT_DESIGN_REQUIRED |
| `/theory/[tag]` | 개념 상세 준비중 | PLACEHOLDER_BUT_DESIGN_REQUIRED |
| `/wrong` | 오답노트 재연결 예정 | PLACEHOLDER_BUT_DESIGN_REQUIRED |

## 9. Legacy 처리

Legacy flag 17 routes:

`/centers/map-test`, `/exam-guide`, `/fish`, `/fishing-safety`, `/fishing-spots`, `/leisure-report`, `/license-guide`, `/license-issue`, `/marine-knowledge`, `/official-links`, `/practice`, `/practice/checklist`, `/practice/course`, `/practice/fail-items`, `/practice/videos`, `/safety-guide`, `/sea-info`.

- 어종/낚시/해양/수상레저 자체 콘텐츠 화면은 `DESIGN_REFERENCE_NOT_REQUIRED`.
- Drone에 재사용할 가치가 있는 것은 AppFrame, responsive header/nav, PortalShell hero/card, filter/search list, checklist/lesson card, QuestionCard의 state styling이다.
- `/fishing-safety`, `/sea-info`, `/practice/**`처럼 route 이름/콘텐츠가 섞인 경우 최종 Drone template U05/U06/U12의 구조만 재사용하고 legacy copy는 reference 대상으로 삼지 않는다.

## 10. Image Reference Sets

### A. Minimum — 6장

1. Home
2. Question solving + feedback
3. Practice hub
4. Mock exam + result state
5. Progress/Mastery
6. Analytics

이 6장으로 색상, typography, navigation, card, action, data visualization의 핵심 design language를 확정할 수 있다.

### B. Recommended — 10장

Minimum 6장에 다음 4장을 추가한다.

7. Theory/Study dashboard
8. Concept detail
9. Wrong-answer review
10. Searchable directory / license information system

이 set이 핵심 학습 경험과 보조 탐색 경험을 모두 안정적으로 redesign하는 권장 기준이다.

### C. Complete — 15장

U01~U15 각각 한 장. 단 U15는 별도 고급 design이 필요 없는 P3 화면이고, legacy-only route와 admin은 포함하지 않는다. Admin까지 완전 redesign하면 별도 5장을 더해 총 20장이 된다.

## 11. 추천 Image Shot List

| No. | Filename | 대표 route/state | 함께 적용되는 화면 | Viewport | Priority |
|---:|---|---|---|---|---|
| 01 | `01_home.png` | `/` | global shell/header/nav/cards | Mobile + Desktop | P0 |
| 02 | `02_question-solving-feedback.png` | `/study` before/after answer | `/random`, exam question state | Mobile + Desktop | P0 |
| 03 | `03_practice-hub.png` | `/practice` | practical learning entry | Mobile | P0 |
| 04 | `04_mock-exam-result.png` | `/exam` setup/run/result state | future exam session | Mobile + Desktop | P0 |
| 05 | `05_progress-mastery.png` | `/progress` | mastery/topic progress | Mobile + Desktop | P0 |
| 06 | `06_learning-analytics.png` | `/analysis` | charts/readiness/weak areas | Desktop | P0 |
| 07 | `07_theory-dashboard.png` | `/theory` | `/past`, subject/topic list | Mobile | P1 |
| 08 | `08_concept-detail.png` | `/theory/[tag]` | article/source/detail | Responsive | P1 |
| 09 | `09_wrong-answer-review.png` | `/wrong` | review queue/detail | Mobile | P0 |
| 10 | `10_directory-license-info.png` | `/dictionary` + guide variant | FAQ, centers, equipment, license info | Responsive | P1 |
| 11 | `11_practice-lesson-detail.png` | `/practice/checklist` | course/fail/video lessons | Mobile | P1 |
| 12 | `12_safety-flight-info.png` | Drone replacement for safety/info | safety and weather/airspace info | Responsive | P1 |
| 13 | `13_license-portal-guide.png` | Drone qualification guide | exam/issuance/official links | Responsive | P1 |
| 14 | `14_legal-contact.png` | `/privacy`, `/terms`, `/contact` | policy/form content | Responsive | P2 |
| 15 | `15_feature-placeholder.png` | `/coming-soon` | unavailable feature state | Responsive | P3 |

## 12. UI Reference Matrix — 전체 Visual Route

| Route | 현재 화면 | Category | Template | Design | Priority | Viewport | Image | Note |
|---|---|---|---|---|---|---|---:|---|
| `/` | Home | CORE_USER_UI | U01 | REQUIRED | P0 | BOTH | 01 | `HomeLanding` |
| `/study` | 동적 문제 샘플 | CORE_USER_UI | U02 | REQUIRED | P0 | BOTH | 02 | 실제 engine 연결 |
| `/theory` | 이론학습 준비중 | PLACEHOLDER_UI | U03 | REQUIRED_FINAL | P1 | MOBILE | 07 | final dashboard 대상 |
| `/theory/[tag]` | 개념 상세 준비중 | PLACEHOLDER_UI | U04 | REQUIRED_FINAL | P1 | SAME | 08 | dynamic route 1 template |
| `/practice` | 실기 학습센터 | CORE_USER_UI + LEGACY | U05 | REQUIRED_FINAL | P0 | MOBILE | 03 | copy/content 오염 |
| `/practice/checklist` | 체크리스트 | CORE_USER_UI + LEGACY | U06 | REQUIRED_FINAL | P1 | MOBILE | 11 | detail family |
| `/practice/course` | 코스 학습 | LEGACY_UI | U06 | REUSE | P1 | MOBILE | 11 | detail family |
| `/practice/fail-items` | 실격 사유 | LEGACY_UI | U06 | REUSE | P1 | MOBILE | 11 | detail family |
| `/practice/videos` | 영상 학습 | LEGACY_UI | U06 | REUSE | P1 | MOBILE | 11 | detail family |
| `/exam` | 모의고사 준비중 | PLACEHOLDER_UI | U07 | REQUIRED_FINAL | P0 | BOTH | 04 | exam result state 포함 |
| `/random` | 랜덤문제 준비중 | PLACEHOLDER_UI | U02 | REUSE | P2 | SAME | 02 | question session 재사용 |
| `/past` | 공식 문제 준비중 | PLACEHOLDER_UI | U03/U11 | REUSE | P2 | SAME | 07/10 | 별도 image 불필요 |
| `/wrong` | 오답노트 준비중 | PLACEHOLDER_UI | U08 | REQUIRED_FINAL | P0 | MOBILE | 09 | mastery trace 필요 |
| `/progress` | 진도 준비중 | PLACEHOLDER_UI | U09 | REQUIRED_FINAL | P0 | BOTH | 05 | progress components 없음 |
| `/analysis` | 분석 준비중 | PLACEHOLDER_UI | U10 | REQUIRED_FINAL | P0 | DESKTOP | 06 | chart system 없음 |
| `/dictionary` | 드론 용어사전 | SECONDARY_USER_UI | U11 | REQUIRED | P1 | SAME | 10 | filter/search list |
| `/faq` | 드론 FAQ | SECONDARY_USER_UI | U11 | REUSE | P2 | SAME | 10 | accordion variant |
| `/centers` | 교육장/시험장 | SECONDARY_USER_UI | U11 | REUSE | P2 | SAME | 10 | directory variant |
| `/boatpedia` | 기체/장비백과 준비 | PLACEHOLDER_UI | U11 | REUSE | P2 | SAME | 10 | name legacy, content Drone |
| `/fishing-safety` | 드론 안전 가이드 | LEGACY_MIXED | U12 | REQUIRED_FINAL | P1 | SAME | 12 | route rename 대상 |
| `/sea-info` | 드론 비행정보 | LEGACY_MIXED | U12 | REUSE | P1 | SAME | 12 | route rename 대상 |
| `/exam-guide` | 수상/면허 시험 안내 | LEGACY_UI | U13 | NOT_REQUIRED_LEGACY | P3 | SAME | - | Drone replacement만 13 |
| `/license-guide` | 면허 안내 | LEGACY_UI | U13 | NOT_REQUIRED_LEGACY | P3 | SAME | - | legacy copy |
| `/license-issue` | 면허 발급 | LEGACY_UI | U13 | NOT_REQUIRED_LEGACY | P3 | SAME | - | legacy copy |
| `/safety-guide` | 수상안전 안내 | LEGACY_UI | U13 | NOT_REQUIRED_LEGACY | P3 | SAME | - | legacy copy |
| `/official-links` | 수상 공식링크 | LEGACY_UI | U13 | NOT_REQUIRED_LEGACY | P3 | SAME | - | legacy copy |
| `/leisure-report` | 수상레저 신고 | LEGACY_UI | - | NOT_REQUIRED | P3 | SAME | - | 제거/격리 후보 |
| `/fish` | 어종백과 | LEGACY_UI | - | NOT_REQUIRED | P3 | SAME | - | 제거/격리 후보 |
| `/fishing-spots` | 낚시 포인트 | LEGACY_UI | - | NOT_REQUIRED | P3 | SAME | - | 제거/격리 후보 |
| `/marine-knowledge` | 해양상식 | LEGACY_UI | - | NOT_REQUIRED | P3 | SAME | - | 제거/격리 후보 |
| `/centers/map-test` | 지도 실험실 | INTERNAL + LEGACY | - | NOT_REQUIRED | P3 | DESKTOP | - | utility |
| `/privacy` | 개인정보 | SECONDARY_USER_UI | U14 | SYSTEM_APPLY | P2 | SAME | 14 | content page |
| `/terms` | 이용약관 | SECONDARY_USER_UI | U14 | SYSTEM_APPLY | P2 | SAME | 14 | content page |
| `/contact` | 문의 | SECONDARY_USER_UI | U14 | SYSTEM_APPLY | P2 | SAME | 14 | form variant |
| `/coming-soon` | 범용 준비중 | INTERNAL_OR_UTILITY | U15 | OPTIONAL | P3 | SAME | 15 | query-driven one template |
| `/admin/knowledge-review` | 지식 검수 | ADMIN_UI | A01 | ADMIN_PHASE_2 | P2 | DESKTOP | - | table/tabs/actions |
| `/admin/import` | Pack import | ADMIN_UI | A02 | ADMIN_PHASE_2 | P2 | DESKTOP | - | form/preview |
| `/admin/drone-source-coverage` | Source coverage | ADMIN_UI | A03 | ADMIN_PHASE_2 | P2 | DESKTOP | - | dashboard |
| `/admin/graph-activation` | Graph activation | ADMIN_UI | A04 | ADMIN_PHASE_2 | P2 | DESKTOP | - | safe operation |
| `/admin/local-recovery` | Local recovery | ADMIN_UI | A04 | ADMIN_PHASE_2 | P3 | DESKTOP | - | dev operation |
| `/admin/autonomous-promotion-canary` | Canary | ADMIN_UI | A04 | ADMIN_PHASE_2 | P3 | DESKTOP | - | dev-only/notFound prod |
| `/admin/autonomous-promotion-batch-plan` | Batch plan | ADMIN_UI | A05 | ADMIN_PHASE_2 | P3 | DESKTOP | - | dev-only/notFound prod |

## 13. API / Non-visual

| Route | File | Design |
|---|---|---|
| `/api/admin/local-recovery-artifact` | `src/app/api/admin/local-recovery-artifact/route.ts` | 없음 |
| `/api/sea-info/tide` | `src/app/api/sea-info/tide/route.ts` | 없음 |
| `/_not-found` | Next.js generated | 별도 reference 불필요; U15/system state 재사용 |

## 14. 최종 판단

1. 전체 Route 수 = **45**
2. 실제 Visual Page Route 수 = **42**
3. 사용자용 Route 수 = **35**
4. 관리자 Route 수 = **7**
5. Legacy Route 수 = **17**
6. Placeholder Route 수 = **10**
7. Unique 사용자 UI Template 수 = **15**
8. 최소 레퍼런스 이미지 수 = **6**
9. 권장 레퍼런스 이미지 수 = **10**
10. 전체 레퍼런스 이미지 수 = **15**

**따라서 UI 개선을 위해 우선 10장의 레퍼런스 이미지를 준비하면 된다.**
