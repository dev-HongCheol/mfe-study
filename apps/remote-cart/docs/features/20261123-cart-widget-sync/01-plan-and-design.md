# 📐 [기획 및 설계] 장바구니 원격 앱(`./CartWidget`, `Rspack`) 및 `Mode A vs Mode B` 동기화 구축 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Suspense`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261123-cart-widget-sync` |
| **서비스 스코프 (`Scope ID`)** | `cart` (`apps/remote-cart`, `Port 3003`) |
| **작업 브랜치** | `cart/feat/cart-widget-sync` (패턴 A) |
| **기술 스택 / 번들러** | `Rsbuild (Rspack) + React 19 + TypeScript 5.7 + @module-federation/rsbuild-plugin + TanStack Query v5 + Zod + ky + es-toolkit + MSW + Vitest` |
| **작성일** | `2026-11-23` |
| **작업 규모 평가** | `적정 (단일 PR)` — 최초 Rspack 리모트 앱 세팅, `./CartWidget`(`Mode A vs Mode B`), CSS 격리/오염 비교 토글, 비인증 차단 및 `MSW` 기반 TDD 테스트 일괄 구축 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- `api-server(4000)`, `remote-shared(3004, Vite)`, `remote-products(3002, Vite)` 구축에 이어, 장바구니 조회·수량 추가·단건 삭제·전체 비우기를 담당하는 **장바구니 원격 앱(`remote-cart`, `Port 3003`)**을 구축합니다.
- 본 앱은 우리 워크스페이스에서 **최초로 도입하는 `Rspack (Rsbuild)` 기반 마이크로 앱**으로, `Vite 7`로 빌드·서빙되는 `remote-shared(3004)`를 **이종 번들러 간 Module Federation 2.0(`mf-manifest.json` + `@mf-types.zip`)**으로 소비하면서 동시에 `host-vite(3000)`와 `host-rspack(3001)` 양쪽 호스트에 `./CartWidget`을 노출하는 교차 번들러 아키텍처를 실증합니다.
- 또한 상품 앱(`remote-products`)에서 상품을 담았을 때 장바구니 위젯이 최신 상태로 동기화되는 두 가지 전략(**`Mode A: CustomEvent 수신 후 독립 QueryClient 재조회`** vs **`Mode B: 싱글톤 sharedQueryClient 캐시 무효화 자동 감지`**)과 **CSS 스타일 격리(`cssIsolated: true`) vs 비격리 오염(`cssIsolated: false`) 비교 실험**을 제공합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **이종 번들러 교차 Module Federation 2.0 (`Rspack` ↔ `Vite`) 및 무-Shim `@mf-types` 소비 ([Study 04 #04](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md), [Study 09](../../../../../docs/study/09-mfe-shared-types-and-design-system-encapsulation.md))**:
  - `remote-shared(3004)`가 `PR #10`에서 `ComponentPropsWithoutRef` 기반으로 UI 13종 Props를 경계 캡슐화(`@ark-ui/react` 누출 `0건`)했으므로, `remote-cart` 역시 `@ark-ui/react`·`clsx`를 설치하지 않고 임시 타입 Shim(`0줄`) 없이 순수 `@mf-types`만으로 정적 타입 검사를 통과합니다.
  - `Rspack` 파일 워처가 실시간 갱신되는 `@mf-types/` 폴더를 소스 변경으로 오인해 무한 재컴파일하는 문제를 막기 위해 `tools.rspack.watchOptions.ignored`에 `@mf-types` 및 `.mf` 경로를 제외 등록합니다.
- **수신 측 `Mode A` vs `Mode B` 상태 동기화 대칭 구현 ([Study 01](../../../../../docs/study/01-mfe-concepts-and-guide.md), [Study 04 #09](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md), [Study 05 #01](../../../../../docs/study/05-fullstack-service-real-world-issues.md))**:
  - **`Mode A ('mode-a-event')`**: `remote-cart` 전용 독립 `QueryClient`를 조건부 지연 생성해 주입하고, `useMfeEvent(MFE_EVENTS.CART_UPDATED, ...)` 훅으로 이벤트를 수신할 때만 자체 `['cart', userId]` 캐시를 `invalidateQueries`로 재조회합니다 (`sharedQueryClient` 미사용).
  - **`Mode B ('mode-b-query')`**: `remote_shared/utils`의 싱글톤 `sharedQueryClient`를 주입하고, `mfe:cart-updated` 이벤트 수신에 의존하지 않고도 `remote-products`가 `sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })`를 호출하는 즉시 자동으로 장바구니 목록이 재조회됨을 입증합니다.
  - 수량 증가(`POST /api/cart`) 및 단건·전체 삭제(`DELETE /api/cart/:id`) 시에도 `onMutate`에서 `cancelQueries`를 호출해 응답 역전(`Race Condition`)을 차단합니다.
- **비인증(미로그인) 3중 차단, CSS 격리 실험, 파생 상태 및 `DEV`/`PROD` 에러 진단 이원화 ([Study 04 #05](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md), [Study 05 #03, #04, #10, #13, #16](../../../../../docs/study/05-fullstack-service-real-world-issues.md))**:
  - `userId`가 없거나 `null`/공백이면 임의 유저(`'user-1'`)로 절대 폴백하지 않고 `useCartQuery`의 `enabled: false` + API/뮤테이션 가드 + 로그인 필요 안내 UI 3중 방어를 적용합니다 (`SSOT § 5.4.3`).
  - 총 수량과 총 금액은 `useState + useEffect` 없이 렌더링 본문에서 정수 연산(`es-toolkit`의 `sumBy`)으로 즉시 계산(파생 상태)하며 `formatCurrency` 및 `tabular-nums` 고정폭 숫자로 흔들림을 방지합니다.
  - `cssIsolated` 토글로 `.cart-*` 프리픽스·시맨틱 CSS 변수 격리 상태(`true`)와 비격리 스타일 오염 시뮬레이션 상태(`false`)를 실시간 비교 관찰하고 `mfe:css-isolation-changed` 이벤트를 연동합니다.

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**: [Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)](../../../../../docs/features/20261027-phase1-service-contracts/01-plan-and-design.md) 및 [서비스 레지스트리 (`service-registry.md`)](../../../../../docs/service-registry.md)
- **참조 항목(섹션 제목)**:
  - `§ 5.1.1 표준 API 응답 엔벨로프 계약 (ApiResponse<T> & ApiErrorPayload)`
  - `§ 5.1.2 데이터베이스 4대 테이블 및 도메인 엔티티 계약 (CartItemView, HostOriginType)`
  - `§ 5.1.3 REST API 7대 엔드포인트 요청·응답 상세 명세 (#6 GET /api/cart, #7 POST /api/cart, #8 DELETE /api/cart/:id)`
  - `§ 5.2.1 표준 커스텀 이벤트 이름 상수 (MFE_EVENTS)`
  - `§ 5.2.2 이벤트별 페이로드 인터페이스 및 Zod 검증 스키마 (CartUpdatedEventPayload, AuthChangedEventPayload, SyncModeChangedEventPayload, CssIsolationChangedEventPayload)`
  - `§ 5.3 원격 공통 모듈(remote-shared, Port 3004) 노출(exposes) 시그니처 계약 (§ 5.3.1 ~ § 5.3.3)`
  - `§ 5.4.1 상태 동기화 비교 모드 타입 (SyncMode) 및 동작 규약`
  - `§ 5.4.3 remote_cart/CartWidget 노출 컴포넌트 Props 계약 (CartWidgetProps)`
  - `§ 5.5 Module Federation 2.0 공통 공유 의존성(shared singleton) 및 포트·CORS 계약 (#1 ~ #4)`
  - `service-registry.md § 4.3 타 서비스(products, cart, host-vite, host-rspack) 필수 소비 규칙 6대 원칙`

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `@rsbuild/core`, `@rsbuild/plugin-react`, `@module-federation/rsbuild-plugin`, `@tanstack/react-query` (`v5.74.4`), `msw` (`v2.7.0`)
- **핵심 스펙 및 주의사항**:
  1. **`Rsbuild` (`rsbuild.config.ts`) 서버·CORS·에셋 경로·워처 설정**:
     - `server: { port: 3003, strictPort: true, cors: { origin: '*' } }`로 고정 포트와 크로스 오리진 매니페스트 요청을 허용합니다 (`Study 04 #03`).
     - `output: { assetPrefix: 'auto' }`를 지정해 호스트(`3000`, `3001`)에 마운트될 때도 리모트 에셋·청크가 호스트 출처가 아닌 `remote-cart(3003)` 기준으로 해석되도록 보장합니다 (`Study 04 #02`).
     - `tools: { rspack: { watchOptions: { ignored: ['**/node_modules/**', '**/@mf-types/**', '**/.mf/**'] } } }`를 설정해 `@mf-types` 갱신 시 Rspack의 무한 재컴파일 루프를 원천 방지합니다 (`Study 04 #04 ⑥`).
  2. **`@module-federation/rsbuild-plugin` (`pluginModuleFederation`) 양방향 설정 및 이종 번들러(Vite ↔ Rspack) 호환성**:
     - `remotes: { remote_shared: 'remote_shared@http://localhost:3004/mf-manifest.json' }`를 지정하면, `mf-manifest.json` 내부에 기록된 Vite 공급자의 `remoteEntry.type: 'module'` 메타데이터를 런타임이 자동 해석하여 이종 번들러 간 모듈 로딩을 수행합니다.
     - `exposes: { './CartWidget': './src/exposed/CartWidget.tsx' }`와 `filename: 'remoteEntry.js'`, `manifest: true`를 설정하여 `host-vite(3000)` 및 `host-rspack(3001)` 양쪽 모두에서 소비할 수 있도록 노출합니다.
     - `dts: { generateTypes: { tsConfigPath: './tsconfig.json', abortOnError: false }, consumeTypes: { typesOnBuild: true, abortOnError: false } }` 및 `dev: { disableDynamicRemoteTypeHints: true }`를 적용해 불필요한 WebSocket 연결 에러를 차단하면서 양방향 `@mf-types` 동기화를 유지합니다.
  3. **2단 비동기 부트스트랩 및 원격 함수 지연 초기화**:
     - `source: { entry: { index: './src/main.ts' } }`에서 `import('./bootstrap')`으로 비동기 경계를 분리하여 `eager consumption` 에러를 방지하며, `createScopedStorage('cart')`는 모듈 최상단이 아닌 지연 초기화 Getter(`getCartScopedStorage()`)로 호출합니다 (`Study 04 #01`).

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> 모든 React 컴포넌트(`.tsx`)는 `1 컴포넌트 = 1 파일` 원칙으로 분리하고 파일명을 대문자(`PascalCase`)로 시작합니다.

| 구분 (`NEW` / `MOD`) | 파일 경로 (서비스 루트 기준 / 루트 파일은 루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `docs/todo.md` | `cart` 서비스 스코프 전용 작업 현황 및 백로그 관리 문서 |
| `NEW` | `docs/features/20261123-cart-widget-sync/01-plan-and-design.md` | 본 기획 및 상세 설계 문서 |
| `NEW` | `docs/features/20261123-cart-widget-sync/02-tdd-spec.md` | 단위·통합 TDD 테스트 명세서 |
| `NEW` | `package.json` | `@mfe-study/remote-cart` 매니페스트 (`Rsbuild` + `@module-federation/rsbuild-plugin`, `catalog:` 공유 의존성 사용, `@ark-ui/react`·`clsx` 미설치) |
| `NEW` | `tsconfig.json` | 루트 `tsconfig.base.json` 상속 + `./@mf-types/*` 경로 매핑 설정 |
| `NEW` | `rsbuild.config.ts` | Port `3003`, `strictPort: true`, `cors`, `assetPrefix: 'auto'`, `remote_shared` 소비, `./CartWidget` 노출, `watchOptions.ignored` 및 `dts` 설정 |
| `NEW` | `vitest.config.ts` | `jsdom` 환경 및 `remote_shared/*` 로컬 테스트 스텁 `resolve.alias` 매핑 설정 |
| `NEW` | `src/rsbuild-env.d.ts` | `@rsbuild/core/types` 환경 타입 선언 (`@ark-ui/react` 임시 Shim `0줄` 유지) |
| `NEW` | `src/main.ts` | `eager consumption` 방지를 위한 비동기 `import('./bootstrap')` 진입 스크립트 (`.ts`) |
| `NEW` | `src/bootstrap.tsx` | 단독 실행 시 `ThemeProvider`와 `<App />`을 `#root`에 마운트하는 부트스트랩 엔트리 |
| `NEW` | `src/App.tsx` | `http://localhost:3003` 단독 실행 쇼케이스(유저·동기화모드·CSS 격리·테마·1.5초 지연 토글 및 테스트용 `mfe:cart-updated` 이벤트 시뮬레이터) |
| `NEW` | `src/exposed/CartWidget.tsx` | Module Federation `./CartWidget` 공개 진입 컴포넌트 — `syncMode`에 따라 독립 `QueryClient`(`Mode A`) 또는 싱글톤 `sharedQueryClient`(`Mode B`)를 선택 주입 (`PascalCase`) |
| `NEW` | `src/features/cart/model/cart-schema.ts` | `CartItemView`·`DeleteCartResult` `Zod` 스키마, `normalizeUserId`, `calculateCartTotals`(파생 합계 계산), `getCartScopedStorage()`(Lazy Getter), 환경별(`DEV`/`PROD`) 에러 리포트 이원화(`formatCartErrorReport`) (`+ cart-schema.test.ts`) |
| `NEW` | `src/features/cart/api/cart-api.ts` | `createApiClient` + `unwrapApiResponse` 기반 `fetchCartItems`, `postIncrementCartItem`, `deleteCartItemApi` 및 `AbortSignal` 연동 `delayWithSignal` (`+ cart-api.test.ts`) |
| `NEW` | `src/features/cart/model/use-cart-queries.ts` | `useCartQuery`(`enabled: Boolean(userId)`), `Mode A`(`useMfeEvent` 재조회) vs `Mode B`(`sharedQueryClient`) 동기화 및 `useIncrementCartMutation` / `useDeleteCartMutation` 훅 |
| `NEW` | `src/features/cart/ui/cart.css` | `.cart-*` 프리픽스 격리 스타일, `var(--mfe-*)` 시맨틱 변수, `min-width: 0` 말줄임, `tabular-nums` 숫자 정렬 및 `data-css-isolated="false"` 스타일 오염 비교 실험 스타일 |
| `NEW` | `src/features/cart/ui/CartHeaderBar.tsx` | 동기화 모드(`Mode A`/`Mode B`)·호스트 출처·CSS 격리 상태 배지 및 이벤트 수신 카운터 표시 헤더 컴포넌트 (`PascalCase`, `+ CartHeaderBar.test.tsx`) |
| `NEW` | `src/features/cart/ui/CartItemRow.tsx` | 개별 장바구니 항목 행 — 상품명 말줄임, 출처 배지, 단가·소계(`tabular-nums`), 중복 클릭 방지(`isPending`) `[+1]`·`[삭제]` 버튼 (`PascalCase`, `+ CartItemRow.test.tsx`) |
| `NEW` | `src/features/cart/ui/CartSummaryCard.tsx` | 파생 총 수량·총 금액(`formatCurrency`) 요약 및 `[장바구니 비우기]` 버튼 컴포넌트 (`PascalCase`, `+ CartSummaryCard.test.tsx`) |
| `NEW` | `src/features/cart/ui/CartSkeleton.tsx` | 1.5초 지연 로딩 시 실제 항목 카드 높이와 1:1 매칭되어 CLS를 방지하는 스켈레톤 컴포넌트 (`PascalCase`) |
| `NEW` | `src/features/cart/ui/CartErrorBanner.tsx` | 조회·수정·삭제 실패 시 공통 사용하는 `role="alert"` 인라인 에러 배너(`[다시 시도]` 복구 버튼 및 `DEV` 스키마 불일치 진단 블록 포함) (`PascalCase`, `+ CartErrorBanner.test.tsx`) |
| `NEW` | `src/features/cart/ui/CartContent.tsx` | 비로그인 차단 안내 / 로딩 스켈레톤 / 조회 에러 복구 / 빈 장바구니 안내 / 항목 목록 + 요약 카드 5가지 상태를 Early Return으로 분기 렌더링 (`PascalCase`, `+ CartContent.test.tsx`) |
| `NEW` | `src/features/cart/ui/CartWidgetView.tsx` | `useCartQuery`, `Mode A` 이벤트 구독(`useMfeEvent`), CSS 격리 토글 상태, `DEV` 콘솔 에러 진단 및 하위 UI 조합 메인 뷰 (`PascalCase`) |
| `NEW` | `src/testing/setup.ts` | `@testing-library/jest-dom/vitest`, `jsdom` + Node `undici` `AbortSignal` 호환 어댑터 및 `MSW` 서버 생명주기 설정 |
| `NEW` | `src/testing/stubs/remote-shared-ui.tsx` | `Vitest` 단독 실행용 `remote_shared/ui` 경량 로컬 스텁 |
| `NEW` | `src/testing/stubs/remote-shared-theme.tsx` | `Vitest` 단독 실행용 `remote_shared/theme` 경량 로컬 스텁 |
| `NEW` | `src/testing/stubs/remote-shared-utils.ts` | `Vitest` 단독 실행용 `remote_shared/utils` 로컬 스텁 (실제 `QueryClient`, `CustomEvent` 버스, `ky` 연동) |
| `NEW` | `src/testing/msw/handlers.ts` | `GET /api/cart`, `POST /api/cart`, `DELETE /api/cart/:id` 표준 응답 봉투 및 `OUT_OF_STOCK` / `NOT_FOUND` 모킹 핸들러 |
| `NEW` | `src/testing/msw/server.ts` | `msw/node` 기반 `setupServer` 인스턴스 |
| `NEW` | `src/__tests__/CartWidget.integration.test.tsx` | `CartWidget` 전체 플로우, `Mode A` vs `Mode B` 동기화 비교, 비인증 차단, CSS 격리 토글, 지연 스켈레톤 및 아키텍처 무결성 통합 테스트 |
| `MOD` | `(루트) vitest.config.ts` | 루트 통합 `Vitest` 프로젝트 배열에 `'apps/remote-cart/vitest.config.ts'` 추가 *(루트 등록 시 별도 허용 또는 머지 단계 점검)* |
| `MOD` | `(루트) docs/service-registry.md` | **(5단계-C 머지 직전 필수 갱신)** `remote-cart` 명령어, `./CartWidget` 노출 시그니처 및 이종 번들러 소비 현황 등록 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`
> 공통 API 엔벨로프, 도메인 엔티티(`CartItemView`), 이벤트 페이로드 및 `CartWidgetProps` 원본 계약은 **루트 정본(`§ 5.1 ~ § 5.4.3`)을 그대로 준수**하며, 아래에는 `remote-cart` 내부 런타임 검증 스키마, 파생 합계 모델, 환경별(`DEV`/`PROD`) 에러 리포트 및 API 입출력 인터페이스를 정의합니다. 모든 인터페이스 속성에는 `/** ... */` 한글 설명 주석을 필수로 작성합니다.

```ts
import { z } from 'zod';
import type {
  HostOriginType,
  NormalizedError,
  ScopedStorage,
  SyncMode,
} from 'remote_shared/utils';

/**
 * @description 장바구니 리모트(remote-cart, Port 3003)의 노출 컴포넌트 Props 계약 (루트 SSOT § 5.4.3 + 테스트 가속용 delayMs 선택 확장)
 */
export interface CartWidgetProps {
  /** 현재 로그인된 사용자 고유 ID (미지정·null·공백 시 비로그인 상태 — 임의 유저 폴백 금지) */
  userId?: string | null;

  /** 이 컴포넌트를 마운트한 상위 호스트 종류 (기본값: 'standalone') */
  hostType?: HostOriginType;

  /** 상태 동기화 아키텍처 비교 모드 (미지정 시 mfe:sync-mode-changed 구독, 기본값: 'mode-a-event') */
  syncMode?: SyncMode;

  /** 1.5초 네트워크 로딩 지연(Skeleton UI 확인) 시뮬레이션 활성화 여부 (기본값: false) */
  simulateDelay?: boolean;

  /** 로딩 지연 시간(ms) 오버라이드 (테스트 가속용, 기본값: 1500) */
  delayMs?: number;

  /** CSS 스타일 오염(false) vs CSS 프리픽스/모듈 격리(true) 비교 실험 토글 (기본값: true) */
  cssIsolated?: boolean;

  /** 백엔드 API 기본 URL 오버라이드 (기본값: 'http://localhost:4000/api') */
  apiBaseUrl?: string;
}

/**
 * @description 단일 장바구니 조인 뷰 항목 런타임 검증용 Zod 스키마 (루트 SSOT § 5.1.2 CartItemView 1:1 매핑)
 */
export const cartItemViewSchema = z.object({
  id: z.number().int().positive(),
  userId: z.string().min(1),
  productId: z.number().int().positive(),
  productName: z.string().min(1),
  price: z.number().int().nonnegative(),
  category: z.enum(['electronics', 'office', 'accessories']),
  quantity: z.number().int().positive(),
  addedFromHost: z.enum(['vite', 'rspack', 'standalone']),
  createdAt: z.string().min(1),
});

/**
 * @description 장바구니 항목 목록 응답 검증용 Zod 스키마
 */
export const cartItemListSchema = z.array(cartItemViewSchema);

/**
 * @description DELETE /api/cart/:id 삭제 응답 검증용 Zod 스키마 (루트 SSOT § 5.1.3 #8)
 */
export const deleteCartResultSchema = z.object({
  deletedId: z.union([z.number().int().positive(), z.literal('all')]),
  deletedCount: z.number().int().nonnegative(),
});

/**
 * @description 장바구니 항목 배열로부터 렌더링 본문에서 즉시 계산되는 파생 요약 인터페이스 (Study 05 #03, #04)
 */
export interface CartTotalsSummary {
  /** 장바구니에 담긴 고유 상품 종류 개수 */
  itemCount: number;

  /** 모든 상품의 수량 합계 (정수) */
  totalQuantity: number;

  /** 모든 상품의 원화 총금액 합계 (정수 연산) */
  totalPrice: number;
}

/**
 * @description 장바구니 리모트 로컬 스토리지에 저장되는 UI 환경 설정 스키마 (mfe:cart:preferences)
 */
export const cartPreferencesSchema = z.object({
  /** 최근 선택한 CSS 격리 실험 토글 상태 */
  cssIsolated: z.boolean(),
});

/**
 * @description 장바구니 리모트 로컬 스토리지 환경 설정 인터페이스
 */
export interface CartPreferences {
  /** 최근 선택한 CSS 격리 실험 토글 상태 (true: 격리, false: 비격리 오염 실험) */
  cssIsolated: boolean;
}

/**
 * @description GET /api/cart 목록 조회 요청 파라미터 인터페이스
 */
export interface FetchCartItemsParams {
  /** 조회 대상 사용자 고유 ID (필수) */
  userId: string;

  /** 백엔드 API 기본 URL (기본값: DEFAULT_API_BASE_URL) */
  apiBaseUrl?: string;

  /** 1.5초 네트워크 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay?: boolean;

  /** 로딩 지연 시간(ms) 오버라이드 (기본값: 1500) */
  delayMs?: number;

  /** TanStack Query가 주입하는 요청 취소용 AbortSignal */
  signal?: AbortSignal;
}

/**
 * @description DELETE /api/cart/:id 삭제 요청 입력 인터페이스
 */
export interface DeleteCartItemInput {
  /** 삭제 대상 장바구니 항목 ID 또는 전체 비우기 키워드('all') */
  targetId: number | 'all';

  /** 장바구니 소유 사용자 고유 ID */
  userId: string;

  /** 삭제된 상품 ID (mfe:cart-updated 이벤트 페이로드 기록용, 전체 비우기 시 생략) */
  productId?: number;

  /** 삭제된 상품명 (mfe:cart-updated 이벤트 페이로드 기록용, 전체 비우기 시 생략) */
  productName?: string;

  /** 요청이 발생한 호스트 출처 ('vite' | 'rspack' | 'standalone') */
  hostType: HostOriginType;

  /** 현재 상태 동기화 모드 ('mode-a-event' | 'mode-b-query') */
  syncMode: SyncMode;

  /** 백엔드 API 기본 URL */
  apiBaseUrl?: string;
}

/**
 * @description Zod 스키마 검증 실패(RESPONSE_SCHEMA_INVALID) 시 개별 필드 불일치 좌표 인터페이스 (Study 05 #10)
 */
export interface CartSchemaIssueDetail {
  /** 실패한 데이터 경로 문자열 (예: '[0].price', 'deletedCount') */
  path: string;

  /** Zod 이슈 코드 (예: 'invalid_type', 'too_small') */
  code: string;

  /** 상세 실패 사유 메시지 */
  message: string;
}

/**
 * @description 실행 환경(DEV vs PROD)별로 이원화된 장바구니 에러 리포트 인터페이스 (Study 05 #10)
 */
export interface CartErrorReport {
  /** 표준 에러 코드 */
  code: string;

  /** 사용자 표시용 안내 메시지 */
  userMessage: string;

  /** 개발 환경(DEV) 전용 스키마 불일치 필드 목록 (PROD에서는 항상 빈 배열) */
  devDetails: CartSchemaIssueDetail[];
}

/**
 * @description 원격 모듈 Top-Level 즉시 호출 경합을 방지하는 지연 초기화 스토리지 Getter (Study 04 #01)
 */
export declare function getCartScopedStorage(): ScopedStorage;

/**
 * @description 사용자 ID를 정규화하여 비로그인(undefined/null/공백) 시 임의 유저 폴백을 차단하는 함수 (SSOT § 5.4.3)
 */
export declare function normalizeUserId(rawUserId?: string | null): string | null;

/**
 * @description 장바구니 항목 목록에서 총 품목 수·총 수량·원화 총액을 정수 연산으로 산출하는 파생 상태 함수
 */
export declare function calculateCartTotals(
  items: ReadonlyArray<{ price: number; quantity: number }>,
): CartTotalsSummary;

/**
 * @description 정규화된 에러를 환경(DEV vs PROD)별 에러 리포트로 변환하는 함수
 */
export declare function formatCartErrorReport(
  error: NormalizedError,
  isDev?: boolean,
): CartErrorReport;
```

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`cart` 전용)
- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared` / `dts`)**:
  - **컨테이너 이름 및 포트**: `name: 'remote_cart'`, `filename: 'remoteEntry.js'`, `manifest: true`, `Port 3003` (`strictPort: true`, `cors: { origin: '*' }`, `output.assetPrefix: 'auto'`)
  - **노출 모듈 (`exposes`)**: `'./CartWidget': './src/exposed/CartWidget.tsx'`
  - **소비 모듈 (`remotes`)**: `remote_shared: 'remote_shared@http://localhost:3004/mf-manifest.json'` (`Vite 7` 공급자 ↔ `Rspack` 소비자 이종 번들러 연동)
  - **공유 의존성 (`shared` & `singleton`)**: `react` (`^19.1.0`), `react-dom` (`^19.1.0`), `@tanstack/react-query` (`^5.74.4`) 모두 `singleton: true`
  - **원격 타입 양방향 동기화 (`dts` & `dev` & `watchOptions`)**:
    - `dts: { generateTypes: { tsConfigPath: './tsconfig.json', abortOnError: false }, consumeTypes: { typesOnBuild: true, abortOnError: false } }`
    - `dev: { disableDynamicRemoteTypeHints: true }`
    - `tools.rspack.watchOptions.ignored`: `['**/node_modules/**', '**/@mf-types/**', '**/.mf/**']`
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**:
  - **단독 실행 (`src/main.ts` → `src/bootstrap.tsx` → `src/App.tsx`)**: `ThemeProvider`로 감싸고 상단에 유저(`게스트 (비로그인)` · `user-1` · `user-2`)·동기화모드(`Mode A` ↔ `Mode B`)·CSS 격리 토글·테마·1.5초 지연 컨트롤 바 및 **테스트용 `mfe:cart-updated` 원격 이벤트 발송 시뮬레이터 버튼**을 배치하여 `Port 3003` 단독으로도 두 동기화 모드와 비인증 차단을 즉시 검증할 수 있게 합니다.
  - **호스트 결합 (`src/exposed/CartWidget.tsx`)**: 라우터나 전역 CSS Reset을 포함하지 않으며, 호스트가 내려준 `Props`를 우선 적용하되 `Props`가 생략된 경우 `useMfeEvent`로 `mfe:auth-changed`, `mfe:sync-mode-changed`, `mfe:css-isolation-changed` 이벤트를 보조 수신합니다.
- **마이크로 앱 간 통신 및 상태 공유 (`Mode A` vs `Mode B` 수신·수정 대칭 아키텍처)**:
  ```mermaid
  flowchart LR
      Prod["remote-products (:3002)<br/>POST /api/cart 성공"]
      Branch{"syncMode 분기"}
      ModeA["Mode A (mode-a-event)<br/>mfeEventBus.emit('mfe:cart-updated')"]
      ModeB["Mode B (mode-b-query)<br/>sharedQueryClient.invalidateQueries(['cart'])"]
      CartA["CartWidget (:3003) — Mode A<br/>useMfeEvent 수신 → 독립 localQueryClient 재조회"]
      CartB["CartWidget (:3003) — Mode B<br/>이벤트 리스너 비활성 → sharedQueryClient 자동 재조회"]

      Prod --> Branch
      Branch -->|"mode-a-event"| ModeA --> CartA
      Branch -->|"mode-b-query"| ModeB --> CartB
  ```
  1. **`Mode A ('mode-a-event')`**: `CartWidget`은 `effectiveSyncMode !== 'mode-b-query'`일 때만 `createMfeQueryClient()`로 독립 `QueryClient`를 조건부 지연 생성합니다. `useMfeEvent(MFE_EVENTS.CART_UPDATED, handler)`를 통해 같은 `userId`의 변경 이벤트가 들어오면 자체 `QueryClient`의 `['cart', userId]` 쿼리를 무효화해 재조회하며, 장바구니 내부에서 `[+1]` 또는 `[삭제]`/`[전체 비우기]` 성공 시에도 `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, ...)`를 발행합니다.
  2. **`Mode B ('mode-b-query')`**: `remote_shared/utils`의 싱글톤 `sharedQueryClient`를 주입합니다. `Mode B`에서는 `mfe:cart-updated` 이벤트 수신에 의한 수동 재조회를 수행하지 않고(이벤트 의존성 `0%`), `sharedQueryClient`가 관리하는 `CART_QUERY_KEY` (`['cart', userId]`)의 prefix 무효화(`invalidateQueries({ queryKey: CART_QUERY_KEY })`)를 자동으로 감지해 리렌더링합니다.
  3. **응답 역전 방지 (`Study 05 #01`)**: 장바구니 내부의 `[+1]` 수량 증가 및 `[삭제]`/`[전체 비우기]` 뮤테이션 시작 직전(`onMutate`)에는 활성 `QueryClient`에서 `await activeQueryClient.cancelQueries({ queryKey: CART_QUERY_KEY })`를 호출하여 진행 중인 구버전 `GET /api/cart` 응답이 최신 상태를 덮어쓰지 못하게 차단합니다.
- **공통 UI 컴포넌트 (`Ark UI`) 및 CSS 격리 vs 오염 비교 토글 설계 (`Study 04 #05`)**:
  - 모든 버튼·제목·배지·스켈레톤·카드·스택·플렉스 레이아웃은 `remote_shared/ui` 컴포넌트로 조립하며 `@ark-ui/react`·`clsx`를 직접 설치하지 않습니다.
  - `cart.css`는 기본 상태(`data-css-isolated="true"`)에서 전역 태그 선택자 없이 `.cart-*` 프리픽스와 `var(--mfe-*)` 시맨틱 CSS 변수만 사용합니다.
  - 학습 실험을 위해 `cssIsolated={false}`(`data-css-isolated="false"`)로 전환하면, 위젯 컨테이너에 **비격리 스타일 오염 경고 배너와 의도적 스타일 깨짐 시뮬레이션(고정 강제 테두리·폰트·배경 충돌 시각화)**을 표시하고 `mfe:css-isolation-changed` 이벤트를 연동하여, 왜 리모트 앱에서 전역 선택자와 하드코딩 스타일을 금지해야 하는지 직관적으로 비교할 수 있게 합니다 (호스트 전체 DOM의 실제 파괴는 방지하여 데모 안정성 유지).

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `N/A (해당 없음 — Step 1.1에서 구축 완료된 GET /api/cart, POST /api/cart, DELETE /api/cart/:id 엔드포인트를 그대로 소비)`
