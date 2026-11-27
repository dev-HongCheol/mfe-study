# 📐 [기획 및 설계] `remote-products` 이벤트 발신자 식별(`sourceId`) 적용 및 이종 번들러·캐시 정합화 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `exposes`, `remotes`, `singleton`, `CustomEvent`, `Zod`, `TanStack Query`, `@mf-types` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261127-event-source-id` |
| **서비스 스코프 (`Scope ID`)** | `products` (`apps/remote-products`, `Port 3002`) |
| **작업 브랜치** | `products/feat/event-source-id` (패턴 A) |
| **기술 스택 / 번들러** | `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite + TanStack Query v5 + Zod + Vitest` |
| **작성일** | `2026-11-27` |
| **작업 규모 평가** | `적정 (단일 PR)` — `remote-products`의 `Mode A` 이벤트 발신자 식별(`sourceId`) 적용, 로컬 테스트 스텁 정본 동기화, `QueryClientProvider` 리마운트 키 및 React 서브패스 3종 싱글톤 통일을 단일 서비스 스코프 내에서 일괄 완료 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- **배경 — `host-vite` `MfeInspector`에서 `remote-products` 이벤트 출처가 `anonymous`로 노출되는 정합성 공백**:
  - `remote-shared/utils`(`PR #16`)에 현업 표준 `createMfeEventSourceId(prefix)` 및 `{ sourceId }` / `{ ignoreSourceId }` 규약이 도입되었고, `remote-cart`(`PR #17`)와 `host-vite`(`PR #18`)는 이미 `remote-cart:<uuid>`, `host-vite:<uuid>` 형식으로 발신자를 식별합니다.
  - 반면 `Step 1.3` 시점에 구현된 `remote-products`는 `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, eventPayload)`를 2인자로만 호출하고 있어, `host-vite`의 실시간 `MfeInspector` 이벤트 스트림에서 `source: anonymous`로 표시됩니다.
- **목적 — 전사 MFE 발신자 추적 일관성 완성 및 다음 작업(`host-rspack`) 선행 호환성 확보**:
  1. `ProductList` 마운트 인스턴스당 1회 `createMfeEventSourceId('remote-products')`를 지연 생성하고, `Mode A` 장바구니 담기 시 `{ sourceId }` 옵션으로 첨부하여 모든 앱(`remote-products`, `remote-cart`, `host-vite`, 향후 `host-rspack`)이 일관된 발신자 ID를 발행하도록 통일합니다.
  2. `remote-products` 단독 실행 쇼케이스(`App.tsx`) 실시간 수신 로그에도 `meta?.sourceId`를 표시하여 Port 3002 단독 환경에서 발신자 ID 전파를 즉시 검증할 수 있게 합니다.
  3. 로컬 테스트 스텁(`src/testing/stubs/remote-shared-utils.ts`)을 최신 `remote-shared/utils` 정본(표준 4대 이벤트 · `sourceId` · `ignoreSourceId` · 폐기 이벤트 제거)과 1:1 동기화합니다.
  4. 다음 작업인 `host-rspack`(`Rsbuild/Rspack`) 연동에 대비해 `vite.config.ts`의 `shared`에 React 서브패스 3종(`react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom/client`)을 추가해 6종 싱글톤을 통일하고, `ProductList.tsx`의 `<QueryClientProvider>`에 `key={effectiveSyncMode}`를 적용해 `Mode A ↔ Mode B` 전환 시 `QueryObserver` 캐시 전환 일관성을 맞춥니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **원격 모듈 지연 초기화(`useRef` Lazy Init)로 `DeferredRemoteProxy` 경합 차단 (`Study 04 #01`)**:
  - `createMfeEventSourceId('remote-products')`를 모듈 최상단(Top-Level)에서 동기 호출하면 첫 접속 시 `remote_shared/utils` 평가 경합 위험이 있으므로, `ProductList` 내부 `useRef` 지연 초기화(`productsSourceIdRef`)로 최초 마운트 시점에 1회 생성하고 리렌더 간 동일한 `sourceId`를 유지합니다.
