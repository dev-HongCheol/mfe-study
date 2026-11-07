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
  - `main.ts` + `bootstrap.tsx` 2단 비동기 분리(`Study 04 #01`), `.prod-*` CSS 클래스 프리픽스 및 시맨틱 변수 강제(`Study 04 #05`, `Study 05 #14`), `createScopedStorage('products')` 필터 영속화(`Study 04 #10`), `Vitest` 로컬 스텁 매핑 + `MSW` 모킹(`Study 04 #11`), `AbortSignal` 연동 1.5초 지연 스켈레톤 CLS 방지(`Study 05 #01, #13`), 플렉스 말줄임 및 고정폭 숫자 `tabular-nums`(`Study 05 #16`)를 빠짐없이 적용합니다.

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
  1. **`@module-federation/vite` 양방향(`remotes` + `exposes`) 및 `dts` 옵션**:
     - `remotes`에 매니페스트 객체 `{ type: 'module', name: 'remote_shared', entry: 'http://localhost:3004/mf-manifest.json', entryGlobalName: 'remote_shared', shareScope: 'default' }`를 지정합니다.
     - `dts`에 `{ generateTypes: { tsConfigPath: './tsconfig.json', abortOnError: false }, consumeTypes: { typesOnBuild: true, abortOnError: false } }`를 지정하면 개발(`vite dev`)과 빌드(`vite build`) 시 모두 `http://localhost:3004/@mf-types.zip`을 받아 `./@mf-types/`에 풀고, 동시에 `./ProductList`의 `@mf-types.zip`을 생성합니다 (`abortOnError: false`로 오프라인 단독 빌드 시에도 중단 방지).
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
| `NEW` | `vite.config.ts` | Port `3002`, `strictPort: true`, `cors: true`, `remote_shared` 소비 및 `./ProductList` 노출 설정 |
| `NEW` | `vitest.config.ts` | `jsdom` 환경 및 `remote_shared/*` 로컬 테스트 스텁 `resolve.alias` 매핑 설정 |
| `NEW` | `index.html` | 단독 실행(`Standalone`, `Port 3002`) 진입 HTML 문서 |
| `NEW` | `src/main.ts` | `eager consumption` 방지를 위한 비동기 `import('./bootstrap')` 진입 스크립트 (`.ts`) |
| `NEW` | `src/bootstrap.tsx` | 단독 실행 시 `ThemeProvider`와 `<App />`을 `#root`에 마운트하는 부트스트랩 엔트리 |
| `NEW` | `src/App.tsx` | `http://localhost:3002` 단독 실행용 컨트롤 바(유저·동기화모드·테마·지연 토글 + 이벤트 모니터) 및 카탈로그 쇼케이스 (`PascalCase`) |
| `NEW` | `src/exposed/ProductList.tsx` | Module Federation `./ProductList` 공개 진입 컴포넌트 — `syncMode`에 따라 독립 `QueryClient`(`Mode A`) 또는 싱글톤 `sharedQueryClient`(`Mode B`)를 선택 주입 (`PascalCase`) |
| `NEW` | `src/features/catalog/model/catalog-schema.ts` | 상품·장바구니 응답 검증용 `Zod` 스키마, 필터 폼 스키마(`productFilterSchema`), `ProductListProps` 및 `createScopedStorage('products')` 연동 도우미 (`+ catalog-schema.test.ts`) |
| `NEW` | `src/features/catalog/api/catalog-api.ts` | `createApiClient` + `unwrapApiResponse` 기반 `fetchProducts`, `postAddToCart` 및 `AbortSignal` 연동 `delayWithSignal` (`+ catalog-api.test.ts`) |
| `NEW` | `src/features/catalog/model/use-catalog-queries.ts` | `useProductsQuery` 및 `Mode A / Mode B` 분기 로직이 내장된 `useAddToCartMutation` 커스텀 훅 |
| `NEW` | `src/features/catalog/ui/catalog.css` | `.prod-*` 프리픽스 격리 스타일, `var(--mfe-*)` 시맨틱 변수, `min-width: 0` 말줄임 및 `tabular-nums` 숫자 정렬 |
| `NEW` | `src/features/catalog/ui/ProductFilterBar.tsx` | 카테고리 `Select` + `React Hook Form` 키워드 검색 바 + 결과 요약 배지 컴포넌트 (`PascalCase`, `+ ProductFilterBar.test.tsx`) |
| `NEW` | `src/features/catalog/ui/ProductGridSkeleton.tsx` | 1.5초 로딩 지연 시 실제 카드 높이와 1:1 매칭되어 CLS를 방지하는 6-카드 그리드 스켈레톤 컴포넌트 (`PascalCase`) |
| `NEW` | `src/features/catalog/ui/ProductCard.tsx` | 개별 상품 정보, 카테고리·재고 `Badge`, 중복 클릭 방지(`isPending`) 담기 버튼 및 인라인 에러 알림 카드 컴포넌트 (`PascalCase`, `+ ProductCard.test.tsx`) |
| `NEW` | `src/features/catalog/ui/ProductCatalogView.tsx` | 필터 상태(`createScopedStorage('products')`), 목록/스켈레톤/빈 결과/조회 에러 복구 뷰를 조합하는 카탈로그 본문 컴포넌트 (`PascalCase`) |
| `NEW` | `src/testing/setup.ts` | `@testing-library/jest-dom/vitest` 및 `MSW` 서버(`listen`/`resetHandlers`/`close`) 생명주기 설정 |
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
> 공통 API 엔벨로프, 도메인 엔티티(`ProductEntity`, `CartItemView`), 이벤트 페이로드 및 `ProductListProps` 원본 계약은 **루트 정본(`§ 5.1 ~ § 5.4.2`)을 그대로 준수**하며, 아래에는 `remote-products` 내부에서 사용하는 런타임 검증 스키마와 내부 모델 인터페이스를 정의합니다. 모든 인터페이스 속성에는 `/** ... */` 한글 설명 주석을 필수로 작성합니다.

