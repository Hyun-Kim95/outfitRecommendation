# 착장 기록 · 추천 (Outfit Recommendation)

날씨·상황·감정을 함께 남기고, 과거 기록과 규칙 기반으로 코디를 추천하는 **개인용** 모바일 앱과, 운영을 위한 **관리자 웹**으로 구성된 모노레포입니다. 백엔드는 **Supabase**(PostgreSQL, Auth, Storage)를 사용합니다.

## 구성

| 경로 | 설명 |
|------|------|
| [`mobile/`](mobile/) | Expo(React Native) 모바일 앱 — 인증, 온보딩, 홈·착장 기록, 감상, 히스토리, 비슷한 날 등 |
| [`admin/`](admin/) | Vite + React 관리자 콘솔 — 로그인, KPI·사용자·착장 조회(읽기 중심 MVP) |
| [`supabase/migrations/`](supabase/migrations/) | DB 스키마·RLS 마이그레이션 SQL |
| [`docs/`](docs/) | PRD, UI 명세, 프론트/백엔드 계획, 게이트 체크리스트 |
| [`reports/`](reports/) | 테스트 리포트, 리뷰, 릴리즈 노트 |

## 요구 사항

- **Node.js** (LTS 권장)
- **Supabase 프로젝트** — URL·anon 키를 각 앱의 `.env`에 설정  
  (`mobile/.env.example`, `admin/.env.example` 참고)

## 빠른 시작

### 모바일

```bash
cd mobile
cp .env.example .env   # Windows: 복사 후 값 입력
npm install
npx expo start
```

### 관리자

```bash
cd admin
cp .env.example .env
npm install
npm run dev
```

관리자 계정은 Supabase에서 `profiles.is_admin = true`로만 지정하는 것을 권장합니다.

### 품질 확인(예시)

```bash
cd mobile && npm run typecheck
cd admin && npm run build
```

상세 검증·게이트는 [`docs/gate-checklist.md`](docs/gate-checklist.md), [`reports/test-report.md`](reports/test-report.md)를 참고하세요.

## 문서

- 제품 요약: [`docs/prd.md`](docs/prd.md)
- 워크플로(리서치 → PRD → 계획 → 구현 → 테스트 → 리뷰 → 게이트): [`.cursor/rules/00-workflow.mdc`](.cursor/rules/00-workflow.mdc)