- **이종 번들러(`Vite` ↔ `Rspack`) React 서브패스 3종 싱글톤 통일**:
  - `remote-products`는 `Vite 7`로 빌드되지만 향후 `host-rspack`(`Rsbuild/Rspack`)에서 소비될 예정입니다. `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client`, `@tanstack/react-query` 6종을 전사 동일하게 명시 공유하여 런타임 `jsxDEV` 경합을 원천 차단합니다.
- **`QueryClientProvider key={effectiveSyncMode}` 리마운트 (`Study 12`)**:
  - `Mode A`(독립 `localQueryClient`)와 `Mode B`(싱글톤 `sharedQueryClient`)를 런타임에 전환할 때 `QueryClientProvider`의 `key`를 동기화 모드로 고정해 하위 쿼리·뮤테이션 훅이 이전 `QueryClient` 참조에 남는 Split-Brain을 예방합니다.

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**:
  - [Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)](../../../../docs/features/20261027-phase1-service-contracts/01-plan-and-design.md)
  - [서비스 레지스트리 (`docs/service-registry.md`)](../../../../docs/service-registry.md)
  - [`remote-shared` `sourceId` 발신자 식별 설계서 (`01-plan-and-design.md`)](../../../remote-shared/docs/features/20261124-event-bus-source-id/01-plan-and-design.md)
- **참조 항목(섹션 제목)**:
  - `Phase 1 공통 연동 계약 § 5.2 전사 표준 커스텀 이벤트 버스(mfeEventBus) 계약`
  - `Phase 1 공통 연동 계약 § 5.4.2 remote_products/ProductList Props 계약`
  - `service-registry.md § 4.2 Module Federation 노출(exposes) 3대 서브패스 시그니처 요약` (`remote_shared/utils` `createMfeEventSourceId`, `MfeEventEmitOptions`, `MfeEventMeta`)
  - `service-registry.md § 5.2 Module Federation 노출(exposes) 및 소비(remotes) 시그니처 요약`
  - `remote-shared 20261124-event-bus-source-id § 5 상세 인터페이스 및 데이터 설계`

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `@module-federation/vite` (`^1.23.7` / Context7 `/module-federation/vite`), `@tanstack/react-query` (`^5.74.4` / Context7 `/tanstack/query`)
- **핵심 스펙 및 주의사항**:
  1. **`@module-federation/vite` React 서브패스 공유 (`MIGRATING_FROM_ORIGINJS.md`)**:
     - 호스트와 리모트가 동일한 렌더링 경계에서 React를 공유할 때는 `react`, `react-dom`뿐만 아니라 경계를 가로지르는 서브패스(`react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom/client`)도 호환 버전 싱글톤으로 명시 확인해야 합니다.
  2. **`@tanstack/react-query` v5 `QueryClientProvider` (`QueryClientProvider.md`, `stable-query-client.md`)**:
     - `QueryClient` 인스턴스는 렌더마다 재생성되지 않도록 안정적인 참조(`useRef`/`useState`)로 유지해야 하며, 비교 학습 모드 전환으로 `client` 인스턴스 자체가 교체되는 특수 케이스에서는 `key={effectiveSyncMode}` 리마운트를 통해 하위 훅 옵저버가 새 `QueryClient`에 깨끗하게 바인딩되도록 보장합니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> 승인된 작업 스코프(`.agents/active-scope.json`: `products` / `apps/remote-products`) 내 변경 대상 파일 목록입니다.

| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 (서비스 루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `docs/features/20261127-event-source-id/01-plan-and-design.md` | 본 1단계 기획 및 상세 설계 문서 |
| `NEW` | `docs/features/20261127-event-source-id/02-tdd-spec.md` | 2단계 TDD 명세서 |
| `NEW` | `docs/features/20261127-event-source-id/03-code-review.md` | *(5단계-A 작성 예정)* PR 생성 전 심층 코드 리뷰 문서 |
| `MOD` | `docs/todo.md` | 진행 중 작업 등록 및 5단계-C 머지 직전 완료 이관 |
| `MOD` | `src/exposed/ProductList.tsx` | `useRef` 지연 초기화로 `createMfeEventSourceId('remote-products')` 1회 생성·전달 및 `<QueryClientProvider key={effectiveSyncMode}>` 적용 |
| `MOD` | `src/features/catalog/ui/ProductCatalogView.tsx` | 필수 `eventSourceId: string` prop 추가 및 `useAddToCartMutation` 전달 |
| `MOD` | `src/features/catalog/model/use-catalog-queries.ts` | `UseAddToCartMutationOptions.eventSourceId: string` 필수 추가 및 `Mode A` `mfeEventBus.emit(..., { sourceId: eventSourceId })` 적용 |
| `MOD` | `src/App.tsx` | 단독 쇼케이스 `mfe:cart-updated` 실시간 수신 로그에 `meta?.sourceId` 기록 및 표시 |
| `MOD` | `src/testing/stubs/remote-shared-utils.ts` | 최신 `remote-shared/utils` 정본(`sourceId` · `ignoreSourceId` · `createMfeEventSourceId` · 표준 4대 이벤트 · `CSS_ISOLATION_CHANGED` 제거)과 1:1 동기화 |
| `MOD` | `vite.config.ts` | `shared`에 React 서브패스 3종(`react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom/client`) 추가해 6종 싱글톤 통일 |
| `MOD` | `src/__tests__/ProductList.integration.test.tsx` | `sourceId` 발신 검증, 리렌더 시 동일 `sourceId` 유지, 단독 쇼케이스 `sourceId` 로그 표시, `Mode B` 미발행 유지, React 서브패스 3종 정적 회귀 검증 및 스텁 최신화 검증 테스트 보강 |
| `MOD` | `(루트) todo.md` & `docs/service-registry.md` | *(5단계-C 머지 직전 갱신)* `remote-products` `sourceId` 적용 및 React 서브패스 6종 통일 현황 반영 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`
> 노출 컴포넌트 공개 계약(`ProductListProps`)은 변경하지 않아 상위 호스트(`host-vite`, `host-rspack`)와의 하위 호환성을 100% 유지합니다. 내부 인터페이스와 속성에는 인텔리센스 한글 주석(`/** ... */`)을 필수로 작성합니다.

```ts
/** remote-products 이벤트 발신자 식별자(sourceId) 접두사 상수 */
export const PRODUCTS_EVENT_SOURCE_PREFIX = 'remote-products';

/**
 * @description ProductCatalogView 컴포넌트 Props 인터페이스 확장
 */
export interface ProductCatalogViewProps {
  /** 현재 로그인된 사용자 고유 ID (null이면 비로그인 읽기 전용 상태) */
  userId: string | null;

  /** 상위 호스트 출처 ('vite' | 'rspack' | 'standalone') */
  hostType: HostOriginType;

  /** 상태 동기화 비교 모드 ('mode-a-event' | 'mode-b-query') */
  syncMode: SyncMode;

  /** 1.5초 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay: boolean;

  /** 로딩 지연 시간(ms) 오버라이드 */
  delayMs?: number;

  /** 백엔드 API 기본 URL */
  apiBaseUrl?: string;

  /** Mode A 이벤트 발행 시 첨부할 remote-products 인스턴스 고유 발신자 ID (ProductList에서 1회 생성·주입) */
  eventSourceId: string;

  /** 장바구니 담기 완료 시 상위 호스트에 알리는 콜백 */
  onCartAdded?: (payload: CartUpdatedEventPayload) => void;
}

/**
 * @description useAddToCartMutation 훅 설정 옵션 인터페이스 확장
 */
export interface UseAddToCartMutationOptions {
  /** 현재 로그인된 사용자 고유 ID (null이면 비인증 상태로 뮤테이션 실행 차단) */
  userId: string | null;

  /** 상위 호스트 출처 ('vite' | 'rspack' | 'standalone') */
  hostType: HostOriginType;

  /** 상태 동기화 비교 모드 ('mode-a-event' | 'mode-b-query') */
  syncMode: SyncMode;

  /** 백엔드 API 기본 URL */
  apiBaseUrl?: string;

  /** Mode A 이벤트 발행 시 첨부할 remote-products 인스턴스 고유 발신자 ID (ProductList에서 1회 생성·주입) */
  eventSourceId: string;

  /** 장바구니 담기 성공 시 상위 호스트에 알리는 선택적 콜백 */
  onCartAdded?: (payload: CartUpdatedEventPayload) => void;
}

/**
 * @description Port 3002 단독 실행 쇼케이스에서 포착한 mfe:cart-updated 이벤트 로그 항목 인터페이스
 */
interface StandaloneCartEventLog {
  /** Zod 검증을 통과한 장바구니 변경 이벤트 페이로드 */
  payload: CartUpdatedEventPayload;

  /** 발신 측이 emit 옵션으로 첨부한 발신자 ID (미첨부 레거시 이벤트는 'anonymous') */
  sourceId: string;
}
```

### 5.1 발신자 식별자(`sourceId`) 생성 및 전달 흐름
1. `ProductList`가 마운트될 때 `productsSourceIdRef`를 통해 최초 1회만 `createMfeEventSourceId('remote-products')`를 호출하여 `remote-products:<uuid>` 형식의 고유 ID를 생성합니다.
2. `ProductList`는 생성한 `eventSourceId`를 `<ProductCatalogView eventSourceId={productsSourceId} ... />`로 필수 전달하고, `ProductCatalogView`는 `useAddToCartMutation`에 그대로 전달합니다.
3. `useAddToCartMutation`은 `syncMode === 'mode-a-event'` 성공 분기에서 주입받은 `eventSourceId`를 `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, eventPayload, { sourceId: eventSourceId })`로 전달합니다. (`sourceId` 생성 책임을 `ProductList` 단일 지점으로 응집하고 누락은 TypeScript 필수 타입으로 컴파일 타임에 차단합니다.)
4. `syncMode === 'mode-b-query'`에서는 기존과 동일하게 `mfeEventBus.emit`을 전혀 호출하지 않고 `sharedQueryClient.cancelQueries` + `invalidateQueries({ queryKey: CART_QUERY_KEY })`만 수행합니다.

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`products` 전용)
- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared`)**:
  - **노출 모듈 (`exposes`)**: 기존 `'./ProductList': './src/exposed/ProductList.tsx'` 및 `ProductListProps` 공개 시그니처 100% 유지.
  - **소비 모듈 (`remotes`)**: `remote_shared` (`http://localhost:3004/mf-manifest.json`) 유지. `remote_shared/utils`에서 `createMfeEventSourceId` 추가 소비.
  - **공유 의존성 (`shared` & `singleton`)**: 기존 3종에서 **6종 싱글톤 통일**로 확장:
    - `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client` (`singleton: true`, `requiredVersion: '^19.1.0'`)
    - `@tanstack/react-query` (`singleton: true`, `requiredVersion: '^5.74.4'`)
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**:
  - 단독 실행(`App.tsx`)과 호스트 결합(`host-vite`, 향후 `host-rspack`) 모두 `<ProductList />` 진입점을 통해 동일한 `remote-products:<uuid>` 발신자 ID를 자동 발급·전파합니다.
  - 단독 실행 로그 패널(`Collapsible`)에 `source={log.sourceId}`를 추가 표기해 개발자가 호스트 없이도 발신자 메타 전파를 검증할 수 있습니다.
- **마이크로 앱 간 통신 및 상태 공유 (`CustomEvent` / `sharedQueryClient`)**:
  - `Mode A`: `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, eventPayload, { sourceId })` 호출 → `host-vite`의 `MfeInspector`가 `source: remote-products:<uuid>`로 식별하고, `remote-cart`는 `ignoreSourceId`(`remote-cart:<uuid>`)와 불일치하므로 정상 수신·1회 재조회합니다.
  - `Mode B`: `mfeEventBus.emit` 미호출 유지 + `<QueryClientProvider key={effectiveSyncMode}>` 리마운트로 `Mode A ↔ Mode B` 전환 시 `QueryClient` 바인딩을 일관되게 교체합니다.
- **공통 UI 컴포넌트 (`Ark UI`) 및 스타일 격리 (CSS 변수 / 프리픽스)**:
  - 변경 없음 (기존 `remote_shared/ui` 소비 및 `.prod-*` / `var(--mfe-*)` 100% 유지).

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `N/A (해당 없음 — 프론트엔드 도메인 원격 앱 스코프)`
