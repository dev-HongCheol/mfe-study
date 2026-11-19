# 📐 [기획 및 설계] 상품 목록 원격 앱(`./ProductList`) 및 `Mode A vs Mode B` 동기화 구축 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Suspense`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261107-catalog-list` |
| **서비스 스코프 (`Scope ID`)** | `products` (`apps/remote-products`, `Port 3002`) |
| **작업 브랜치** | `products/feat/catalog-list` (패턴 A) |
| **기술 스택 / 번들러** | `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite + TanStack Query v5 + React Hook Form + Zod + ky + es-toolkit + MSW + Vitest` |
| **작성일** | `2026-11-07` |
| **작업 규모 평가** | `적정 (단일 PR)` — 상품 카탈로그 필터·목록 조회, 장바구니 담기(`Mode A vs Mode B`), 단독 실행 쇼케이스 및 `MSW` 기반 TDD 테스트 일괄 구축 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- 백엔드 서버(`api-server:4000`)와 원격 공통 모듈(`remote-shared:3004`) 구축 완료에 이어, 실제 비즈니스 도메인 마이크로 앱의 첫 번째 축인 **상품 카탈로그 원격 앱(`remote-products`, `Port 3002`)**을 구축합니다.
- 본 서비스는 하위 원격 모듈인 `remote_shared`(`./ui`, `./theme`, `./utils`)를 런타임에 **소비(`remotes`)**하면서, 동시에 상위 호스트(`host-vite:3000`, `host-rspack:3001`)에 `./ProductList` 컴포넌트를 **노출(`exposes`)**하는 **양방향(Bidirectional) Module Federation 아키텍처**를 실증합니다.
- 또한 사용자가 상품을 장바구니에 담았을 때 다른 마이크로 앱(`remote-cart:3003`, `host-*`)과 상태를 맞추는 두 가지 대표 패턴인 **`Mode A`(`리모트별 독립 QueryClient + CustomEvent 신호`)**와 **`Mode B`(`싱글톤 sharedQueryClient 공유 + invalidateQueries 직접 무효화`)**를 실시간으로 전환하며 차이를 체감할 수 있도록 설계합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **양방향 Module Federation 2.0 및 `@mf-types` 자동 타입 연쇄 동기화 ([Study 04 #04](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md))**:
  - `@ark-ui/react` 및 `clsx`를 본 앱의 `package.json`에 설치하지 않고 오직 `remote_shared/ui`에서 런타임 소비하며, `dts: { consumeTypes, generateTypes }` 동시 설정으로 `remote_shared`의 타입을 `./@mf-types/`에 자동 수신하는 동시에 자신의 `./ProductList` 타입을 `@mf-types.zip`으로 생성·서빙합니다.
- **상태 동기화 비교 학습 모드(`Mode A` vs `Mode B`) 분리 설계 ([Study 01](../../../../../docs/study/01-mfe-concepts-and-guide.md) & [Study 05 #01](../../../../../docs/study/05-fullstack-service-real-world-issues.md))**:
  - `ProductList` 진입부에서 `syncMode === 'mode-a-event'`일 때는 `createMfeQueryClient()`로 생성한 리모트 전용 독립 `QueryClient`를 주입하고 담기 성공 시 `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload)`만 발송합니다.
  - 반대로 `syncMode === 'mode-b-query'`일 때는 `remote_shared/utils`의 싱글톤 `sharedQueryClient`를 주입하고 담기 시작 시 `cancelQueries({ queryKey: CART_QUERY_KEY })`(응답 역전 방지) 및 성공 시 `invalidateQueries({ queryKey: CART_QUERY_KEY })`로 직접 캐시를 무효화하여 두 아키텍처의 순수 동작 차이를 명확히 검증합니다.
- **MFE 및 풀스택 실전 방어 설계 내재화 ([Study 04](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) & [Study 05](../../../../../docs/study/05-fullstack-service-real-world-issues.md))**:
  - `main.ts`(`remote_shared` 서브패스 3종 `Promise.all` 선행 프리로드) + `bootstrap.tsx` 2단 비동기 분리 및 원격 함수 지연 초기화(`getProductsScopedStorage` Lazy Getter)(`Study 04 #01`), `disableDynamicRemoteTypeHints`를 통한 불필요한 WebSocket 연결 차단(`Study 04 #04`), `.prod-*` CSS 클래스 프리픽스 및 시맨틱 변수 강제(`Study 04 #05`, `Study 05 #14`), `createScopedStorage('products')` 필터 영속화(`Study 04 #10`), `Vitest` 로컬 스텁 매핑 + `MSW` 모킹(`Study 04 #11`), `AbortSignal` 연동 1.5초 지연 스켈레톤 CLS 방지(`Study 05 #01, #13`), 스키마 검증 에러(`RESPONSE_SCHEMA_INVALID`)의 `DEV`/`PROD` 환경별 진단 리포트 이원화(`Study 05 #10`), 플렉스 말줄임 및 고정폭 숫자 `tabular-nums`(`Study 05 #16`)를 빠짐없이 적용합니다.

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**: [Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)](../../../../../docs/features/20261027-phase1-service-contracts/01-plan-and-design.md) 및 [서비스 레지스트리 (`service-registry.md`)](../../../../../docs/service-registry.md)
- **참조 항목(섹션 제목)**:
  - `§ 5.1.1 표준 API 응답 엔벨로프 계약 (ApiResponse<T> & ApiErrorPayload)`
  - `§ 5.1.2 도메인 엔티티 및 DTO 타입 (ProductEntity, CartItemView)`
  - `§ 5.1.3 8대 REST API 엔드포인트 상세 명세 (#5 GET /api/products, #7 POST /api/cart)`
  - `§ 5.2.1 표준 커스텀 이벤트 이름 상수 (MFE_EVENTS)`
  - `§ 5.2.2 이벤트별 페이로드 인터페이스 및 Zod 검증 스키마 (CartUpdatedEventPayload, AuthChangedEventPayload, SyncModeChangedEventPayload)`
  - `§ 5.3 원격 공통 모듈(remote-shared, Port 3004) 노출(exposes) 시그니처 계약 (§ 5.3.1 ~ § 5.3.3)`
  - `§ 5.4.1 상태 동기화 비교 모드 타입 (SyncMode) 및 동작 규약`
  - `§ 5.4.2 remote_products/ProductList 노출 컴포넌트 Props 계약 (ProductListProps)`
  - `§ 5.5 Module Federation 2.0 공통 공유 의존성(shared singleton) 및 포트·CORS 계약 (#1 ~ #4)`
  - `service-registry.md § 4.3 타 서비스(products, cart, host-vite, host-rspack) 필수 소비 규칙 6대 원칙`

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` / 공식 타입 검증) — `[공통 필수]`
- **조회 대상 라이브러리**: `@module-federation/vite` (`v1.23.7`, `pluginDts`), `@tanstack/react-query` (`v5.74.4`), `react-hook-form` (`v7.56.1`) + `@hookform/resolvers/zod` (`v5.0.1`), `msw` (`v2.7.0`)
- **핵심 스펙 및 주의사항**:
  1. **`@module-federation/vite` 양방향(`remotes` + `exposes`), `DeferredRemoteProxy` 프리로드 및 `dts` 옵션**:
     - `remotes`에 매니페스트 객체 `{ type: 'module', name: 'remote_shared', entry: 'http://localhost:3004/mf-manifest.json', entryGlobalName: 'remote_shared', shareScope: 'default' }`를 지정합니다.
     - `@module-federation/vite`는 원격 모듈의 정적 Named Import를 내부적으로 `DeferredRemoteProxy`(원격 컴포넌트·함수 등이 다운로드 및 초기화되기 전까지 빈 대기 상태(`undefined`)로 두었다가 로드 완료 시 실제 원격 값으로 치환하는 지연 바인딩)로 변환하고 엔트리 정적 스캐너(`registerEntryImports`)를 통해 하위 원격 의존성을 수집합니다. 스캐너가 하위 의존성 트리를 중간에 끊지 않고 끝까지 추적하도록 로컬 상대 경로 import에서는 `.js` 확장자를 생략하며, `src/main.ts`에서 `remote_shared/utils`, `remote_shared/theme`, `remote_shared/ui`를 `Promise.all`로 병렬 프리로드한 후 `./bootstrap`을 마운트합니다.
     - `dts`에 `{ generateTypes: { tsConfigPath: './tsconfig.json', abortOnError: false }, consumeTypes: { typesOnBuild: true, abortOnError: false } }`를 지정하여 `http://localhost:3004/@mf-types.zip`을 `./@mf-types/`에 자동 수신하는 동시에 `./ProductList`의 `@mf-types.zip`을 생성합니다. 아울러 `dev: { disableDynamicRemoteTypeHints: true }`를 함께 설정하여 `@mf-types` 파일 동기화는 유지하면서 브라우저 런타임에 불필요한 동적 타입 힌트 WebSocket 클라이언트가 주입되어 연결 에러를 일으키는 현상을 차단합니다.
     - `tsconfig.json`에는 `"baseUrl": "."`, `"paths": { "*": ["./@mf-types/*"] }`, `"include": ["src", "@mf-types", "vite.config.ts", "vitest.config.ts"]`를 선언해 수동 `remotes.d.ts` 없이 원격 타입을 정식 인식합니다.
  2. **`@tanstack/react-query` v5 단일 객체 문법 및 `AbortSignal` 취소 규약**:
     - v5에서는 `useQuery({ queryKey, queryFn })`, `useMutation({ mutationFn, onMutate, onSuccess })`, `queryClient.cancelQueries({ queryKey })`, `queryClient.invalidateQueries({ queryKey })` 모두 단일 옵션 객체 시그니처만 허용됩니다.
     - `queryFn: ({ signal }) => fetchProducts(..., signal)` 형태로 `ky` 요청 옵션의 `signal`에 전달해야 필터 연속 변경이나 언마운트 시 진행 중인 요청과 1.5초 지연 타이머가 즉시 취소됩니다.
  3. **`MSW` v2 (`msw/node` + `http` / `HttpResponse`)**:
     - `Vitest` 환경(`src/testing/setup.ts`)에서 `setupServer(...handlers)`로 `beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))`, `afterEach(() => server.resetHandlers())`, `afterAll(() => server.close())`를 구성하여 실제 네트워크 없이 백엔드 계약과 동일한 응답·에러를 재현합니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> 모든 React 컴포넌트(`.tsx`)는 `1 컴포넌트 = 1 파일` 원칙으로 분리하고 파일명을 대문자(`PascalCase`)로 시작합니다.

| 구분 (`NEW` / `MOD`) | 파일 경로 (서비스 루트 기준 / 루트 파일은 루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `docs/todo.md` | `products` 서비스 스코프 전용 작업 현황 및 백로그 관리 문서 |
| `NEW` | `docs/features/20261107-catalog-list/01-plan-and-design.md` | 본 기획 및 상세 설계 문서 |
| `NEW` | `docs/features/20261107-catalog-list/02-tdd-spec.md` | *(2단계 작성 예정)* 단위·통합 TDD 테스트 명세서 |
| `NEW` | `package.json` | `@mfe-study/remote-products` 매니페스트 (`catalog:` 공유 의존성 사용, `@ark-ui/react`·`clsx` 미설치) |
| `NEW` | `tsconfig.json` | 루트 `tsconfig.base.json` 상속 + `./@mf-types/*` 경로 매핑 설정 |
| `NEW` | `vite.config.ts` | Port `3002`, `strictPort: true`, `cors: true`, `remote_shared` 소비, `./ProductList` 노출 및 `disableDynamicRemoteTypeHints: true` 설정 |
| `NEW` | `vitest.config.ts` | `jsdom` 환경 및 `remote_shared/*` 로컬 테스트 스텁 `resolve.alias` 매핑 설정 |
| `NEW` | `index.html` | 단독 실행(`Standalone`, `Port 3002`) 진입 HTML 문서 |
| `NEW` | `src/main.ts` | `eager consumption` 및 첫 접속 시 `DeferredRemoteProxy` 초기화 경합 방지를 위한 `remote_shared/*` 병렬 프리로드(`Promise.all`) + 비동기 `import('./bootstrap')` 진입 스크립트 (`.ts`) |
| `NEW` | `src/bootstrap.tsx` | 단독 실행 시 `ThemeProvider`와 `<App />`을 `#root`에 마운트하는 부트스트랩 엔트리 |
| `NEW` | `src/App.tsx` | `http://localhost:3002` 단독 실행용 컨트롤 바(유저·동기화모드·테마·지연 토글 + 이벤트 모니터) 및 카탈로그 쇼케이스 (`PascalCase`) |
| `NEW` | `src/exposed/ProductList.tsx` | Module Federation `./ProductList` 공개 진입 컴포넌트 — `syncMode`에 따라 독립 `QueryClient`(`Mode A`) 또는 싱글톤 `sharedQueryClient`(`Mode B`)를 선택 주입 (`PascalCase`) |
| `NEW` | `src/features/catalog/model/catalog-schema.ts` | 루트 계약(`§ 5.1.2`) 정합성을 맞춘 상품·장바구니 `Zod` 스키마, 필터 스키마(`productFilterSchema`), 지연 초기화된 `getProductsScopedStorage()` 도우미 및 `DEV/PROD` 환경별 스키마 에러 리포트 이원화(`formatCatalogErrorReport`) 유틸리티 (`+ catalog-schema.test.ts`) |
| `NEW` | `src/features/catalog/api/catalog-api.ts` | `createApiClient` + `unwrapApiResponse` 기반 `fetchProducts`, `postAddToCart` 및 `AbortSignal` 연동 `delayWithSignal` (`+ catalog-api.test.ts`) |
| `NEW` | `src/features/catalog/model/use-catalog-queries.ts` | `useProductsQuery` 및 `Mode A / Mode B` 분기 로직이 내장된 `useAddToCartMutation` 커스텀 훅 |
| `NEW` | `src/features/catalog/ui/catalog.css` | `.prod-*` 프리픽스 격리 스타일, `var(--mfe-*)` 시맨틱 변수, `min-width: 0` 말줄임, `tabular-nums` 숫자 정렬 및 `DEV` 스키마 진단 배너 스타일 |
| `NEW` | `src/features/catalog/ui/ProductFilterBar.tsx` | 카테고리 `Select` + `React Hook Form` 키워드 검색 바 + 결과 요약 배지 컴포넌트 (`PascalCase`, `+ ProductFilterBar.test.tsx`) |
| `NEW` | `src/features/catalog/ui/ProductGridSkeleton.tsx` | 1.5초 로딩 지연 시 실제 카드 높이와 1:1 매칭되어 CLS를 방지하는 6-카드 그리드 스켈레톤 컴포넌트 (`PascalCase`) |
| `NEW` | `src/features/catalog/ui/ProductCard.tsx` | 개별 상품 정보, 카테고리·재고 `Badge`, 중복 클릭 방지(`isPending`) 담기 버튼 및 비로그인 차단 상태를 표시하는 카드 컴포넌트 (`PascalCase`, `+ ProductCard.test.tsx`) |
| `NEW` | `src/features/catalog/ui/CatalogErrorBanner.tsx` | 장바구니 담기 실패 및 상품 목록 조회 실패 시 공통 사용하는 `role="alert"` 인라인 에러 배너(선택적 `[다시 시도]` 복구 버튼 및 `DEV` 스키마 불일치 진단 블록 포함) 컴포넌트 (`PascalCase`, `+ CatalogErrorBanner.test.tsx`) |
| `NEW` | `src/features/catalog/ui/ProductCatalogContent.tsx` | 카탈로그 본문 4가지 상태(로딩 스켈레톤 / 조회 에러 복구 / 빈 결과 안내 / 3열 상품 카드 그리드)를 Early Return 패턴으로 분기 렌더링하는 컴포넌트 (`PascalCase`, `+ ProductCatalogContent.test.tsx`) |
| `NEW` | `src/features/catalog/ui/ProductCatalogView.tsx` | 필터 상태(`getProductsScopedStorage()`), 담기 피드백, `DEV` 콘솔 에러 진단 및 하위 카탈로그 UI(`ProductFilterBar`, `CatalogErrorBanner`, `ProductCatalogContent`)를 조합하는 카탈로그 메인 뷰 컴포넌트 (`PascalCase`) |
| `NEW` | `src/testing/setup.ts` | `@testing-library/jest-dom/vitest`, `jsdom` + Node `undici` 간 `AbortSignal` 호환 어댑터(`JsdomCompatibleRequest`) 및 `MSW` 서버 생명주기 설정 |
| `NEW` | `src/testing/stubs/remote-shared-ui.tsx` | `Vitest` 단독 실행용 `remote_shared/ui` 경량 로컬 스텁 |
| `NEW` | `src/testing/stubs/remote-shared-theme.tsx` | `Vitest` 단독 실행용 `remote_shared/theme` 경량 로컬 스텁 |
| `NEW` | `src/testing/stubs/remote-shared-utils.ts` | `Vitest` 단독 실행용 `remote_shared/utils` 로컬 스텁 (실제 `QueryClient`, `CustomEvent` 버스, `ky` 클라이언트 연동) |
| `NEW` | `src/testing/msw/handlers.ts` | `GET /api/products`, `POST /api/cart` 표준 응답 봉투 및 품절(`OUT_OF_STOCK`) 모킹 핸들러 |
| `NEW` | `src/testing/msw/server.ts` | `msw/node` 기반 `setupServer` 인스턴스 |
| `NEW` | `src/__tests__/ProductList.integration.test.tsx` | `ProductList` 전체 플로우, `Mode A` vs `Mode B` 동작 비교, 지연 스켈레톤, 에러 복구 및 아키텍처 무결성 통합 테스트 |
| `MOD` | `(루트) vitest.config.ts` | 루트 통합 `Vitest` 프로젝트 배열에 `'apps/remote-products/vitest.config.ts'` 추가 |
| `MOD` | `(루트) docs/service-registry.md` | **(5단계-B 머지 직전 필수 갱신)** `remote-products` 명령어, `./ProductList` 노출 시그니처 및 소비 현황 등록 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`
> 공통 API 엔벨로프, 도메인 엔티티(`ProductEntity`, `CartItemView`), 이벤트 페이로드 및 `ProductListProps` 원본 계약은 **루트 정본(`§ 5.1 ~ § 5.4.2`)을 그대로 준수**하며, 아래에는 `remote-products` 내부에서 사용하는 런타임 검증 스키마, 지연 스토리지 헬퍼, 환경별(`DEV`/`PROD`) 에러 리포트 이원화 인터페이스를 정의합니다. 모든 인터페이스 속성에는 `/** ... */` 한글 설명 주석을 필수로 작성합니다.

```ts
import { z } from 'zod';
import type {
  CartUpdatedEventPayload,
  HostOriginType,
  NormalizedError,
  ScopedStorage,
  SyncMode,
} from 'remote_shared/utils';

/**
 * @description 상품 카테고리 구분 및 필터 선택 값 타입 ('all' 전체 보기 포함)
 */
export type ProductCategory = 'electronics' | 'office' | 'accessories';
export type ProductCategoryFilter = 'all' | ProductCategory;

/**
 * @description 단일 상품 엔티티 런타임 검증용 Zod 스키마
 * (루트 SSOT § 5.1.2 ProductEntity의 6대 필수 속성과 1:1 매핑하며, createdAt은 CartItemView에만 존재함)
 */
export const productEntitySchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  price: z.number().int().nonnegative(),
  category: z.enum(['electronics', 'office', 'accessories']),
  stock: z.number().int().nonnegative(),
  description: z.string(),
});

/**
 * @description 상품 카탈로그 필터 바(카테고리 + 검색어) 상태 및 로컬 스토리지 검증용 Zod 스키마
 */
export const productFilterSchema = z.object({
  /** 선택된 카테고리 필터 ('all' | 'electronics' | 'office' | 'accessories') */
  category: z.enum(['all', 'electronics', 'office', 'accessories']),
  /** 상품명·설명 부분 일치 검색 키워드 (양끝 공백 제거, 최대 50자) */
  search: z.string().trim().max(50, '검색어는 최대 50자까지 입력할 수 있습니다.'),
});

/**
 * @description 상품 카탈로그 필터 바 상태 인터페이스
 */
export interface ProductFilterValues {
  /** 선택된 카테고리 필터 ('all' | 'electronics' | 'office' | 'accessories') */
  category: ProductCategoryFilter;

  /** 상품명·설명 부분 일치 검색 키워드 */
  search: string;
}

/**
 * @description GET /api/products 조회 요청 파라미터 인터페이스
 */
export interface FetchProductsParams {
  /** 필터링할 카테고리 ('all'인 경우 쿼리스트링에서 생략) */
  category?: ProductCategoryFilter;

  /** 부분 일치 검색 키워드 (빈 문자열인 경우 쿼리스트링에서 생략) */
  search?: string;

  /** 백엔드 API 기본 URL (기본값: DEFAULT_API_BASE_URL) */
  apiBaseUrl?: string;

  /** 1.5초 네트워크 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay?: boolean;

  /** TanStack Query가 주입하는 요청 취소용 AbortSignal */
  signal?: AbortSignal;
}

/**
 * @description POST /api/cart 장바구니 담기 뮤테이션 입력 인터페이스
 */
export interface AddToCartMutationInput {
  /** 대상 사용자 고유 ID */
  userId: string;

  /** 담을 상품 고유 ID */
  productId: number;

  /** 담을 상품명 (mfe:cart-updated 모니터 로그 표시용) */
  productName: string;

  /** 추가할 수량 (1 ~ 99 정수) */
  quantity: number;

  /** 요청이 발생한 상위 호스트 출처 ('vite' | 'rspack' | 'standalone') */
  hostType: HostOriginType;

  /** 현재 선택된 상태 동기화 모드 ('mode-a-event' | 'mode-b-query') */
  syncMode: SyncMode;

  /** 백엔드 API 기본 URL */
  apiBaseUrl?: string;

  /** 장바구니 담기 성공 시 상위 호스트에 알리는 선택적 콜백 */
  onCartAdded?: (payload: CartUpdatedEventPayload) => void;
}

/**
 * @description Zod 스키마 검증 실패(RESPONSE_SCHEMA_INVALID) 시 개별 필드 불일치 좌표를 나타내는 인터페이스 (Study 05 #10)
 */
export interface SchemaIssueDetail {
  /** 실패한 데이터 경로 문자열 (예: '[0].price', 'category') */
  path: string;

  /** Zod 이슈 코드 (예: 'invalid_type', 'too_big') */
  code: string;

  /** 상세 실패 사유 메시지 */
  message: string;
}

/**
 * @description 환경별(DEV vs PROD)로 이원화된 에러 표시 모델 인터페이스 (Study 05 #10)
 */
export interface CatalogErrorReport {
  /** 에러 식별 코드 (예: 'RESPONSE_SCHEMA_INVALID', 'OUT_OF_STOCK') */
  code: string;

  /** 사용자에게 표시할 기본 안내 문구 (운영 환경에서는 내부 스키마 구조를 숨긴 안전 문구) */
  userMessage: string;

  /** 개발 환경(DEV)에서만 노출되는 상세 스키마 불일치 필드 목록 (PROD에서는 항상 빈 배열) */
  devDetails: SchemaIssueDetail[];
}

/**
 * @description 원격 모듈 최상단 즉시 호출 경합(DeferredRemoteProxy)을 방지하기 위한 지연 초기화 스토리지 Getter (Study 04 #01)
 */
export declare function getProductsScopedStorage(): ScopedStorage;

/**
 * @description 정규화된 에러를 받아 실행 환경(DEV vs PROD)에 따라 이원화된 에러 리포트를 생성하는 함수 (Study 05 #10)
 */
export declare function formatCatalogErrorReport(
  error: NormalizedError,
  isDev?: boolean,
): CatalogErrorReport;

/**
 * @description Props 또는 이벤트로 전달받은 사용자 ID를 정규화하여 비로그인(null/빈 문자열/공백) 시 임의 유저 폴백을 차단하는 함수 (SSOT § 5.4.2)
 */
export declare function normalizeUserId(rawUserId?: string | null): string | null;
```

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`products` 전용)
- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared` / `dts`)**:
  - **컨테이너 이름 및 포트**: `name: 'remote_products'`, `filename: 'remoteEntry.js'`, `manifest: true`, `Port 3002` (`strictPort: true`, `cors: true`, `base: 'http://localhost:3002/'`)
  - **노출 모듈 (`exposes`)**: `'./ProductList': './src/exposed/ProductList.tsx'`
  - **소비 모듈 (`remotes`)**: `remote_shared` (`entry: 'http://localhost:3004/mf-manifest.json'`, `type: 'module'`)
  - **공유 의존성 (`shared` & `singleton`)**: `react` (`^19.1.0`), `react-dom` (`^19.1.0`), `@tanstack/react-query` (`^5.74.4`) 모두 `singleton: true`
  - **원격 타입 양방향 동기화 (`dts` & `dev`)**: `generateTypes: { tsConfigPath: './tsconfig.json', abortOnError: false }`, `consumeTypes: { typesOnBuild: true, abortOnError: false }`, `dev: { disableDynamicRemoteTypeHints: true }`
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**:
  - **단독 실행 (`src/main.ts` → `src/bootstrap.tsx` → `src/App.tsx`)**: `ThemeProvider`로 감싸고 상단에 유저(`게스트 (비로그인)` · `user-1` · `user-2`)·동기화모드·테마·1.5초 지연 컨트롤 바와 실시간 `mfe:cart-updated` 이벤트 수신 모니터를 배치하여 `Port 3002` 단독으로도 비인증 차단과 로그인 담기를 모두 검증할 수 있게 합니다.
  - **호스트 결합 (`src/exposed/ProductList.tsx`)**: `<BrowserRouter>`나 전역 CSS Reset을 절대 포함하지 않으며, 상위 호스트가 내려준 `Props`(`userId`, `hostType`, `syncMode`, `simulateDelay`, `delayMs`, `apiBaseUrl`, `onCartAdded`)를 기준으로 동작합니다. 또한 `Props`가 생략된 경우 `useMfeEvent`로 `mfe:auth-changed` 및 `mfe:sync-mode-changed` 이벤트를 보조 수신하며, `userId`가 전달되지 않거나 `null`/공백인 비로그인 상태에서는 임의 유저(`'user-1'`)로 폴백하지 않고 읽기 전용 카탈로그 조회만 허용한 채 장바구니 담기 버튼 및 뮤테이션을 원천 차단합니다(`SSOT § 5.4.2`).
- **마이크로 앱 간 통신 및 상태 공유 (`Mode A` vs `Mode B` 순수 비교 아키텍처)**:
  ```mermaid
  flowchart LR
      Click["사용자가 [장바구니 담기] 클릭<br/>POST /api/cart 성공"]
      Branch{"syncMode 분기"}
      ModeA["Mode A (mode-a-event)<br/>독립 localQueryClient 유지<br/>mfeEventBus.emit('mfe:cart-updated') 발송"]
      ModeB["Mode B (mode-b-query)<br/>싱글톤 sharedQueryClient 공유<br/>sharedQueryClient.invalidateQueries(['cart'])"]
      CartA["CartWidget (:3003)<br/>useMfeEvent 수신 → 자체 캐시 재조회"]
      CartB["CartWidget (:3003)<br/>이벤트 없이 공유 캐시 무효화 자동 감지"]

      Click --> Branch
      Branch -->|"mode-a-event"| ModeA --> CartA
      Branch -->|"mode-b-query"| ModeB --> CartB
  ```
  1. **`Mode A ('mode-a-event')`**: `ProductList` 내부 `localQueryClientRef`는 `effectiveSyncMode !== 'mode-b-query'`일 때만 `createMfeQueryClient()`로 최초 1회 조건부 지연 생성하여 `QueryClientProvider`에 주입합니다(`Mode B` 전용 마운트 시 불필요한 `QueryClient` 인스턴스 생성 0개). 담기 성공 시 `sharedQueryClient`는 건드리지 않고 오직 `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload)`만 발송합니다.
  2. **`Mode B ('mode-b-query')`**: `remote_shared/utils`의 싱글톤 `sharedQueryClient`를 `QueryClientProvider`에 주입합니다. 뮤테이션 시작 시(`onMutate`) `await sharedQueryClient.cancelQueries({ queryKey: CART_QUERY_KEY })`로 진행 중인 구버전 장바구니 조회 응답 역전을 차단하고, 성공 시 `await sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })`로 직접 무효화합니다 (`CustomEvent`에 의존하지 않음을 증명하기 위해 `Mode B`에서는 `mfe:cart-updated` 버스 발송을 생략하고 선택적 `onCartAdded` 콜백만 호출합니다).
- **공통 UI 컴포넌트 (`Ark UI`) 및 스타일 격리 (CSS 변수 / 프리픽스)**:
  - 모든 버튼·제목·셀렉트·배지·스켈레톤·그리드·카드 레이아웃은 `remote_shared/ui` 컴포넌트로 조립합니다.
  - 도메인 보조 스타일(`catalog.css`)은 전역 태그 선택자를 일절 쓰지 않고 `.prod-*` 프리픽스와 `var(--mfe-*)` 시맨틱 CSS 변수만 사용하며, 카드 그리드 스켈레톤의 `min-height`를 실제 카드(`240px`)와 1:1 매칭해 CLS를 방지합니다.
- **MFE 런타임 및 풀스택 연동 잠재 증상과 방어 아키텍처 설계 (`Symptoms & Defensive Design`)**:
  > 양방향 Module Federation(`remote_shared` 소비 + `./ProductList` 노출) 및 실제 백엔드 API 연동 시 발생할 수 있는 5대 주요 증상과 이를 원천 차단하는 설계 방식입니다.

  1. **초기 접속 시 원격 모듈 초기화 경합 (`DeferredRemoteProxy` 미초기화 증상) 및 3중 방어 설계 ([`Study 04 #01`](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md))**:
     - **잠재 증상 및 원인**:
       - `@module-federation/vite`는 원격 모듈(`remote_shared/*`)의 정적 Named Import를 내부적으로 `DeferredRemoteProxy` 객체로 변환합니다.
       - 만약 소비자 모듈 최상단(Top-Level)에서 `const storage = createScopedStorage('products')`처럼 원격 함수를 즉시 동기 호출하거나, 로컬 상대 경로 import에 `.js` 확장자를 붙여 번들러의 정적 AST 스캐너(`registerEntryImports`)가 하위 파일 탐색을 중단하게 되면, 서버 기동 후 **첫 브라우저 접속 시 원격 서브패스(`utils`, `theme`, `ui`) 로딩이 완료되기 전에 모듈이 평가되어 `createScopedStorage is not a function` 또는 `Element type is invalid (undefined)` 런타임 에러가 발생**합니다(새로고침 시에만 캐시로 동작하는 간헐적 경합 증상).
     - **표준 방어 설계 방법**:
       - **① 지연 초기화(`Lazy Singleton Getter`) 패턴**: `catalog-schema.ts` 최상단에서 원격 함수를 즉시 실행하지 않고, 함수가 실제 호출되는 시점에 최초 1회 생성·캐싱하는 `getProductsScopedStorage()`로 설계합니다.
       - **② 정적 스캐너 호환 모듈 경로 규약**: `src/**` 내 로컬 상대 경로 import에서 `.js` 확장자를 생략하여 `@module-federation/vite`의 `registerEntryImports`가 하위 의존성 트리의 원격 모듈을 누락 없이 자동 프리로드(`preloadRemotes`)하도록 보장합니다.
       - **③ 진입점 병렬 프리로드(`Promise.all`)**: `src/main.ts`에서 `./bootstrap`을 마운트하기 전에 `Promise.all([import('remote_shared/utils'), import('remote_shared/theme'), import('remote_shared/ui')])`로 원격 서브패스 3종을 병렬 선행 로드하여 초기화 경합과 네트워크 Waterfall을 동시에 방지합니다.

  2. **동적 원격 타입 힌트 플러그인(`dynamic-remote-type-hints-plugin`)의 불필요한 WebSocket 연결 에러 차단 설계 ([`Study 04 #04`](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md))**:
     - **잠재 증상 및 원인**:
       - `@module-federation/vite`에서 `dts` 옵션을 활성화하면 개발 모드(`vite dev`)에서 `dynamic-remote-type-hints-plugin`이 브라우저에 WebSocket 클라이언트를 자동 주입합니다. 이때 동적 타입 알림용 로컬 소켓 포트가 비활성 상태이거나 리모트 서버를 재기동할 때 브라우저 콘솔에 `WebSocket connection to 'ws://...' failed` 에러가 반복 출력되며, 로컬 진단 폴더(`.mf/diagnostics/`)가 생성되어 Git 작업 트리를 오염시킬 수 있습니다.
     - **표준 방어 설계 방법**:
       - `vite.config.ts`의 `federation` 설정에 `dev: { disableDynamicRemoteTypeHints: true }`를 명시합니다. 이를 통해 빌드·개발 시점의 `@mf-types.zip` 정적 타입 다운로드·생성(`dts.consumeTypes`, `dts.generateTypes`) 기능은 100% 유지하면서 불필요한 브라우저 런타임 WebSocket 연결만 비활성화합니다. 또한 루트 `.gitignore`에 `.mf/`를 등록해 로컬 진단 파일의 Git 추적을 방지합니다.

  3. **도메인 엔티티(`ProductEntity` vs `CartItemView`) 스키마 경계 분리 및 `Tolerant Reader` 설계 ([`Study 05 #10`](../../../../../docs/study/05-fullstack-service-real-world-issues.md))**:
     - **잠재 증상 및 원인**:
       - 백엔드 `products` 테이블과 루트 서비스 계약(`§ 5.1.2`)의 `ProductEntity`는 6개 표준 속성(`id`, `name`, `price`, `category`, `stock`, `description`)으로 구성되며, `createdAt` 필드는 장바구니 조인 뷰인 `CartItemView`(`POST /api/cart` 응답)에만 존재합니다.
       - 만약 `ProductEntity` 검증 스키마(`productEntitySchema`)에 계약에 없는 `createdAt: z.string()`을 필수 필드로 포함하면, 실제 백엔드(`GET /api/products`) 연동 시 Zod 검증이 실패하여 `RESPONSE_SCHEMA_INVALID` 에러가 발생합니다.
     - **표준 방어 설계 방법**:
       - 루트 SSOT 계약(`§ 5.1.2`)에 맞춰 `productEntitySchema`(6개 속성)와 `cartItemViewSchema`(9개 속성, `createdAt` 포함)의 스키마 경계를 엄격히 분리하고, Zod의 기본 `z.object()` 동작(알 수 없는 여분 필드는 통과 과정에서 무시하는 `Tolerant Reader` 원칙)을 유지하여 백엔드 필드 확장 시에도 하위 호환성을 보장합니다.

  4. **스키마 검증 에러(`RESPONSE_SCHEMA_INVALID`)의 환경별(`DEV` vs `PROD`) 진단 리포트 이원화 설계 ([`Study 05 #10`](../../../../../docs/study/05-fullstack-service-real-world-issues.md))**:
     - **잠재 증상 및 원인**:
       - API 응답의 런타임 스키마 검증 실패 시 화면에 단일 에러 메시지만 표시하면, 개발 환경(`DEV`)에서는 배열의 몇 번째 항목, 어느 필드(`path`)에서 타입 불일치(`code`)가 발생했는지 즉시 파악하기 어렵습니다. 반대로 실패한 내부 스키마 경로를 그대로 화면에 노출하면 운영 환경(`PROD`)에서 내부 데이터 구조와 스키마 필드명이 일반 사용자에게 노출되는 보안·UX 문제가 발생합니다.
     - **표준 방어 설계 방법**:
       - `NormalizedError.originalError`에 보존된 `ZodError.issues`에서 실패 필드 좌표(`path`, `code`, `message`)를 추출하는 `extractSchemaIssues`와, 실행 환경(`import.meta.env.DEV`)에 따라 출력 모델을 분리하는 `formatCatalogErrorReport(error, isDev)`를 설계합니다.
       - **개발 환경 (`DEV = true`)**: 에러 배너 하단에 `[DEV 상세 진단 — 스키마 불일치 필드]` 영역을 렌더링하여 실패 좌표(예: `[0].price (invalid_type)`)를 인라인 코드 배지로 즉시 보여주고 브라우저 F12 콘솔(`console.error`)에도 상세 이슈 배열을 출력합니다.
       - **운영 환경 (`PROD = false`)**: `devDetails`를 빈 배열(`[]`)로 비워 내부 필드명 노출을 원천 차단하고, 사용자에게는 정제된 안전 안내 문구(`"일시적인 데이터 형식 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."`)만 표시합니다.

  5. **단독 통합 테스트(`jsdom` + Node `undici`) 및 Windows 개발 실행기(`dev-menu`) 크로스 플랫폼 호환 설계**:
     - **잠재 증상 및 원인**:
       - ① Node 22(`undici` 기반 내장 `fetch`/`Request`)와 `jsdom` v26을 결합한 Vitest 환경에서는 `jsdom`이 전역 `AbortController`를 자체 구현체로 덮어써서, `ky`가 `new Request(url, { signal })`을 호출할 때 `AbortSignal` 인스턴스 불일치 `TypeError`가 발생할 수 있습니다.
       - ② Windows PowerShell에서 대화형 실행 스크립트(`node scripts/dev-menu.mjs`)를 직접 실행할 때 `process.argv[1]`이 백슬래시(`\`) 경로를 반환하여, POSIX 슬래시(`/`) 기준의 단순 문자열 비교(`import.meta.url.endsWith(...)`)가 실패하고 메뉴가 실행되지 않는 현상이 발생합니다.
     - **표준 방어 설계 방법**:
       - ① `src/testing/setup.ts`에 `JsdomCompatibleRequest` 어댑터를 구성하여 사전 중단된 `AbortSignal`(`signal.aborted`)의 즉시 취소 검증과 Node `undici` `Request` 생성자 호환성을 동시에 보장합니다.
       - ② `scripts/dev-menu.mjs`에서 `fileURLToPath(import.meta.url)`와 `path.resolve(process.argv[1])`로 OS 경로 구분자를 정규화하여 비교하는 `isDirectExecution()` 설계를 적용해 Windows와 POSIX 환경 모두에서 동일하게 동작하도록 보장합니다.

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `N/A (해당 없음 — Step 1.1에서 구축 완료된 GET /api/products 및 POST /api/cart 엔드포인트를 그대로 소비)`
