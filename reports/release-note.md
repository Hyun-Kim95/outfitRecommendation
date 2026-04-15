# Release note — 관리자 고도화 · 문의 · 공지 · 계정 비활성

## 요약

- **관리자 웹** (`admin/`): 사용자·착장 **상세** 화면, 사용자 **편집**(닉네임·지역·민감도·온보딩·`account_disabled`), **문의** 목록·상세(상태·답변), **공지** CRUD, 대시보드 **미완료 문의** 수. 비활성 계정은 관리자 UI에서도 로그아웃 처리.
- **DB** (`20260408210000_admin_inquiries_notices_account_disabled.sql`): `profiles.account_disabled`, `support_tickets`, `app_notices`, 관리자 타인 `profiles` UPDATE, API에서 `is_admin` UPDATE 금지·INSERT 시 `is_admin` false, 본인 `account_disabled` 변경 금지.
- **모바일**: 설정「운영진에게 문의」→ `support_tickets` insert; `account_disabled` 시 Alert 후 로그아웃.

## 신규·변경 경로

- [supabase/migrations/20260408210000_admin_inquiries_notices_account_disabled.sql](../supabase/migrations/20260408210000_admin_inquiries_notices_account_disabled.sql)
- [admin/src/App.tsx](../admin/src/App.tsx), 신규 페이지 `UserDetailPage`, `UserEditPage`, `OutfitDetailPage`, `InquiriesPage`, `InquiryDetailPage`, `NoticesPage`, `NoticeFormPage`, `RequireAdmin` 등
- [mobile/app/support-inquiry.tsx](../mobile/app/support-inquiry.tsx), [mobile/contexts/AuthContext.tsx](../mobile/contexts/AuthContext.tsx)
- 문서: `docs/requirements/prd.md`, `docs/requirements/backend-plan.md`, `docs/requirements/frontend-plan.md`, `docs/design/ui-spec.md`, `docs/requirements/research.md`

## 배포 전 필수

1. Supabase에 위 마이그레이션 적용.
2. [reports/test-report.md](test-report.md) §6 수동 절차 권장.
3. 관리자 지정은 여전히 SQL Editor에서 `is_admin` 설정(API로는 변경 불가).

## 품질 게이트

- 테스트: [reports/test-report.md](test-report.md) — **PARTIAL**(빌드·tsc 통과, DB E2E 미검증)
- 리뷰: [reports/review.md](review.md)
- 체크리스트: [docs/qa/gate-checklist.md](../docs/qa/gate-checklist.md)
