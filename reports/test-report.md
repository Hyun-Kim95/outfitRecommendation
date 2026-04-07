# Test Report

## 1. Feature / Scope
- Feature: 착장 기록·추천 모바일 앱(`mobile/`) + 운영용 관리자 웹(`admin/`) + Supabase 스키마·RLS
- Related PRD: [docs/prd.md](../docs/prd.md)
- Related UI Spec: [docs/ui-spec.md](../docs/ui-spec.md)
- Related Frontend Plan: [docs/frontend-plan.md](../docs/frontend-plan.md)
- Related Backend Plan: [docs/backend-plan.md](../docs/backend-plan.md)

## 2. Changed Files / Areas
- Files changed: `mobile/`(스크립트 [e2e-signup-flow.mjs](../mobile/scripts/e2e-signup-flow.mjs), `package.json` 스크립트), `admin/`, `supabase/migrations/`, 문서·리포트
- Affected screens: 모바일 — 인증, 온보딩, 홈, 착장, 감상, 히스토리, 비슷한 날, 설정 / 관리자 — 로그인, 대시보드, 사용자, 착장, 비권한
- Affected APIs: Supabase Auth, PostgREST(`profiles`, `weather_logs`, `outfit_logs`, …), Storage `outfit-photos`
- Affected database/schema areas: [20260407130000_init_outfit_app.sql](../supabase/migrations/20260407130000_init_outfit_app.sql), [20260408120000_admin_console.sql](../supabase/migrations/20260408120000_admin_console.sql)

## 3. Environment
- Branch / worktree: 로컬 워크스페이스 `d:\cursor\outFitRecommendation` (git 미사용)
- Runtime / framework: Node.js, Expo SDK 54(`mobile`), Vite 8(`admin`)
- Test date: 2026-04-07
- Tester: 자동 검증(Cursor 에이전트 터미널) + 수동 E2E는 운영자 기기에서 수행 필요

## 4. Commands Run
- Command 1: `cd mobile && npm run typecheck` → exit code **0**
- Command 2: `cd admin && npm run build` → exit code **0**
- Command 3: `cd mobile && npm run test:e2e-signup` (`node scripts/e2e-signup-flow.mjs`) — **exit 1**, `signUp email rate limit exceeded` (Supabase Auth)
- Command 4: (선택) `cd mobile && npx expo export --platform web` — **이번 세션에서 미실행** (이전에 성공 이력 있음)

## 5. Automated Test Results
- Executed: `mobile` TypeScript 검사, `admin` `tsc -b && vite build`, **`mobile` 가입~온보딩 API 스크립트** ([mobile/scripts/e2e-signup-flow.mjs](../mobile/scripts/e2e-signup-flow.mjs))
- Passed: 타입체크, admin 빌드
- Failed: **신규 가입 API 경로** — Supabase `email rate limit exceeded` (동일 세션에서 가입 재시도 시)
- Skipped: 없음
- Not run: Expo 웹 export, **UI 터치 가입** (스크립트는 Auth+PostgREST와 앱 동일 계약 검증)
- 보완: 기존 계정으로 동일 검증 시  
  `E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e-signin` (`--sign-in-only`) 실행 가능

## 6. Manual Verification Steps
1. **(API, 가입~온보딩)** `cd mobile && npm run test:e2e-signup` — `signUp` → `profiles` 존재 → 온보딩 필드 `update` → `onboarding_completed` 확인. Rate limit 시: 시간 두고 재시도하거나 `E2E_EMAIL` / `E2E_PASSWORD` 설정 후 `npm run test:e2e-signin`
2. `mobile/.env` 설정 후 `npx expo start` → 가입/로그인 → 온보딩 → 홈 날씨·추천 → 착장 기록(선택 사진) → 상세·만족도·감상 → 히스토리·비슷한 날
3. Supabase Storage `outfit-photos` 정책이 있는 상태에서 사진 업로드 성공 여부
4. `admin/.env`(`VITE_*`) 설정 후 `npm run dev` → 관리자로 승격된 계정 로그인 → KPI·목록 표시
5. `is_admin = false` 계정으로 관리자 로그인 시 `/unauthorized`로 이동하는지

## 7. Expected Results
- 타입·프로덕션 빌드 오류 없음
- 관리자는 RLS 하에서 전역 `SELECT` 가능, 비관리자는 관리자 라우트 진입 불가
- 모바일은 본인 데이터만 읽기/쓰기

## 8. Actual Results
- `npm run typecheck`(mobile), `npm run build`(admin) **성공** (터미널 로그 확인)
- **가입 API 스크립트**: 논리·엔드포인트는 실행되었으나 **신규 `signUp` 단계에서 rate limit으로 중단** (프로필/온보딩 단계까지 도달하지 못함)
- 실제 **Expo UI**에서의 가입 화면 동작은 **이 환경에서 미실행** → Main Flow는 여전히 운영자 기기 확인 전제

