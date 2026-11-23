# 📋 [remote-cart] 작업 현황 및 TODO (`docs/todo.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 항목은 승인자가 한눈에 이해할 수 있도록 자연스러운 한국어로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 키워드는 그대로 영어로 표기합니다.

---

## 📌 1. 서비스 메타데이터 및 역할
- **스코프 ID (`Scope ID`)**: `cart`
- **대상 경로**: `apps/remote-cart` (루트 작업은 루트 [`todo.md`](../../../todo.md)에서 통합 관리)
- **기술 스택**: `Rsbuild (Rspack) + React 19 + TypeScript 5.7 + @module-federation/rsbuild-plugin + TanStack Query v5 + Zod + ky + es-toolkit + MSW + Vitest`
- **최종 업데이트**: `2026-11-23`
- **핵심 역할**: 장바구니 목록 조회(`GET /api/cart`), 수량 추가(`POST /api/cart`), 단건·전체 삭제(`DELETE /api/cart/:id`) 기능을 담당하는 **프로젝트 최초의 `Rspack (Rsbuild)` 기반 도메인 원격 마이크로 앱**입니다 (`Port 3003`). `Vite`로 빌드된 `remote_shared`(`Port 3004`)를 이종 번들러 간 Module Federation 2.0(`mf-manifest.json` + `@mf-types.zip`)으로 런타임 소비하면서, 상위 호스트(`host-vite:3000`, `host-rspack:3001`)에 `./CartWidget` 컴포넌트를 노출합니다.
- **노출 모듈 (`exposes`)**:
  - `./CartWidget` (`./src/exposed/CartWidget.tsx`): 장바구니 목록·합계 카드, `Mode A(CustomEvent 수신 재조회)` vs `Mode B(sharedQueryClient 공유 캐시 자동 감지)` 비교 학습 및 비인증 차단 통합 위젯 (`@mf-types.zip` 원격 타입 생성 포함)
- **소비 모듈 (`remotes`) / 외부 의존성**:
  - `remote_shared` (`http://localhost:3004/mf-manifest.json`): `remote_shared/ui`, `remote_shared/theme`, `remote_shared/utils` 런타임 소비 및 `@mf-types` 자동 동기화 (`@ark-ui/react`, `clsx` 직접 설치 0%, 무-Shim 소비)
  - `api-server` (`http://localhost:4000/api`): `GET /api/cart`, `POST /api/cart`, `DELETE /api/cart/:id` REST API 연동

---

## 🚀 2. 현재 진행 중인 작업
> 현재 활성화된 브랜치에서 진행 중인 작업입니다. (동시에 1개의 작업만 진행 권장)

- *현재 진행 중인 작업이 없습니다.*

---

## 📝 3. 예정된 작업 목록 (백로그)
> 앞으로 이 서비스 스코프에서 진행할 작업 목록입니다. 작업 시작 시 `features/YYYYMMDD-<작업명>/` 폴더를 생성하고 위 섹션으로 이동합니다.

- [ ] **[Phase 1 - Step 1.4 후속 개선] `Mode A` 자기 에코(Self-Echo) 제거 및 `QueryClient` 단위 동기화 채널 리팩토링** (`Branch: cart/refactor/queryclient-sync-channel`, 참조: [`Study 12`](../../../docs/study/12-mfe-event-self-echo-and-queryclient-sync.md)): `Symbol.for` `WeakMap<QueryClient, Channel>` + `selfEchoTokens` 1회 소비 스택 + `useSyncExternalStore` 사용자별 수신 카운터 도입, 쿼리 키 `['cart', userId, { ... }]` 정렬, `emit` 선행(`try/catch` 격리) → `await invalidateQueries` 1회 적용 및 3지표(수신 수/`invalidateQueries`/실제 `GET`) 8대 회귀 테스트 구축
- [ ] **[Phase 2 - Step 2.1] 장바구니 전용 라우트(`/cart`) 및 호스트 라우터 동기화**: 단독 실행과 호스트 결합 시 `MemoryHistory` 격리 라우팅 연동
- [ ] **[Phase 3 - Step 3.2] `Rsdoctor` (`@rsdoctor/rspack-plugin`) 번들·공유 의존성 진단 연동**: `Rspack` 공유 싱글톤 및 청크 크기 시각화 대시보드 연결

---

## ✅ 4. 완료된 작업 이력
> 사용자가 PR 머지를 승인한 직후, 실제 머지 실행 전에 완료 체크(`[x]`) 및 완료일을 기록합니다.

- [x] **[`20261123-cart-widget-sync`](./features/20261123-cart-widget-sync/01-plan-and-design.md)**: [Phase 1 - Step 1.4] 프로젝트 최초 `Rsbuild(Rspack)` 장바구니 원격 앱(`./CartWidget`, `Port 3003`), `Mode A vs Mode B` 대칭 동기화 및 단독 실행 쇼케이스 구축 — **완료일: `2026-11-23`** (PR #14)
  - **작업 브랜치**: `cart/feat/cart-widget-sync` (`Scope: cart`)
  - **관련 문서**: [01-plan-and-design.md](./features/20261123-cart-widget-sync/01-plan-and-design.md) | [02-tdd-spec.md](./features/20261123-cart-widget-sync/02-tdd-spec.md) | [03-code-review.md](./features/20261123-cart-widget-sync/03-code-review.md)
  - **핵심 성과**: `@module-federation/rsbuild-plugin@^2.9.3` 기반 `Rspack` ↔ `Vite(remote-shared:3004)` 이종 번들러 양방향 `@mf-types.zip` 무-Shim 연동, React 서브패스 3종(`jsx-runtime`/`jsx-dev-runtime`/`react-dom/client`) 명시 공유, `Mode A`(독립 캐시 + `useMfeEvent` 재조회) vs `Mode B`(싱글톤 `sharedQueryClient` 자동 감지) 대칭 구현 및 `syncCartAfterMutation` 공통 헬퍼 추출, 비인증 3중 차단, `.cart-*` 프리픽스·전역 태그 선택자 금지 정적 검증, 단독 실행 쇼케이스(`[샘플 상품 담기]` 포함), `Vitest 8개 파일 / 26건`(루트 전체 `124건`)·`rsbuild build`·무-Shim `typecheck`·`Biome` 전원 통과 (`docs/service-registry.md` 등록 완료)
