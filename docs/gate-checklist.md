# Gate Checklist

증거: [reports/test-report.md](../reports/test-report.md), [reports/review.md](../reports/review.md).  
기준: [.cursor/rules/00-workflow.mdc](../.cursor/rules/00-workflow.mdc).

## 필수 항목
- [x] PRD가 존재하고 실제 구현 범위와 일치한다 — [docs/prd.md](prd.md) 존재(정적); 최신 기능 커밋 시 재대조
- [x] 프론트엔드/백엔드 계획 문서가 존재한다 — [frontend-plan.md](frontend-plan.md), [backend-plan.md](backend-plan.md)
- [x] UI 변경이 있었다면 UI 명세가 업데이트되었다 — [ui-spec.md](ui-spec.md) 존재; **이번 변경은 문서·워크플로만이면 UI 변경 없음**
- [x] 빌드가 통과한다 — `mobile` typecheck, `admin` build (2026-04-08)
- [x] reports/test-report.md가 존재하고 최신 상태다
- [x] 관련 자동 테스트가 통과했거나, 명시적인 수동 검증 절차 및 결과가 기록되어 있다 — 자동 단위 테스트 없음 → PARTIAL·수동 절차·명령 결과 기록됨
- [ ] 주요 사용자 흐름이 end-to-end로 동작한다 — test-report §9 미검증
- [ ] validation 및 에러 처리가 검증되었다 — 런타임 전수 미검증(§10)
- [x] reports/review.md에 blocker가 남아 있지 않다
- [x] API/스키마 변경 사항이 문서화되었다 — 마이그레이션·backend-plan (코드 변경 없는 커밋이면 해당 없음)
- [x] 릴리즈 요약이 업데이트되었다 — [reports/release-note.md](../reports/release-note.md)

## UI / UX 품질
> test-report §16 기준. 완전 체크는 실기기/브라우저 확인 후.

- [x] 사용자 노출 라벨 및 문구가 명확하고 일관된다 — 정적 검토; Auth 일부는 매핑·원문 혼재 가능
- [x] 페이지 제목 / 화면 맥락이 올바르다 — admin title, 모바일 `app.json` 이름
- [ ] 성공, 에러, 로딩, 빈 상태가 검증되었다 — 코드 존재; 런타임 미전수
- [ ] validation 피드백이 명확하고 자연스럽다 — 기기 미검
- [ ] 액션 이후 이동 또는 피드백이 혼란스럽지 않다 — 체감 미검
- [x] placeholder 또는 어색한 UI 문구가 남아 있지 않다 — 프로덕션 노출은 입력 힌트 수준(정적)
- [x] 관련이 있다면 데스크톱과 모바일 사용감이 함께 고려되었다 — `admin`+`mobile` 빌드·구조

## blocker 정의
다음 중 하나라도 해당하면 안전한 머지 또는 기본 사용이 불가능하므로 blocker입니다.
- 빌드 실패
- 테스트 실패
- 주요 사용자 흐름 깨짐
- 심각한 API 불일치
- 파괴적인 마이그레이션 위험
- 보안 민감 이슈
