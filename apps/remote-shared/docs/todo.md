# 📋 [remote-shared] 작업 현황 및 TODO (`docs/todo.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 항목은 승인자가 한눈에 이해할 수 있도록 자연스러운 한국어로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 키워드는 그대로 영어로 표기합니다.

---

## 📌 1. 서비스 메타데이터 및 역할
- **스코프 ID (`Scope ID`)**: `shared`
- **대상 경로**: `apps/remote-shared` (루트 작업은 루트 [`todo.md`](../../../todo.md)에서 통합 관리)
- **기술 스택**: `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite + @ark-ui/react v5 + clsx + TanStack Query v5 + ky + Zod + date-fns + Vitest`
- **최종 업데이트**: `2026-11-06`
- **핵심 역할**: 모든 호스트(`host-vite:3000`, `host-rspack:3001`)와 도메인 리모트(`remote-products:3002`, `remote-cart:3003`)가 런타임 Module Federation으로 공유하는 **원격 공통 디자인 시스템(`@ark-ui/react` + `clsx` 단일 창구 캡슐화)**, **실시간 4종 시맨틱 테마 엔진(`ThemeProvider` + CSS 변수 + 표준 `z-index` 계층)**, 그리고 **공통 MFE 유틸리티(`mfeEventBus`, `useMfeEvent`, `createScopedStorage`, 포맷터, `httpClient`, 싱글톤 `sharedQueryClient`)**를 제공합니다 (`Port 3004`).
- **노출 모듈 (`exposes`)**:
  - `./ui` (`./src/exposed/ui.ts`): 기본 UI 5종(`Button`, `Heading`, `Select`, `Skeleton`, `Badge`), 인터랙티브 레이아웃 3종(`Splitter`, `Tabs`, `Collapsible`), 정적 레이아웃 5종(`Container`, `Grid`, `Flex`, `Stack`, `Card`), `clsx` 재노출
  - `./theme` (`./src/exposed/theme.ts`): `ThemeProvider`, `useTheme`, `Z_INDEX_TOKENS`, 시맨틱 테마 CSS 변수(`--mfe-*`)
  - `./utils` (`./src/exposed/utils.ts`): `MFE_EVENTS`, `mfeEventBus`, `useMfeEvent`, `createScopedStorage`, `formatCurrency`, `formatDate`, `formatRelativeTime`, `normalizeError`, `httpClient`, `createApiClient`, `sharedQueryClient`, `CART_QUERY_KEY`
- **소비 모듈 (`remotes`) / 외부 의존성**: `N/A` (최하위 기반 원격 모듈 — 다른 마이크로 앱 코드 및 리모트 의존성 0%)

---

## 🚀 2. 현재 진행 중인 작업
> 현재 활성화된 브랜치에서 진행 중인 작업입니다. (동시에 1개의 작업만 진행 권장)

- *(현재 진행 중인 작업이 없습니다)*

---

## 📝 3. 예정된 작업 목록 (백로그)
> 앞으로 이 서비스 스코프에서 진행할 작업 목록입니다. 작업 시작 시 `features/YYYYMMDD-<작업명>/` 폴더를 생성하고 위 섹션으로 이동합니다.

- [ ] **[Phase 2 연동 검토] 공통 내비게이션/브레드크럼 프리미티브 확장**: Phase 2 URL 라우팅 전환 시 도메인 리모트와 호스트가 함께 사용할 링크/탭 라우팅 보조 UI 검토
- [ ] **[Phase 3 연동 검토] 원격 에러 추적(`moduleMetadata`) 로거 유틸리티 확장**: 분산 마이크로 앱 콜스택 출처 추적 시 `./utils` 에러 정규화 메타데이터 확장 검토

---

## ✅ 4. 완료된 작업 이력
> 사용자가 PR 머지를 승인한 직후, 실제 머지 실행 전에 완료 체크(`[x]`) 및 완료일을 기록합니다.

- [x] **[`20261102-ark-ui-and-utils`](./features/20261102-ark-ui-and-utils/01-plan-and-design.md)**: [Phase 1 - Step 1.2] 원격 공통 디자인 시스템(`Ark UI`), 실시간 4종 테마 및 MFE 공통 유틸리티 구축 (`Port 3004`) — `완료일: 2026-11-06`
  - **작업 브랜치**: `shared/feat/ark-ui-and-utils`
  - **설계 문서**: [01-plan-and-design.md](./features/20261102-ark-ui-and-utils/01-plan-and-design.md)
  - **TDD 명세**: [02-tdd-spec.md](./features/20261102-ark-ui-and-utils/02-tdd-spec.md)
  - **코드 리뷰**: [03-code-review.md](./features/20261102-ark-ui-and-utils/03-code-review.md)