## 9. Main Flow Verification
- [ ] Main entry flow works — **미검증** (실기기/에뮬). 가입 **API**는 스크립트로 시도했으나 rate limit으로 완주 실패
- [ ] Success flow works — 동상
- [ ] Validation errors behave correctly — 동상 (코드상 폼 검증 존재, 런타임 미확인)
- [ ] Failure path behaves correctly — 동상
- [ ] API request/response alignment verified — **부분** (스키마·마이그레이션과 코드 정합은 정적 검토; 실 API는 수동)
- [ ] No obvious regression in nearby flows — **미검증**

## 10. Edge Cases Checked
- [ ] Empty input — 코드상 일부 폼에서 처리; 런타임 미검증
- [ ] Invalid format — 동상
- [ ] Duplicate data — 미검증
- [ ] Server error handling — 미검증
- [ ] Permission / auth-related handling — 관리자 가드·RLS는 코드·스키마로 존재; 통합 테스트 미실행
- [ ] Boundary values if applicable — 미검증

## 11. Failed Cases
- `npm run test:e2e-signup`: **신규 가입** 단계에서 `email rate limit exceeded` — Supabase 프로젝트 측 제한(재시도 간격 두거나 `test:e2e-signin` 사용)

## 12. Blocked or Untested Areas
- 모바일 **UI 가입 화면** 터치 플로우, 모바일·관리자 **전체 E2E**, **Expo 웹 export 재실행**, **Storage 업로드 실제 요청**, **푸시 알림 실제 수신**
- 가입 API 완주: **rate limit**으로 차단됨 — 제한 해소 후 `test:e2e-signup` 재실행 권장

## 13. Known Risks
- 테스트 자동화 부재로 회귀는 PR·배포 전 수동 스모크에 의존
- 관리자 `is_admin` 오설정 시 권한 범위가 넓어짐 — SQL로만 승격 권장(문서화됨)

## 14. Pass / Fail Summary
- Status: **PARTIAL**
- Reason: 빌드·타입체크 통과. **가입~온보딩 API 자동 검증 스크립트 추가 및 실행 시도**했으나 신규 가입은 **rate limit**으로 실패. UI·엣지 전체 증거는 여전히 부족.

## 15. Recommended Next Action
1. Rate limit 해소 후 `cd mobile && npm run test:e2e-signup` 재실행, 또는 기존 계정으로 `E2E_EMAIL` / `E2E_PASSWORD` 설정 후 `npm run test:e2e-signin`
2. §6 항목 1 — Expo에서 동일 가입 UI로 한 번 더 확인 (스크립트와 상호 검증)
3. [docs/gate-checklist.md](../docs/gate-checklist.md) — Required·UI/UX 항목을 실제 확인 범위에 맞게 체크

## 16. UI / UX (게이트 `docs/gate-checklist.md` 연동)
워크플로 [.cursor/rules/00-workflow.mdc](../.cursor/rules/00-workflow.mdc) · 코딩 표준 [.cursor/rules/10-coding-standards.mdc](../.cursor/rules/10-coding-standards.mdc) 기준 **정적 검토 + 빌드**로만 판단한 내용이다. 실기기/브라우저에서의 체감 검증은 운영자 수동이 필요하다.

| 게이트 UI 항목 | 증거(이번 세션) | 완전 검증 여부 |
|----------------|-----------------|----------------|
| 라벨·메시지 일관성 | 주요 화면 `Alert`/placeholder grep, 한국어 위주 | 부분 (Auth 오류 원문 노출은 개선 여지 — [review.md](review.md)) |
| 페이지/앱 제목 | `admin/index.html` title; `mobile/app.json` `name` → **착장 기록** | 관리자 OK; 모바일 설치명 맥락 개선 반영 |
| 성공·오류·로딩·빈 상태 | 코드상 `ActivityIndicator`, 빈 문구, `Alert` 다수 존재 | 런타임 전 화면 미확인 |
| 검증 피드백 | 필수 필드 `Alert`, 폼 제약 | 기기에서 입력 조합 미전수 |
| 액션 후 피드백·이동 | `router.replace`/`push`, 저장 후 Alert | 부분 |
| 플레이스홀더·어색한 문구 | 프로덕션 노출 placeholder는 입력 힌트 수준 | 전수 grep 아님 |
| 데스크톱·모바일 | `admin` 빌드, `mobile` 타입체크 | 관리자+모바일 동시 상호작용 미검 |

**요약**: UI/UX 게이트를 “완료”로 보려면 §6 수동 시나리오 + 기기에서 한 사이클 돌린 뒤 체크리스트를 갱신하는 것이 안전하다.

