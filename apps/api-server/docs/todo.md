# 📋 [api-server] 작업 현황 및 TODO (`docs/todo.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 항목은 승인자가 한눈에 이해할 수 있도록 자연스러운 한국어로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 📌 1. 서비스 메타데이터 및 역할
- **스코프 ID (`Scope ID`)**: `api`
- **대상 경로**: `apps/api-server` (루트 작업은 루트 [`todo.md`](../../../todo.md)에서 통합 관리)
- **기술 스택**: `Node.js 22 (node:sqlite) + Express 5 + TypeScript + Zod + Vitest + Supertest`
- **최종 업데이트**: `2026-11-01`
- **핵심 역할**: 다중 호스트(`host-vite:3000`, `host-rspack:3001`)와 도메인 리모트(`remote-products:3002`, `remote-cart:3003`)가 공통으로 바라보는 단일 영속성 계층(`mfe_study.db`)과 표준 엔벨로프 기반 REST API(`Port 4000`) 및 상시 동기화되는 3종 SQL 세트를 제공합니다.
- **노출 모듈 (`exposes`) / API 엔드포인트**:
  - `GET /api/health`
  - `GET /api/schema-comments`
  - `GET /api/users`
  - `POST /api/auth/login`
  - `GET /api/products`
  - `GET /api/cart`
  - `POST /api/cart`
  - `DELETE /api/cart/:id`
- **소비 모듈 (`remotes`) / 외부 의존성**: `N/A` (독립 백엔드 서버 — 로컬 마이크로 앱 코드 참조 0%)
- **전용 실행 · 테스트 · DB 관리 명령어** ([전체 서비스 레지스트리 정본](../../../docs/service-registry.md) 참조):
  - 개발 서버 기동: `pnpm --filter @mfe-study/api-server dev`
  - 단독 테스트 / 타입체크: `pnpm --filter @mfe-study/api-server test` / `pnpm --filter @mfe-study/api-server typecheck`
  - DB 3종 SQL 관리: `pnpm --filter @mfe-study/api-server db:setup` (`03->01->02` 클린 재설치) | `db:reset` (`01+02` 시드 리셋) | `db:schema` (`01` 스키마) | `db:drop` (`03` 전체 삭제)
  - 3종 SQL 해시 갱신 및 검증(루트): `pnpm sql:update` / `pnpm sql:verify`

---

## 🚀 2. 현재 진행 중인 작업
> 현재 활성화된 브랜치에서 진행 중인 작업입니다. (동시에 1개의 작업만 진행 권장)

- *(현재 진행 중인 작업이 없습니다)*

---

## 📝 3. 예정된 작업 목록 (백로그)
> 앞으로 이 서비스 스코프에서 진행할 작업 목록입니다. 작업 시작 시 `features/YYYYMMDD-<작업명>/` 폴더를 생성하고 위 섹션으로 이동합니다.

- [ ] **[Phase 2 연동 검토] 상품 단건 상세 조회 API (`GET /api/products/:id`)**: Phase 2 URL 라우팅(`/products/:id`) 확장 시 루트 정본 계약 협의 후 추가 검토
- [ ] **[Phase 3 연동 검토] 에러 추적 메타데이터 로깅 보강**: 분산 마이크로 앱 에러 출처 추적 실험 시 요청 헤더(`X-MFE-Origin`) 로깅 확장 검토

---

## ✅ 4. 완료된 작업 이력
> 사용자가 PR 머지를 승인한 직후, 실제 머지 실행 전에 완료 체크(`[x]`) 및 완료일을 기록합니다.

- [x] **[`20261031-sqlite-and-rest-api`](./features/20261031-sqlite-and-rest-api/01-plan-and-design.md)**: [Phase 1 - Step 1.1] 백엔드 API 서버 & 내장 SQLite 3종 SQL TDD 구축 (`Port 4000`, `2026-11-01` 완료)
  - **작업 브랜치**: `api/feat/sqlite-and-rest-api`
  - **산출물**: [01-plan-and-design.md](./features/20261031-sqlite-and-rest-api/01-plan-and-design.md), [02-tdd-spec.md](./features/20261031-sqlite-and-rest-api/02-tdd-spec.md), [03-code-review.md](./features/20261031-sqlite-and-rest-api/03-code-review.md)
