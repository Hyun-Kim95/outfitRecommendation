# Release note — 관리자 콘솔 (MVP)

## 요약

- **관리자 웹** `admin/`: Vite React, Supabase 이메일 로그인 + `profiles.is_admin` 가드, KPI·사용자·착장 목록(읽기 전용).
- **DB**: `profiles.is_admin`, `is_admin()` 함수, 관리자용 `SELECT` RLS, API 자가 승격 방지 트리거.

## 신규·변경 경로

- [admin/](admin/) — 전체 앱
- [supabase/migrations/20260408120000_admin_console.sql](supabase/migrations/20260408120000_admin_console.sql)
- [docs/prd.md](docs/prd.md), [docs/backend-plan.md](docs/backend-plan.md), [docs/frontend-plan.md](docs/frontend-plan.md), [docs/ui-spec.md](docs/ui-spec.md), [docs/research.md](docs/research.md) — 관리자 섹션
- [admin/.env.example](admin/.env.example)

## 모바일 가입~온보딩 API 스모크

`mobile/` 에서 (`.env` 필요):

```bash
npm run test:e2e-signup
# 또는 기존 계정
E2E_EMAIL=... E2E_PASSWORD=... npm run test:e2e-signin
```

## 실행

```bash
cd admin
cp .env.example .env   # Windows: 복사 후 편집
npm install
npm run build
npm run dev
```

관리자 지정은 SQL Editor에서 `profiles.is_admin = true` 로만 권장.

## 품질 게이트

- 검증 절차·PARTIAL 요약: [reports/test-report.md](test-report.md)
- 리뷰·블로커: [reports/review.md](review.md)
- 체크리스트: [docs/gate-checklist.md](../docs/gate-checklist.md) — Required 중 E2E·검증/에러, UI/UX 중 런타임 3항은 수동 증거 후 체크
- 모바일 앱 표시 이름: `mobile/app.json`의 `expo.name`을 **착장 기록**으로 설정(워크플로 UI 게이트 정적 검토 반영)
