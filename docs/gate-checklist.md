# Gate Checklist

검토 기준: [.cursor/rules/00-workflow.mdc](../.cursor/rules/00-workflow.mdc), [.cursor/rules/10-coding-standards.mdc](../.cursor/rules/10-coding-standards.mdc).  
증거·한계: [reports/test-report.md](../reports/test-report.md) §16, [reports/review.md](../reports/review.md).

## Required
- [x] PRD exists and matches implemented scope
- [x] Frontend/Backend plans exist
- [x] UI spec updated if UI changed
- [x] Build passes (`mobile`: `npm run typecheck`; `admin`: `npm run build` — 2026-04-07 확인)
- [x] reports/test-report.md exists and is up to date
- [x] Relevant automated tests pass, or explicit manual verification steps and results are documented (자동 단위 테스트 없음 → 스크립트·수동 절차·PARTIAL 기록)
- [ ] Main user flow works end-to-end (실기기/에뮬 스모크 증거 필요 — [test-report §9](../reports/test-report.md))
- [ ] Validation and error handling were verified (런타임 전 시나리오; 코드·Alert 정적 검토는 [test-report §16](../reports/test-report.md))
- [x] No blocker remains in reports/review.md
- [x] API/schema changes documented (`supabase/migrations/`, `docs/backend-plan.md`)
- [x] Release summary updated (`reports/release-note.md`)

## UI / UX Quality
> **정적 검토·빌드**까지 반영한 체크. 기기/브라우저에서 한 사이클 돌린 뒤 빈 항목을 `[x]`로 올리면 된다. 근거: [test-report §16](../reports/test-report.md).

- [x] User-facing labels and messages are clear and consistent (주요 화면 한국어; Auth 원문 오류는 개선 여지 — [review.md](../reports/review.md))
- [x] Page title / screen context is correct (`admin` `<title>`; 모바일 `app.json` 표시 이름 `착장 기록`)
- [ ] Success, error, loading, and empty states were verified (코드상 존재는 확인; 전 화면 런타임 미확인)
- [ ] Validation feedback feels clear and natural (Alert/필수 필드 존재; 기기에서 입력 조합 미검)
- [ ] Post-action navigation or feedback is not confusing (라우팅·Alert 존재; 사용자 체감 미검)
- [x] No placeholder or obviously awkward UI text remains (프로덕션 노출은 입력 힌트 수준; 전수 감사 아님)
- [x] Desktop and mobile interaction quality were considered where relevant (`admin`+`mobile` 빌드 통과; 반응형·터치 상세 감사는 미실시)

## Blocker definition
A blocker is any issue that prevents safe merge or basic usage:
- build failure
- test failure
- broken main flow
- severe API mismatch
- destructive migration risk
- security-sensitive issue
