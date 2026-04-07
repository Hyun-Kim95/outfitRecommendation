# Frontend plan — 착장 기록·추천 (Expo)

## 스택

- **Expo SDK** (안정 채널), **TypeScript**
- **expo-router** — 파일 기반 라우팅
- **데이터**: `@tanstack/react-query` + `@supabase/supabase-js`
- **폼**: `react-hook-form` + `zod` (스키마 공유)
- **이미지**: `expo-image-picker` → Supabase Storage 업로드, DB에는 `photo_path`만 저장
- **날씨**: Open-Meteo REST (클라이언트 직접 호출, 키 없음)
- **위치**: `expo-location` (거부 시 프로필 `default_region` 좌표 폴백)

## Expo Router 구조

```
mobile/app/
  _layout.tsx              # QueryClientProvider, AuthContext, 테마
  index.tsx                # 세션·온보딩 분기 → (auth) | (onboarding) | (tabs)
  (auth)/
    _layout.tsx
    sign-in.tsx
    sign-up.tsx
  (onboarding)/
    _layout.tsx
    profile.tsx            # 닉네임, 지역, 민감도, 이동수단, 알림 동의
  (tabs)/
    _layout.tsx            # Home | History | Settings
    home.tsx
    history.tsx
    settings.tsx
  outfit/
    new.tsx                # 착장 기록 (카테고리·상황·날씨 연동)
    [id].tsx               # 상세·만족도·피드백 진입
  feeling/
    [outfitId].tsx         # first / middle / last 단계 (쿼리 step)
  similar/
    index.tsx              # 오늘 날씨 기준 유사 일 목록
  +not-found.tsx
```

## 화면별 책임

| 화면 | 책임 |
|------|------|
| 로그인/가입 | Supabase `signInWithPassword`, `signUp` |
| 온보딩 | `profiles` 업데이트: 닉네임, `default_region` 텍스트+좌표, `cold_sensitivity`, `heat_sensitivity`, `default_transport`, `notifications_enabled` |
| 홈 | 날씨 요약(캐시+당일 `weather_logs` 없으면 fetch 후 insert), 규칙 기반 추천 1~3카드, CTA(기록 / 비슷한 날) |
| 착장 신규 | 상의·하의(필수 1)·아우터·신발 선택, 상황 태그·이동·활동량·실내외, 사진 선택, `outfit_logs`+`context_logs`+`weather_log_id` 저장 |
| 착장 상세 | 감상 3단계 이동, 만족도 폼, 즐겨찾기 토글 |
| 감상 | `feedback_logs`에 `timing_type`별 upsert |
| 히스토리 | `worn_on` 역순, 필터(상황 태그 등 최소) |
| 비슷한 날 | 오늘(또는 선택) 날씨 벡터와 과거 `weather_logs`+`outfit_logs` 조인 후 유사도 정렬 |
| 설정 | 로그아웃, 지역/민감도 수정 |

## 상태·네비게이션

- **React Query** 키: `['profile']`, `['outfits']`, `['outfit', id]`, `['weather', date]`, `['similar']`
- **가드**: `(tabs)`는 `session && onboarding_complete`일 때만; 미완 온보딩은 `(onboarding)`
- **모달**: `outfit/new`는 `presentation: 'modal'` 검토

## 오프라인 (MVP)

- 읽기: `staleTime`으로 홈·목록 캐시
- 쓰기 실패 시 토스트; 드래프트 로컬 저장은 P1

## 환경 변수

- `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`

## 빌드

- EAS: dev/preview/prod 프로필; 시크릿은 EAS Secrets

---

## 관리자 웹 (`admin/`)

- **스택**: Vite, React 19, TypeScript, React Router, TanStack Query, Supabase JS
- **경로**: `/login` → `/`(대시보드), `/users`, `/outfits`
- **인증**: Supabase `signInWithPassword`; 세션 후 `profiles`에서 `is_admin` 확인, 미만족 시 안내 화면
- **데이터**: 서비스 롤 미사용; RLS의 관리자 `SELECT` 정책으로 집계·목록 조회
- **환경 변수**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (`.env.example` 참고)
