# 🧪 [TDD 명세서] 상품 목록 원격 앱(`./ProductList`) 및 `Mode A vs Mode B` 동기화 구축 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 시드 데이터, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `Vitest`, `ErrorBoundary`, `Suspense`, `CustomEvent`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `products` (`apps/remote-products`, `Port 3002`) |
| **테스트 러너 및 모킹 도구** | `Vitest` (`jsdom` 환경) + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` + `MSW` (`msw/node`) |
| **단위 테스트 경로 (`Co-location`)** | `src/features/catalog/model/catalog-schema.test.ts`, `src/features/catalog/api/catalog-api.test.ts`, `src/features/catalog/ui/ProductFilterBar.test.tsx`, `src/features/catalog/ui/ProductCard.test.tsx` |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/ProductList.integration.test.tsx` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/remote-products test` (루트 통합: `pnpm test`) |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 작성 전 먼저 실패하는 테스트(`Red`)로 구현할 목록입니다.

### TC-01: 상품·장바구니 `Zod` 스키마 검증 및 `createScopedStorage('products')` 필터 영속화 (`catalog-schema.test.ts`)
- **사전 조건 (`Given`)**: `productFilterSchema`, `productEntityListSchema`, `cartItemViewSchema` 및 `products` 스코프 스토리지 도우미(`loadCatalogFilter`, `saveCatalogFilter`, `resetCatalogFilter`)가 정의된 상태
- **실행 동작 (`When`)**:
  1. 유효한 필터(`{ category: 'electronics', search: '  키보드  ' }`)를 `productFilterSchema.parse()`에 통과시킨다.
  2. `saveCatalogFilter({ category: 'office', search: '모션 데스크' })`를 실행한 뒤 `loadCatalogFilter()`로 다시 읽어들인다.
- **기대 결과 (`Then`)**:
  1. 검색어 양끝 공백이 자동 제거(`'키보드'`)되어 반환되어야 한다.
  2. `window.localStorage`에는 `'mfe:products:catalog-filter'` 키로 격리 저장되며, `loadCatalogFilter()` 호출 시 저장된 필터 객체가 정확히 복원되어야 한다 ([Study 04 #10](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md)).

### TC-02: `fetchProducts` & `postAddToCart` API 호출, `Zod` 응답 언래핑 및 `AbortSignal` 지연 취소 검증 (`catalog-api.test.ts`)
- **사전 조건 (`Given`)**: `MSW` 서버가 `GET http://localhost:4000/api/products` 및 `POST http://localhost:4000/api/cart` 요청에 대해 표준 `ApiResponse<T>` 봉투를 반환하도록 설정된 상태
- **실행 동작 (`When`)**:
  1. `fetchProducts({ category: 'electronics', search: '키보드' })`를 호출한다.
  2. `postAddToCart({ userId: 'user-1', productId: 1, quantity: 2, addedFromHost: 'standalone' })`를 호출한다.
  3. `simulateDelay: true` 옵션과 함께 `AbortController`를 전달하고, 1.5초가 지나기 전에 `controller.abort()`를 호출한다.