```ts
import { z } from 'zod';
import type { CartUpdatedEventPayload, HostOriginType, SyncMode } from 'remote_shared/utils';

/**
 * @description 상품 카테고리 필터 선택 값 타입 ('all' 전체 보기 포함)
 */
export type ProductCategoryFilter = 'all' | 'electronics' | 'office' | 'accessories';

/**
 * @description 상품 카탈로그 필터 바(카테고리 + 검색어) 상태 및 로컬 스토리지 검증용 Zod 스키마
 */
export const productFilterSchema = z.object({
  /** 선택된 카테고리 필터 ('all' | 'electronics' | 'office' | 'accessories') */
  category: z.enum(['all', 'electronics', 'office', 'accessories']).default('all'),
  /** 상품명·설명 부분 일치 검색 키워드 (양끝 공백 제거, 최대 50자) */
  search: z.string().trim().max(50, '검색어는 최대 50자까지 입력할 수 있습니다.').default(''),
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
```

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`products` 전용)
- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared` / `dts`)**:
  - **컨테이너 이름 및 포트**: `name: 'remote_products'`, `filename: 'remoteEntry.js'`, `manifest: true`, `Port 3002` (`strictPort: true`, `cors: true`, `base: 'http://localhost:3002/'`)
  - **노출 모듈 (`exposes`)**: `'./ProductList': './src/exposed/ProductList.tsx'`
  - **소비 모듈 (`remotes`)**: `remote_shared` (`entry: 'http://localhost:3004/mf-manifest.json'`, `type: 'module'`)
  - **공유 의존성 (`shared` & `singleton`)**: `react` (`^19.1.0`), `react-dom` (`^19.1.0`), `@tanstack/react-query` (`^5.74.4`) 모두 `singleton: true`
  - **원격 타입 양방향 동기화 (`dts`)**: `generateTypes: { tsConfigPath: './tsconfig.json', abortOnError: false }`, `consumeTypes: { typesOnBuild: true, abortOnError: false }`
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**:
  - **단독 실행 (`src/main.ts` → `src/bootstrap.tsx` → `src/App.tsx`)**: `ThemeProvider`로 감싸고 상단에 유저·동기화모드·테마·1.5초 지연 컨트롤 바와 실시간 `mfe:cart-updated` 이벤트 수신 모니터를 배치하여 `Port 3002` 단독으로도 모든 기능을 검증할 수 있게 합니다.
  - **호스트 결합 (`src/exposed/ProductList.tsx`)**: `<BrowserRouter>`나 전역 CSS Reset을 절대 포함하지 않으며, 상위 호스트가 내려준 `Props`(`userId`, `hostType`, `syncMode`, `simulateDelay`, `apiBaseUrl`, `onCartAdded`)를 기준으로 동작합니다. 또한 `Props`가 생략된 경우 `useMfeEvent`로 `mfe:auth-changed` 및 `mfe:sync-mode-changed` 이벤트를 보조 수신하여 유연하게 동기화합니다.
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
  1. **`Mode A ('mode-a-event')`**: `ProductList` 내부 `useRef`로 생성한 독립 `localQueryClient`(`createMfeQueryClient()`)를 `QueryClientProvider`에 주입합니다. 담기 성공 시 `sharedQueryClient`는 건드리지 않고 오직 `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload)`만 발송합니다.
  2. **`Mode B ('mode-b-query')`**: `remote_shared/utils`의 싱글톤 `sharedQueryClient`를 `QueryClientProvider`에 주입합니다. 뮤테이션 시작 시(`onMutate`) `await sharedQueryClient.cancelQueries({ queryKey: CART_QUERY_KEY })`로 진행 중인 구버전 장바구니 조회 응답 역전을 차단하고, 성공 시 `await sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })`로 직접 무효화합니다 (`CustomEvent`에 의존하지 않음을 증명하기 위해 `Mode B`에서는 `mfe:cart-updated` 버스 발송을 생략하고 선택적 `onCartAdded` 콜백만 호출합니다).
- **공통 UI 컴포넌트 (`Ark UI`) 및 스타일 격리 (CSS 변수 / 프리픽스)**:
  - 모든 버튼·제목·셀렉트·배지·스켈레톤·그리드·카드 레이아웃은 `remote_shared/ui` 컴포넌트로 조립합니다.
  - 도메인 보조 스타일(`catalog.css`)은 전역 태그 선택자를 일절 쓰지 않고 `.prod-*` 프리픽스와 `var(--mfe-*)` 시맨틱 CSS 변수만 사용하며, 카드 그리드 스켈레톤의 `min-height`를 실제 카드(`240px`)와 1:1 매칭해 CLS를 방지합니다.

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `N/A (해당 없음 — Step 1.1에서 구축 완료된 GET /api/products 및 POST /api/cart 엔드포인트를 그대로 소비)`
