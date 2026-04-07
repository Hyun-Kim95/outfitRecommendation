# Backend plan — Supabase (착장 앱)

## 개요

- **Auth**: Supabase Auth (이메일+비밀번호 MVP). `public.profiles`가 `auth.users.id` PK.
- **DB**: PostgreSQL, **RLS**로 `user_id = auth.uid()` 제한.
- **Storage**: 버킷 `outfit-photos`, 경로 `{user_id}/{outfit_id}/{filename}`.
- **추천·유사도**: **클라이언트**에서 과거 행 조회 후 규칙 점수 계산(MVP). `recommendation_logs`는 감사용 insert 선택.

## 테이블 (PRD 정렬)

### `profiles`

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | = auth.users.id |
| nickname | text | |
| default_region | text | 표시용 지역명 |
| default_lat, default_lng | double precision | nullable, 날씨 폴백 |
| cold_sensitivity, heat_sensitivity | text | `low` / `normal` / `high` |
| default_transport | text | |
| commute_student | boolean | nullable, 온보딩 |
| notifications_enabled | boolean | default false |
| onboarding_completed | boolean | default false |
| is_admin | boolean | default **false** — 관리자 콘솔 접근 플래그 |
| created_at, updated_at | timestamptz | |

### `weather_logs`

PRD 8.2와 동일한 의미. MVP 컬럼: `user_id`, `date` (date), `region_name`, `temperature_current`, `temperature_feels_like`, `temperature_min`, `temperature_max`, `humidity`, `wind_speed`, `precipitation_type`, `precipitation_probability`, `weather_condition`, `raw_json` (jsonb, Open-Meteo 스냅샷), `created_at`.  
유니크: `(user_id, date)` 하루 1스냅샷 또는 여러 번 허용 시 인덱스만 `(user_id, date desc)`.

### `outfit_logs`

| 컬럼 | 타입 |
|------|------|
| id, user_id, weather_log_id (nullable FK), date (worn date) |
| photo_path (text, nullable) |
| top_category, bottom_category, outer_category, shoes_category (text, nullable) |
| accessory_tags, thickness_level (text/jsonb) |
| memo (text) |
| created_at, updated_at |

제약: 상의·하의 중 최소 하나는 앱에서 검증.

### `context_logs`

| 컬럼 | 타입 |
|------|------|
| id, outfit_log_id FK, user_id |
| transport_type, activity_level, indoor_outdoor_ratio (text) |
| situation_tags (jsonb 배열 문자열) |
| created_at |

1:1에 가깝게 `outfit_log_id` 유니크.

### `feedback_logs`

| 컬럼 | 타입 |
|------|------|
| id, outfit_log_id, user_id |
| timing_type | `first` \| `middle` \| `last` |
| feeling_type (text) |
| discomfort_tags (jsonb) |
| note (text) |
| created_at |

유니크: `(outfit_log_id, timing_type)`.

### `rating_logs`

| 컬럼 | 타입 |
|------|------|
| id, outfit_log_id, user_id |
| overall_rating, temperature_rating, mobility_rating, context_fit_rating, style_rating (smallint 1~5) |
| would_wear_again (boolean, nullable) |
| improvement_tags (jsonb) |
| created_at |

유니크: `(outfit_log_id)` — 코디당 하나.

### `favorite_outfits`

`(user_id, outfit_log_id)` PK, `created_at`.

### `recommendation_logs`

| 컬럼 | 타입 |
|------|------|
| id, user_id, date |
| weather_log_id (nullable) |
| recommended_outfit_log_ids (jsonb uuid[]) |
| selected_outfit_log_id (nullable) |
| created_at |

## RLS 정책 (요지)

- 모든 테이블: `SELECT/INSERT/UPDATE/DELETE` 시 `auth.uid() = user_id` (또는 outfit을 통해 소유자 조인).
- `profiles`: 본인만 읽기/쓰기.
- **관리자 읽기**: `public.is_admin()` (**SECURITY DEFINER**, RLS 재귀 방지)가 true인 세션에 대해 주요 테이블에 `SELECT` 정책 추가(본인 정책과 OR). 쓰기/삭제는 MVP에서 관리자에게 열지 않음.
- **무결성**: 트리거로 `auth.uid()`가 있는 요청에서 `is_admin`을 **false→true로 스스로 올리는 것** 차단. SQL Editor(서비스/`auth.uid()` 없음)에서의 승격은 허용.
- Storage: 업로드 객체 키가 `auth.uid()` prefix로 시작하는 경우만 write; read는 소유자만 (private 버킷 + signed URL). 버킷 `outfit-photos`는 **대시보드에서 생성**하고 `storage.objects` 정책을 추가해야 함(SQL 마이그레이션만으로는 버킷 미생성).

## 트리거

- `auth.users` INSERT 시 `profiles` 자동 생성(닉네임 null, onboarding false).

## 마이그레이션

- 저장소 경로: `supabase/migrations/*.sql` (로컬 CLI 또는 대시보드에 수동 적용 안내).

## 환경 변수

| 변수 | 용도 |
|------|------|
| EXPO_PUBLIC_SUPABASE_URL / ANON_KEY | 모바일 앱 |
| VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY | 관리자 웹 `admin/` (anon만, 브라우저 노출) |
| SERVICE_ROLE_KEY | 마이그레이션·서버 전용, **클라이언트·관리자 웹에 넣지 않음** |

## 푸시 (MVP 하한)

- 원격 푸시: Expo Push + EAS 크레덴셜 필요 → **MVP 코드 경로**: `expo-notifications`로 **로컬 알림** 스케줄(선택) 또는 설정 화면에서 “알림 권한만 요청” 수준. PRD P0 “기본 푸시”는 문서상 완료 조건이므로, **권한 요청 + 로컬 테스트 가능한 리마인더 1종**으로 게이트 충족.
