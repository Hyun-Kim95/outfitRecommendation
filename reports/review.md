# Review

**범위**: 관리자 고도화 변경 세트  
- `supabase/migrations/20260408210000_admin_inquiries_notices_account_disabled.sql`  
- `admin`: UserDetail / UserEdit / OutfitDetail / Inquiries / InquiryDetail / Notices / NoticeForm, 라우트·Layout·Dashboard·Users·Outfits·SessionContext·스타일  
- `mobile`: `AuthContext`(`account_disabled` 시 로그아웃), `support-inquiry`, 설정 링크, `database.types.ts`, 루트 `_layout`  
**검토일**: 2026-04-08  
**빌드**: `admin` — `npm run build` exit 0 · `mobile` — `npm run typecheck` exit 0  

---

## 1. 빌드 / 테스트 상태

| 항목 | 결과 |
|------|------|
| admin `npm run build` | 통과 |
| mobile `npm run typecheck` | 통과 |
| E2E / 실제 Supabase에 마이그레이션 적용 후 RLS 통합 테스트 | 본 리뷰에서 **미실행** — 스테이징에서 `db push` 후 문의·공지·프로필 수정 시나리오 권장 |

---

## 2. 보안 (RLS · `is_admin` · 트리거)

### 잘 된 점

- **`is_admin` API 잠금**: `profiles_lock_is_admin_via_api`는 `auth.uid() is not null`일 때 `is_admin` 값 변경을 전면 차단. 자가 승격뿐 아니라 API 경로의 임의 변경을 막는 방향으로 이전 트리거보다 강함. SQL Editor(`auth.uid()` 없음) 승격 전략과 [UnauthorizedPage](../admin/src/pages/UnauthorizedPage.tsx) 안내와 정합.
- **`account_disabled` 본인 가드**: 본인 행에서만 API로 해당 컬럼 변경 차단. 관리자가 타인 행을 `profiles_admin_update_others`로 수정하는 경우 `new.id = auth.uid()`가 거짓이라 트리거에 걸리지 않음.
- **`profiles_admin_update_others`**: `id <> auth.uid()`로 타인만 갱신. 기존 `profiles_update_own`과 OR 결합으로 일반 사용자 본인 수정과 공존.
- **`support_tickets`**: 본인만 insert(`user_id = auth.uid()`), 조회는 본인 또는 관리자, 갱신은 관리자만. 타인 문의로 위장 insert 불가.
- **`app_notices`**: CUD는 관리자만. 일반 사용자는 활성·기간 내 행만 select — 의도된 노출 제어.
- **`is_admin()` SECURITY DEFINER**: RLS 재귀 없이 관리자 판별 — 기존 패턴 유지.

### 잠재 갭 (blocker 아님)

- **`profiles` INSERT와 `is_admin`**: **해소** — API 세션 `INSERT` 시 `is_admin` 강제 false 트리거(`profiles_force_is_admin_false_on_api_insert`) 추가.
- **관리자 웹과 `account_disabled`**: **해소** — `RequireAdmin`에서 `account_disabled`이면 `signOut` 및 안내 화면.
- **`app_notices`**: 정책이 `authenticated`에만 있음 — 비로그인 사용자에게 공지를 보여줄 계획이면 별도 `anon` 정책 또는 Edge/API 필요(현재 모바일에 공지 소비 UI 없음 — 제품 공백이지 RLS 버그는 아님).

---

## 3. API / 스키마 / 클라이언트 정합성

- **타입**: `mobile/lib/database.types.ts`의 `support_tickets`, `app_notices`, `profiles.account_disabled`가 마이그레이션과 대체로 일치.
- **관리자 UI 쿼리**: `support_tickets`·`app_notices` 컬럼 선택이 스키마와 맞음.
- **Non-blocker**: `UserEditPage` 등 `onError: (e: Error)` — Supabase 클라이언트가 던지는 객체가 항상 `Error` 인스턴스는 아닐 수 있어, 드물게 피드백 문자열이 비어 보일 수 있음.

---

## 4. SQL 정책·트리거 중복

- **`support_tickets_update_admin`**: `USING`과 `WITH CHECK`가 동일(`is_admin()`) — **의도적인 중복**이며 Postgres 관행상 문제 없음.
- **`profiles` BEFORE 트리거 2개**(`is_admin` 잠금 / `account_disabled` 가드): 역할이 분리되어 있어 유지보수는 수용 가능. 한 트리거로 합치면 마이그레이션 수는 줄지만 **필수는 아님**.

---

## 5. React / 관리자 UX

- **InquiryDetailPage**: 문의 본문·상태·관리자 답변 저장 흐름이 일관되고, RLS와 맞음. “다시 쓴다” 수준의 회귀는 코드상 뚜렷하지 않음.
- **Non-blocker — 문의 상세**: 제목 하단 사용자 표시가 **UUID 전체**라 가독성은 목록(앞 8자 축약)보다 거침. 닉네임 조인은 선택 개선.
- **Non-blocker — OutfitDetailPage `feedback_logs`**: `key={String(f.timing_type)}`는 동일 `timing_type`이 여러 행이면 충돌 가능(데이터 모델상 희귀). `id` 키 권장.
- **Non-blocker — 모바일 얼럿**: 이용 제한 메시지는 “설정의 **문의하기**”, 설정 버튼은 “**운영진에게 문의**”로 표현이 약간 어긋남 — 통일 권장.
- **Non-blocker — 비활성 계정 문의**: 제한된 사용자는 로그인 직후 로그아웃되어 앱 내 문의 화면에 도달하기 어려움. 문의는 이메일 등 외부 채널 안내를 고려할 수 있음.

---

## Blocker vs non-blocker 요약

| 구분 | 내용 |
|------|------|
| **Blocker** | **없음** (정적 코드·빌드 기준). 스테이징 DB 미적용 상태에서의 런타임 RLS 검증은 **미검증**. |
| **Non-blocker** | (보안 하드닝) `profiles` insert 경로 `is_admin` · (운영 일관성) 관리자 앱 `account_disabled` 미반영 · (제품) `app_notices` 앱 미소비·anon 부재 · (UX) UUID 표기·피드백 키·문구 통일 · (에러 타입) `instanceof Error` 가정 |

---

## 8. 리뷰 후 반영(동일 세션)

- **`profiles` API INSERT 시 `is_admin` 강제 false** 트리거를 마이그레이션에 추가함.
- **`RequireAdmin`**: `profile.account_disabled`이면 `signOut` 후 안내 화면(관리자 웹도 비활성 계정 차단).
- **Outfit 상세**: `feedback_logs` 행 키에 `id` 우선 사용.
- **모바일 이용 제한 얼럿**: 앱 내 문의에 도달하기 어려울 수 있어 “다른 채널” 안내로 문구 조정.

---

## 결론

- **RLS·트리거 설계는 요구사항(타인 프로필 수정, 문의/공지, `is_admin` API 금지, 본인 `account_disabled` 금지)과 대체로 잘 맞고, `is_admin` 우회용으로 보이는 명백한 클라이언트만의 우회 경로는 보이지 않음.**
- **배포 전** Supabase에 마이그레이션 적용 후, (1) 일반 사용자 문의 insert, (2) 비관리자의 공지/문의 타인 조회 불가, (3) 관리자 타인 `account_disabled` 토글, (4) 본인 `account_disabled` API 수정 거부, (5) API `is_admin` 변경 거부 를 한 번씩 확인하는 것이 좋음.
- 위 non-blocker는 게이트를 막지 않으나, 운영·보안 기준에 맞춰 우선순위를 두고 처리할 것을 권장.
