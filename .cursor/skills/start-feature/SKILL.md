---
name: start-feature
description: 작업명만 받아서 기본 프로젝트 워크플로를 end-to-end로 시작합니다
---

# start-feature

이 skill은 사용자가 짧게 작업명만 전달해도, 프로젝트 기본 작업 방식을 따라 기능 작업을 시작하기 위한 절차입니다.

## 목적
- 사용자의 반복 지시를 줄인다.
- 작업명만 받아도 계획 → 문서 → 구현 → 테스트 → 리뷰 → 게이트 → 문서화 흐름을 자동으로 시작한다.
- 필요한 subagent를 스스로 선택하게 한다.

## 사용 예시
- 이번 작업은 관리자 기능 고도화야. 시작해.
- 이번 작업은 회원가입 UX 개선이야. 시작해.
- 이번 작업은 관리자 통계 API 추가야. 시작해.

## 실행 절차
1. 작업명을 기준으로 현재 관련 코드, 문서, 구조를 조사한다.
2. 필요한 경우 research-agent를 사용한다.
3. 요구사항과 범위를 정리하고 docs/prd.md를 생성하거나 갱신한다.
4. 프론트엔드/백엔드 계획 문서를 생성하거나 갱신한다.
5. UI 영향이 있으면 docs/ui-spec.md를 생성하거나 갱신한다.
6. 필요한 subagent를 사용해 구현한다.
7. tester-agent를 사용해 검증하고 reports/test-report.md를 업데이트한다.
8. review-agent를 사용해 blocker와 회귀 위험을 점검하고 reports/review.md를 업데이트한다.
9. blocker가 있으면 blocker만 수정하고 재테스트한다.
10. docs/gate-checklist.md를 기준으로 게이트를 확인한다.
11. docs-agent를 사용해 reports/release-note.md 및 관련 문서를 업데이트한다.
12. README.md 업데이트가 필요한지 판단하고 필요하면 수정한다.

## subagent 선택 기준
- 도메인/기존 구조 조사 -> research-agent
- 요구사항/범위/MVP 정리 -> prd-agent
- UI/클라이언트 구현 -> frontend-agent
- API/서비스/스키마 구현 -> backend-agent
- 테스트/검증 -> tester-agent
- 품질/회귀/UX 리뷰 -> review-agent
- 문서화 -> docs-agent

## 보고 규칙
- 중간에는 blocker, 범위 변경, 중요한 의사결정이 있을 때만 사용자에게 보고한다.
- 그 외에는 end-to-end로 진행한다.
- 완료 시에는 아래만 요약한다:
  - 무엇을 했는지
  - 무엇을 검증했는지
  - blocker가 해결됐는지
  - 남은 리스크가 있는지

## 작업 원칙
- 먼저 구현하지 말고 계획과 문서를 준비한다.
- 관련 없는 파일은 건드리지 않는다.
- 기능이 technically 동작해도 UX가 어색하면 완료로 간주하지 않는다.
- 자동 테스트가 없으면 수동 검증 절차를 남긴다.
- 외부 서비스 제한이 있더라도 가능한 대체 검증을 수행한다.