- **기대 결과 (`Then`)**:
  1. `fetchProducts`는 조건에 부합하는 상품 배열(`ProductEntity[]`)만 언래핑하여 반환해야 한다.
  2. `postAddToCart`는 추가된 장바구니 항목(`CartItemView`)을 언래핑하여 반환해야 한다.
  3. 지연 도중 `abort()` 호출 시 타이머가 즉시 정리되고 `AbortError`로 거부(reject)되어 불필요한 네트워크 호출이 일어나지 않아야 한다 ([Study 05 #01](../../../../../docs/study/05-fullstack-service-real-world-issues.md)).

### TC-03: `ProductFilterBar` 카테고리 선택(`Select`) 및 키워드 검색 폼(`React Hook Form + Zod`) 동작 검증 (`ProductFilterBar.test.tsx`)
- **사전 조건 (`Given`)**: `<ProductFilterBar filter={{ category: 'all', search: '' }} totalCount={6} onFilterChange={onFilterChange} onReset={onReset} />`가 마운트된 상태
- **실행 동작 (`When`)**:
  1. 카테고리 드롭다운(`Select`)에서 `'전자기기 (electronics)'`를 선택한다.
  2. 검색어 입력창에 `'마우스'`를 입력하고 **[검색]** 버튼을 클릭한다.
  3. 필터가 적용된 상태에서 **[필터 초기화]** 버튼을 클릭한다.
- **기대 결과 (`Then`)**:
  1. 카테고리 변경 즉시 `onFilterChange({ category: 'electronics', search: '' })`가 호출되어야 한다.
  2. 검색 폼 제출 시 `onFilterChange`에 trim된 검색어 `'마우스'`가 전달되어야 한다.
  3. 초기화 클릭 시 `onReset`이 호출되고 검색 입력창이 빈 문자열로 리셋되어야 한다.

### TC-04: `ProductCard` 상품 정보 렌더링, 품절(`stock === 0`) 비활성화 및 로딩 중(`isPending`) 중복 클릭 차단 검증 (`ProductCard.test.tsx`)
- **사전 조건 (`Given`)**: 정상 재고 상품(`id: 1`, `price: 129000`, `stock: 15`) 카드와 품절 상품(`id: 6`, `stock: 0`) 카드가 각각 렌더링된 상태
- **실행 동작 (`When`)**:
  1. 정상 재고 상품 카드에서 가격 포맷(`129,000원`), 카테고리 배지, 재고 수량 표시를 확인하고 **[장바구니 담기]** 버튼을 클릭한다.
  2. `isAdding={true}`(요청 진행 중) 상태로 렌더링된 카드에서 **[장바구니 담기]** 버튼을 연타한다.
  3. 품절 상품(`stock: 0`) 카드의 버튼 상태를 확인한다.
- **기대 결과 (`Then`)**:
  1. 정상 상품 클릭 시 `onAddToCart(product)`가 정확히 1회 호출되어야 한다.
  2. `isAdding={true}`일 때는 버튼에 `disabled` 및 `aria-busy="true"`가 적용되어 연타해도 `onAddToCart`가 호출되지 않아야 한다 ([Study 05 #01, #15](../../../../../docs/study/05-fullstack-service-real-world-issues.md)).
  3. 품절 상품은 `'품절'` 배지가 표시되고 담기 버튼이 비활성화(`disabled`)되어야 한다.

### TC-05: `ProductList` 통합 플로우 — `Mode A (CustomEvent)` vs `Mode B (sharedQueryClient)` 상태 동기화 비교 검증 (`ProductList.integration.test.tsx`)
- **사전 조건 (`Given`)**: `MSW` 서버가 기동된 상태에서 `mfeEventBus.emit` 스파이와 `sharedQueryClient.invalidateQueries` 스파이가 감시 중인 상태
- **실행 동작 (`When`)**:
  1. `<ProductList userId="user-1" hostType="vite" syncMode="mode-a-event" onCartAdded={onCartAdded} />`를 마운트하고 첫 번째 상품의 **[장바구니 담기]**를 클릭한다.
  2. 스파이를 초기화한 뒤 `syncMode="mode-b-query"`로 변경하여 다시 **[장바구니 담기]**를 클릭한다.
- **기대 결과 (`Then`)**:
  1. **`Mode A ('mode-a-event')`일 때**:
     - `mfeEventBus.emit`이 `MFE_EVENTS.CART_UPDATED` 및 `{ action: 'add', userId: 'user-1', productId: 1, quantity: 1, sourceHost: 'vite', ... }` 페이로드로 **정확히 1회 호출**되어야 한다.
     - `sharedQueryClient.invalidateQueries`는 **호출되지 않아야 한다(`0회`)** (메모리 캐시 공유 없이 순수 이벤트 신호만 사용하는 아키텍처 입증).
  2. **`Mode B ('mode-b-query')`일 때**:
     - 뮤테이션 시작 시 `sharedQueryClient.cancelQueries({ queryKey: CART_QUERY_KEY })`가 호출되고, 성공 시 `sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })`가 **정확히 1회 호출**되어야 한다.
     - `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, ...)`는 **호출되지 않아야 한다(`0회`)** (이벤트 버스 없이 싱글톤 쿼리 캐시 무효화만으로 동기화되는 아키텍처 입증).
  3. 두 모드 모두 상위 호스트 콜백인 `onCartAdded(payload)`는 정상 호출되어야 한다.

### TC-06: 1.5초 로딩 지연 시뮬레이션(`simulateDelay`) 스켈레톤 전환 및 단독 실행(`App.tsx`) + 아키텍처 무결성 검증 (`ProductList.integration.test.tsx`)
- **사전 조건 (`Given`)**: `<ProductList simulateDelay={true} />` 및 단독 실행 쇼케이스 `<App />`과 프로젝트 설정 파일(`package.json`, `vite.config.ts`, `tsconfig.json`, `src/**/*.tsx`, `catalog.css`)이 준비된 상태
- **실행 동작 (`When`)**:
  1. `simulateDelay={true}`로 마운트 직후 로딩 스켈레톤(`ProductGridSkeleton`)이 먼저 표시되었다가 응답 완료 후 실제 상품 목록으로 전환되는지 확인한다.
  2. 단독 실행 `<App />`을 마운트하고 상단 컨트롤 바(유저·동기화모드·지연 토글) 조작이 카탈로그에 반영되는지 확인한다.
  3. 정적 아키텍처 무결성(① `package.json`에 `@ark-ui/react`·`clsx` 직접 설치 금지, ② `vite.config.ts`에 `remote_shared` 소비·`./ProductList` 노출·`dts.consumeTypes` & `dts.generateTypes` 설정, ③ `src/` 내 모든 `.tsx` 파일 `PascalCase` 네이밍, ④ `catalog.css` 내 전역 태그 선택자 및 `#hex` 색상 하드코딩 금지)을 검사한다.
- **기대 결과 (`Then`)**:
  1. 로딩 중에는 CLS 방지용 6-카드 스켈레톤 그리드가 렌더링되고 완료 후 시드 상품 목록이 렌더링되어야 한다 ([Study 05 #13](../../../../../docs/study/05-fullstack-service-real-world-issues.md)).
  2. 단독 실행 화면(`App.tsx`)이 에러 없이 동작하고, 4대 아키텍처 무결성 정적 검사를 100% 통과해야 한다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`

### EC-01: 오염된 로컬 스토리지 필터 JSON 또는 50자 초과 검색어 입력 시 방어 검증 (`catalog-schema.test.ts`, `ProductFilterBar.test.tsx`)
- **사전 조건 (`Given`)**: `'mfe:products:catalog-filter'` 키에 손상된 JSON(`"{bad"`)이나 지원하지 않는 카테고리(`"toys"`)가 들어있거나, 사용자가 51자 이상의 검색어를 입력한 상황
- **실행 동작 (`When`)**: `loadCatalogFilter()`를 호출하거나 검색 폼을 제출한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. 스토리지 오염 시 크래시 없이 기본 필터(`{ category: 'all', search: '' }`)로 안전하게 복구되어야 한다.
  2. 50자 초과 검색어 제출 시 `Zod` 검증 에러 메시지(`"검색어는 최대 50자까지 입력할 수 있습니다."`)가 표시되고 `onFilterChange`가 호출되지 않아야 한다.

### EC-02: 장바구니 담기 시 백엔드 `400 OUT_OF_STOCK` 에러 응답 처리 및 인라인 에러 복구 검증 (`ProductList.integration.test.tsx`)
- **사전 조건 (`Given`)**: 레이스 컨디션 등으로 인해 `POST /api/cart`가 HTTP `400` `{ success: false, error: { code: 'OUT_OF_STOCK', message: '선택하신 상품의 재고가 부족합니다.' } }`를 반환하는 상황
- **실행 동작 (`When`)**: 상품 카드에서 **[장바구니 담기]**를 클릭한다.
- **기대 결과 및 폴백 동작 (`Then`)**: 전체 화면이 죽지 않고 해당 상품 카드(또는 상단 알림 배너)에 `role="alert"`로 백엔드 에러 메시지(`"선택하신 상품의 재고가 부족합니다."`)가 표시되며, 버튼의 로딩 잠금(`isPending`)이 즉시 해제되어 다시 시도할 수 있어야 한다.

### EC-03: 검색 결과가 0건인 빈 상태(`Empty State`) 및 목록 조회(`GET /api/products`) 서버 장애 시 재시도 복구 검증 (`ProductList.integration.test.tsx`)
- **사전 조건 (`Given`)**: 존재하지 않는 키워드(`'없는상품XYZ'`)로 검색하거나, `GET /api/products`가 일시적 `500` 에러를 반환한 뒤 다음 요청에서는 `200` 정상 응답을 반환하는 상황
- **실행 동작 (`When`)**:
  1. `'없는상품XYZ'`로 검색을 실행한다.
  2. API `500` 에러 상태에서 노출된 **[다시 시도]** 버튼을 클릭한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. 빈 결과일 때는 안내 문구와 함께 **[필터 초기화]** 버튼이 제공되어 클릭 시 전체 상품 목록으로 즉시 복귀해야 한다.
  2. 조회 에러 시 인라인 에러 영역과 **[다시 시도]** 버튼이 렌더링되며, 클릭 시 재조회가 수행되어 정상 상품 목록으로 복구되어야 한다.

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**:
  - `vitest.config.ts`의 `resolve.alias`를 통해 `remote_shared/ui`, `remote_shared/theme`, `remote_shared/utils`를 `src/testing/stubs/` 아래의 로컬 스텁으로 매핑하여 `remote-shared(3004)` 서버 기동 없이도 단독 `pnpm test`가 100% 동작하도록 구성합니다 ([Study 04 #11](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md)).
  - 특히 `remote-shared-utils.ts` 스텁은 실제 `QueryClient`, `CustomEvent` 디스패처, `ky` 클라이언트와 동일한 시그니처로 동작하게 하여 `Mode A` 이벤트 발행과 `Mode B` `sharedQueryClient` 캐시 무효화를 실제 런타임과 동일하게 검증합니다.
- **네트워크 / API 모킹 (`src/testing/msw/`)**:
  - `msw/node`의 `setupServer`와 `handlers.ts`를 통해 백엔드 시드 데이터 6종(`id: 1 ~ 6`, 6번 품절 상품 포함)에 대한 카테고리·검색어 필터링(`GET /api/products`) 및 장바구니 추가(`POST /api/cart`) 응답 봉투를 모킹합니다.
- **테스트 픽스처**:
  - [서비스 레지스트리 `§ 3.3`](../../../../../docs/service-registry.md)에 정의된 6종 상품 시드 데이터(`기계식 무선 키보드 Pro` 외 5종)를 그대로 픽스처로 사용하여 백엔드 시드와 1:1 정합성을 유지합니다.

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`products` 전용)
- **적용 여부**: `적용`
- [ ] **단독 실행(Standalone) 렌더링 검증**: 호스트 없이 단독 엔트리(`App.tsx` / `bootstrap.tsx`) 마운트 시 컨트롤 바와 카탈로그가 정상 동작하는가?
- [ ] **리모트 장애 격리 및 인라인 에러 복구**: API 에러 발생 시 인라인 에러 배너와 `[다시 시도]` 버튼으로 자체 복구되는가?
- [ ] **`Mode A` vs `Mode B` 상태 동기화 검증**: `Mode A`에서는 `mfe:cart-updated` 이벤트 발행만, `Mode B`에서는 `sharedQueryClient.invalidateQueries(['cart'])`만 정확히 수행되는가?
- [ ] **접근성(A11y) 및 스타일 격리 검증**: `aria-busy`, `role="alert"`, `.prod-*` 클래스 프리픽스, `var(--mfe-*)` 변수, `tabular-nums`가 정상 적용되었는가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
- **적용 여부**: `N/A (해당 없음)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [ ] 모든 단위 및 통합 테스트(`Vitest`)가 통과(`Green`)했는가?
- [ ] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 등)을 준수했는가?
- [ ] `Biome` 포맷팅 및 린트 검사(`LF` 줄바꿈 포함)를 통과했는가?
- [ ] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`, `apps/remote-products/docs/todo.md`, 그리고 [`docs/service-registry.md`](../../../../../docs/service-registry.md)를 최신 상태로 업데이트했는가?
