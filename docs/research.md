# Outfit Recommendation MVP — Research Notes

## Scope

그린필드 모바일 MVP(코디 추천·날씨·선호 저장 등)를 **Windows 개발 PC에서 가장 빠르게** 검증하는 데 초점을 둔 비교 요약이다.

## Assumptions (가정)

- 팀은 TypeScript/웹 생태계에 익숙하거나 익숙해질 수 있다.
- iOS는 **클라우드 빌드**(EAS 등)로 커버 가능하다(로컬 macOS 없음).
- 초기 트래픽은 낮고, 비용·운영 부담 최소화가 우선이다.
- 날씨는 **읽기 위주**이며 실시간 초단기 예보 정밀도는 MVP에서 과도하게 요구하지 않는다.

## Client: React Native (Expo) vs Flutter

| 관점 | Expo (RN) | Flutter |
|------|-----------|---------|
| Windows 로컬 개발 | Android 에뮬레이터·실기기로 즉시 반복 가능 | 동일하게 양호 |
| iOS 빌드 | EAS Build 등 원격 빌드로 해결([Expo Application Services](https://docs.expo.dev/build/introduction/)) | Codemagic/GitHub Actions 등 별도 파이프 필요 |
| 생태계 | npm, 기존 웹/TS 재사용 | Dart 전용 |
| 학습 곡선 | 웹 개발자에게 유리 | UI/상태 모델이 다름 |

**MVP 속도 관점 권장:** **Expo(RN)** — OTA 업데이트·푸시·빌드 파이프가 문서화되어 있고, TS 단일 스택으로 백엔드(Supabase 클라이언트)와 정렬하기 쉽다. 공식: [Expo Documentation](https://docs.expo.dev/), [React Native](https://reactnative.dev/).

## Backend: Supabase vs NestJS

- **Supabase(Postgres + Auth + Storage + Edge Functions):** 인증·DB·RLS로 MVP를 **서버 코드 최소화**로 올리기 좋다. [Supabase Docs](https://supabase.com/docs).
- **NestJS:** 비즈니스 로직·외부 연동이 복잡해지면 적합하나, **호스팅·배포·스키마·보안**을 직접 설계해야 MVP TTM이 늘어난다. [NestJS Documentation](https://docs.nestjs.com/).

**MVP 권장:** **Supabase**를 1차로 두고, 추천 엔진·배치 작업이 커지면 NestJS(또는 Supabase Edge Functions + 별도 서비스)로 분리 검토.

## Weather: Open-Meteo vs OpenWeather

- **Open-Meteo:** 상업 이용 가능, **API 키 없이**도 많은 용도에 사용 가능(정책·한도는 공식 문서 확인). [Open-Meteo API](https://open-meteo.com/en/docs).
- **OpenWeather:** 널리 쓰이나 **API 키 필수**, 무료 티어 한도·과금 정책 관리 필요. [OpenWeather API](https://openweathermap.org/api).

**MVP 권장:** **Open-Meteo**로 프로토타입·키 관리 부담을 줄이고, 제품 요구(브랜딩·특정 데이터 소스)가 생기면 OpenWeather 등으로 전환·병행.

## Push notifications (Expo 복잡도)

- 클라이언트는 `expo-notifications` + **Expo Push Service** 흐름이 문서화되어 있다. [Push notifications overview](https://docs.expo.dev/push-notifications/overview/).
- **복잡도 포인트:** FCM(Android)·APNs(iOS) 크레덴셜을 Expo/EAS에 연결, 프로덕션용 빌드 식별자, 토큰 만료·오류 재시도, 사용자 opt-in UX. 로컬 알림은 상대적으로 단순.
- **리스크:** 푸시 전용 백엔드를 직접 만들 경우(커스텀 서버 → FCM/APNs) 운영 부담이 커진다. MVP는 **Expo 권장 경로 + Supabase(스케줄/Edge 또는 외부 cron)로 푸시 페이로드만 전송**하는 패턴이 일반적.

## Recommended stack (fastest MVP on Windows)

1. **Expo (TypeScript)** + **Supabase** (Auth/DB/RLS; 필요 시 Edge Functions).
2. **Open-Meteo**로 날씨 입력(캐시·좌표 변환은 클라이언트 또는 Edge에서).
3. **Expo Push**로 알림(필요 시에만; MVP에서는 “날씨 알림” 등 범위를 좁혀 검증).

## Risks & open questions

| 항목 | 내용 |
|------|------|
| API 키 | OpenWeather 등 사용 시 키 유출 방지(클라이언트 하드코딩 금지, 서버/Edge에서 프록시). Supabase 서비스 롤 키는 **절대 앱에 넣지 않기**. [Supabase API keys](https://supabase.com/docs/guides/api/api-keys). |
| 푸시 | 스토어 계정·크레덴셜·iOS 프로비저닝이 지연 요인; MVP 일정에 버퍼 필요. |
| 데이터·개인정보 | 위치·선호 스타일 저장 시 동의·보관 정책 정리 필요. |
| 정확도 | **MVP는 규칙 기반 추천만 사용**한다. LLM·임베딩 유사도는 P2 이후 검토. |

---

## Admin console (addendum)

- **관리자 UI**는 브라우저에 **service_role 키를 넣지 않는다.** `profiles.is_admin` + RLS `SELECT` 확장으로 충분한 MVP.
- 운영자 지정은 DB에서만 수행해 오남용을 막는다.

*본 문서는 구현 전 기술 선택 메모이며, 최종 결정은 PRD·게이트 체크리스트와 함께 갱신한다.*
