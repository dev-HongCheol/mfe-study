# 🧪 [TDD 명세서] 장바구니 원격 앱(`./CartWidget`, `Rspack`) 및 `Mode A vs Mode B` 동기화 구축 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 시드 데이터, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `Vitest`, `ErrorBoundary`, `Suspense`, `CustomEvent`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `cart` (`apps/remote-cart`, `Port 3003`) |
| **테스트 러너 및 모킹 도구** | `Vitest` (`jsdom` 환경) + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` + `MSW` (`msw/node`) |
| **단위 테스트 경로 (`Co-location`)** | `src/features/cart/model/cart-schema.test.ts`, `src/features/cart/api/cart-api.test.ts`, `src/features/cart/ui/CartHeaderBar.test.tsx`, `src/features/cart/ui/CartItemRow.test.tsx`, `src/features/cart/ui/CartSummaryCard.test.tsx`, `src/features/cart/ui/CartErrorBanner.test.tsx`, `src/features/cart/ui/CartContent.test.tsx` |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/CartWidget.integration.test.tsx` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/remote-cart test` (루트 통합: `pnpm test`) |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 작성 전 먼저 실패하는 테스트(`Red`)로 구현할 목록입니다.

### TC-01: 장바구니 `Zod` 스키마, 파생 합계(`calculateCartTotals`), `normalizeUserId` 및 지연 스토리지 영속화 (`cart-schema.test.ts`)
- **사전 조건 (`Given`)**: `cartItemListSchema`, `deleteCartResultSchema`, `calculateCartTotals`, `normalizeUserId`, `loadCartPreferences`, `saveCartPreferences`가 정의된 상태
- **실행 동작 (`When`)**:
  1. 2건의 `CartItemView`(`129,000원 × 1개`, `42,000원 × 2개`)를 `cartItemListSchema.parse()` 및 `calculateCartTotals()`에 전달한다.
  2. `normalizeUserId('  user-1  ')`, `normalizeUserId(null)`, `normalizeUserId('   ')`를 호출한다.
  3. `saveCartPreferences({ cssIsolated: false })`를 실행한 뒤 `loadCartPreferences()`로 복원한다.
- **기대 결과 (`Then`)**:
  1. `calculateCartTotals`는 `{ itemCount: 2, totalQuantity: 3, totalPrice: 213000 }`을 정수 연산 오차 없이 반환해야 한다 ([Study 05 #03, #04](../../../../../docs/study/05-fullstack-service-real-world-issues.md)).
  2. `normalizeUserId`는 유효한 ID만 공백 제거해 반환하고 `null`/빈 문자열/공백은 `null`을 반환해야 한다 (`SSOT § 5.4.3`).
  3. `window.localStorage`에 `'mfe:cart:preferences'` 키로 격리 저장되며 `loadCartPreferences()`가 `{ cssIsolated: false }`를 정확히 복원해야 한다 ([Study 04 #10](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md)).

### TC-02: `fetchCartItems`, `postIncrementCartItem`, `deleteCartItemApi` API 호출 및 `AbortSignal` 지연 취소 검증 (`cart-api.test.ts`)
- **사전 조건 (`Given`)**: `MSW` 서버가 `GET /api/cart`, `POST /api/cart`, `DELETE /api/cart/:id` 요청에 표준 `ApiResponse<T>` 봉투를 반환하도록 설정된 상태
- **실행 동작 (`When`)**:
  1. `fetchCartItems({ userId: 'user-1' })`를 호출한다.
  2. `postIncrementCartItem({ userId: 'user-1', productId: 1, quantity: 1, addedFromHost: 'rspack' })`를 호출한다.
  3. `deleteCartItemApi({ targetId: 1, userId: 'user-1' })` 및 `deleteCartItemApi({ targetId: 'all', userId: 'user-1' })`를 호출한다.
  4. `simulateDelay: true`, `delayMs: 1500`과 함께 `AbortController`를 넘기고 지연 완료 전에 `controller.abort()`를 호출한다.
- **기대 결과 (`Then`)**:
  1. `fetchCartItems`는 `CartItemView[]`를, `postIncrementCartItem`은 갱신된 `CartItemView`를, `deleteCartItemApi`는 `{ deletedId, deletedCount }`를 `Zod` 검증 후 언래핑 반환해야 한다.
  2. 지연 도중 `abort()` 호출 시 타이머가 즉시 정리되고 `AbortError`로 거부되어야 한다 ([Study 05 #01](../../../../../docs/study/05-fullstack-service-real-world-issues.md)).

### TC-03: `CartItemRow` 및 `CartSummaryCard` 렌더링, 중복 클릭 방지(`isPending`) 및 삭제·비우기 콜백 검증 (`CartItemRow.test.tsx`, `CartSummaryCard.test.tsx`)
- **사전 조건 (`Given`)**: `CartItemView`(`기계식 무선 키보드 Pro`, `129,000원`, `수량 2`, `addedFromHost: 'vite'`) 행과 `CartSummaryCard`가 렌더링된 상태
- **실행 동작 (`When`)**:
  1. `CartItemRow`에서 상품명, 단가/소계(`258,000원`), 출처 배지(`vite`)를 확인하고 **[+1]** 버튼과 **[삭제]** 버튼을 클릭한다.
  2. `isMutating={true}` 상태에서 **[+1]**·**[삭제]** 버튼을 연타한다.
  3. `CartSummaryCard`에서 총 수량·총 금액(`213,000원`)을 확인하고 **[전체 비우기]** 버튼을 클릭한다.
- **기대 결과 (`Then`)**:
  1. 정상 클릭 시 `onIncrement(item)`, `onDelete(item)`, `onClearAll()`이 각각 정확히 1회 호출되어야 한다.
  2. `isMutating={true}`일 때는 버튼이 `disabled` 및 `aria-busy="true"`로 잠겨 중복 호출이 0회여야 한다 ([Study 05 #01, #15](../../../../../docs/study/05-fullstack-service-real-world-issues.md)).

### TC-04: `CartHeaderBar`, `CartErrorBanner`, `CartContent` UI 책임 분리 및 `DEV`/`PROD` 진단 이원화 검증 (`CartHeaderBar.test.tsx`, `CartErrorBanner.test.tsx`, `CartContent.test.tsx`)
- **사전 조건 (`Given`)**: 각 프레젠테이션 컴포넌트에 상태별 Props(`syncMode`, `cssIsolated`, `DEV/PROD` 스키마 에러, 비로그인/로딩/에러/빈 상태/목록 상태)가 주입된 상태
- **실행 동작 (`When`)**:
  1. `CartHeaderBar`에 `syncMode="mode-b-query"`, `cssIsolated={false}`, `receivedEventCount={2}`를 전달해 렌더링한다.
  2. `CartErrorBanner`에 `RESPONSE_SCHEMA_INVALID` 리포트를 `DEV` 모드(`devDetails` 포함)와 `PROD` 모드(`devDetails: []`)로 각각 렌더링하고 **[다시 시도]** 버튼을 클릭한다.
  3. `CartContent`를 비로그인(`!isAuthenticated`) · 로딩(`isLoading`) · 에러(`error`) · 빈 목록(`items: []`) · 정상 목록 5가지 상태로 렌더링한다.
- **기대 결과 (`Then`)**:
  1. `CartHeaderBar`는 현재 동기화 모드 배지와 CSS 비격리 경고 배지를 정확히 표시해야 한다.
  2. `CartErrorBanner`는 `DEV`에서만 `[DEV 상세 진단 — 스키마 불일치 필드]`를 노출하고 `PROD`에서는 내부 필드 경로를 완전히 숨기며, **[다시 시도]** 클릭 시 `onRetry`를 호출해야 한다 ([Study 05 #10](../../../../../docs/study/05-fullstack-service-real-world-issues.md)).
  3. `CartContent`는 5가지 상태를 Early Return으로 상호 배타적으로 렌더링해야 한다.

### TC-05: `CartWidget` 통합 플로우 — `Mode A (CustomEvent 수신 재조회)` vs `Mode B (sharedQueryClient 자동 감지)` 대칭 비교 검증 (`CartWidget.integration.test.tsx`)
- **사전 조건 (`Given`)**: `MSW` 서버가 `user-1`의 초기 장바구니 2건을 반환하며, 외부에서 장바구니에 신규 상품이 추가된 뒤 두 모드에서 각각 동기화 트리거를 실행하는 상황
- **실행 동작 (`When`)**:
  1. **`Mode A ('mode-a-event')`**: `<CartWidget userId="user-1" hostType="rspack" syncMode="mode-a-event" />`를 마운트하고 초기 2건 렌더링을 확인한 뒤, 백엔드 데이터를 3건으로 갱신하고 `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, { action: 'add', userId: 'user-1', ... })`를 발행한다. 이어서 항목 1건을 **[삭제]**한다.
  2. **`Mode B ('mode-b-query')`**: `<CartWidget userId="user-1" hostType="rspack" syncMode="mode-b-query" />`를 마운트(이때 `createMfeQueryClient` 미호출 확인)하고, `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, ...)`를 발행했을 때 재조회가 일어나지 않음을 확인한 뒤, `sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })`를 호출한다. 이어서 항목 1건을 **[+1]** 증가시킨다.
- **기대 결과 (`Then`)**:
  1. **`Mode A`일 때**:
     - `mfe:cart-updated` 이벤트 수신 즉시 독립 `QueryClient`가 `GET /api/cart`를 재조회해 3건으로 화면이 갱신되어야 한다.
     - 항목 **[삭제]** 성공 시 `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, { action: 'remove', ... })`가 호출되고 `sharedQueryClient.invalidateQueries`는 호출되지 않아야 한다(`0회`).
  2. **`Mode B`일 때**:
     - 마운트 시 `createMfeQueryClient`를 호출하지 않고(`0회`) 싱글톤 `sharedQueryClient`만 사용해야 한다.
     - `mfe:cart-updated` 이벤트만으로는 불필요한 재조회를 수행하지 않고, `sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })` 호출 시 자동으로 최신 목록을 재조회해 화면이 갱신되어야 한다.
     - 내부 **[+1]** 뮤테이션 시 `sharedQueryClient.cancelQueries({ queryKey: CART_QUERY_KEY })`와 `sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })`가 호출되고 `mfeEventBus.emit`은 호출되지 않아야 한다(`0회`).

### TC-06: CSS 격리/오염 비교 토글(`cssIsolated`), 1.5초 지연 스켈레톤, 단독 실행(`App.tsx`) 및 아키텍처 무결성 검증 (`CartWidget.integration.test.tsx`)
- **사전 조건 (`Given`)**: `<CartWidget simulateDelay={true} delayMs={40} cssIsolated={false} />`, 단독 실행 `<App />` 및 설정 파일(`package.json`, `rsbuild.config.ts`, `tsconfig.json`, `src/rsbuild-env.d.ts`, `src/**/*.tsx`, `cart.css`)이 준비된 상태
- **실행 동작 (`When`)**:
  1. `simulateDelay={true}` 마운트 직후 `CartSkeleton`이 먼저 표시되었다가 응답 완료 후 목록으로 전환되는지 확인한다.
  2. `cssIsolated={false}` 전달 시 위젯 루트에 `data-css-isolated="false"` 속성과 비격리 스타일 충돌 경고 영역이 렌더링되는지 확인한다.
  3. 단독 실행 `<App />`을 마운트하고 상단 컨트롤 바(유저·동기화모드·CSS 격리 토글·이벤트 시뮬레이터)가 정상 동작하는지 확인한다.
  4. 정적 아키텍처 무결성(① `package.json`에 `@ark-ui/react`·`clsx` 직접 설치 0건, ② `rsbuild.config.ts`에 `remote_shared` 소비·`./CartWidget` 노출·`watchOptions.ignored`·`disableDynamicRemoteTypeHints`·`dts` 설정 존재, ③ `src/rsbuild-env.d.ts`에 `@ark-ui/react` 임시 Shim 0줄, ④ 모든 `.tsx` 파일 `PascalCase`, ⑤ `cart.css` 내 전역 태그 선택자 및 `#hex` 하드코딩 금지)을 검사한다.
- **기대 결과 (`Then`)**:
  1. 로딩 중에는 CLS 방지 스켈레톤이 표시되고 완료 후 장바구니 목록으로 부드럽게 전환되어야 한다.
  2. CSS 격리 토글, 단독 쇼케이스 및 5대 아키텍처 무결성 정적 검증을 100% 통과해야 한다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`

### EC-01: 비로그인(`userId` 미전달/`null`/공백) 시 API 호출 0회 차단 및 `mfe:auth-changed` 로그인 전환 검증 (`CartWidget.integration.test.tsx`)
- **사전 조건 (`Given`)**: `userId`가 전달되지 않거나(`undefined` / `null` / `'   '`) `MSW` 요청 카운터가 `GET /api/cart` 호출 횟수를 감시 중인 상태
- **실행 동작 (`When`)**:
  1. `<CartWidget />` 및 `<CartWidget userId={null} />`를 마운트한다.
  2. 이후 `mfeEventBus.emit(MFE_EVENTS.AUTH_CHANGED, { userId: 'user-1', username: '홍길동 (VIP)', token: 'tok-1', timestamp: '...' })`를 발행한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. 비로그인 상태에서는 임의 유저(`'user-1'`)로 절대 폴백하지 않고 `GET /api/cart` 요청 횟수가 **`0회`**여야 하며, 로그인 필요 안내 화면이 표시되어야 한다 (`SSOT § 5.4.3`).
  2. `mfe:auth-changed` 이벤트 수신 후에는 `user-1`로 전환되어 장바구니 목록이 정상 조회되어야 한다.

### EC-02: 오염된 로컬 스토리지 설정 JSON 및 수량 증가 시 백엔드 `400 OUT_OF_STOCK` 에러 복구 검증 (`cart-schema.test.ts`, `CartWidget.integration.test.tsx`)
- **사전 조건 (`Given`)**: `'mfe:cart:preferences'`에 손상된 JSON(`"{bad"`)이 저장되어 있거나, `[+1]` 클릭 시 `POST /api/cart`가 `400 OUT_OF_STOCK` 에러 봉투를 반환하는 상황
- **실행 동작 (`When`)**: `loadCartPreferences()`를 호출하거나 장바구니 항목의 **[+1]** 버튼을 클릭한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. 손상된 스토리지는 크래시 없이 기본값(`{ cssIsolated: true }`)으로 복구되어야 한다.
  2. `OUT_OF_STOCK` 에러 발생 시 전체 위젯이 죽지 않고 `role="alert"` 인라인 에러 배너에 백엔드 한글 메시지가 표시되며 버튼 로딩 잠금이 즉시 해제되어야 한다.

### EC-03: 빈 장바구니(`user-2`) 안내 화면 및 `GET /api/cart` 서버 `500` 장애 시 `[다시 시도]` 복구 + `DEV`/`PROD` 스키마 오류 리포트 검증 (`cart-schema.test.ts`, `CartWidget.integration.test.tsx`)
- **사전 조건 (`Given`)**: `user-2`처럼 장바구니가 빈 상태이거나, `GET /api/cart`가 일시적 `500` 에러를 반환한 뒤 다음 요청에서 정상 목록을 반환하는 상황, 그리고 스키마 불일치(`RESPONSE_SCHEMA_INVALID`) 에러가 발생한 상황
- **실행 동작 (`When`)**:
  1. `userId="user-2"`로 마운트하여 빈 상태를 확인한다.
  2. `500` 에러 배너의 **[다시 시도]** 버튼을 클릭한다.
  3. `formatCartErrorReport(schemaError, true)`와 `formatCartErrorReport(schemaError, false)`를 비교 호출한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. 빈 장바구니에서는 안내 문구와 총액 `0원` 상태가 안전하게 표시되고 **[전체 비우기]** 버튼은 비활성화(또는 숨김)되어야 한다.
  2. **[다시 시도]** 클릭 시 재조회에 성공해 장바구니 목록으로 복구되어야 한다.
  3. `DEV` 리포트에는 실패한 필드 좌표(`path`, `code`, `message`)가 포함되고 `PROD` 리포트의 `devDetails`는 빈 배열(`[]`)이어야 한다.

### EC-04: 컴포넌트 언마운트 시 `useMfeEvent` 좀비 리스너 자동 정리 검증 (`CartWidget.integration.test.tsx`)
- **사전 조건 (`Given`)**: `Mode A`로 `<CartWidget userId="user-1" syncMode="mode-a-event" />`를 마운트한 뒤 언마운트(`unmount()`)한 상태
- **실행 동작 (`When`)**: 언마운트 이후 `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, { action: 'add', userId: 'user-1', ... })`를 3회 연속 발행한다.
- **기대 결과 및 폴백 동작 (`Then`)**: 언마운트 이후 추가적인 `GET /api/cart` 요청이 **`0회`**여야 한다 ([Study 04 #09](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md)).

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**:
  - `vitest.config.ts`의 `resolve.alias`로 `remote_shared/ui`, `remote_shared/theme`, `remote_shared/utils`를 `src/testing/stubs/` 로컬 스텁으로 매핑하여 `remote-shared(3004)` 서버 없이 100% 독립 TDD를 실행합니다 ([Study 04 #11](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md)).
- **네트워크 / API 모킹 (`src/testing/msw/`)**:
  - `msw/node` (`setupServer`)로 `GET /api/cart`, `POST /api/cart`, `DELETE /api/cart/:id` 엔드포인트를 `apps/api-server` 계약(`§ 5.1.3`)과 동일하게 인메모리 상태로 모킹하며, 테스트 간 상태 누수 방지를 위해 `afterEach`에서 픽스처와 핸들러를 초기화합니다.
- **테스트 픽스처 (시드 데이터)**:
  - `user-1`: `기계식 무선 키보드 Pro` (`129,000원`, 수량 `1`, `vite`), `알루미늄 노트북 거치대 Stand` (`42,000원`, 수량 `2`, `standalone`) — 총 `3개` / `213,000원`
  - `user-2`: 빈 장바구니 (`[]`)

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`cart` 전용)
- **적용 여부**: `적용`
- [x] **단독 실행(Standalone) 렌더링 검증**: 호스트 없이 `src/App.tsx` 단독 엔트리 마운트 시 유저·모드·CSS 격리·테마·지연·샘플 상품 담기·이벤트 시뮬레이터가 정상 동작하는가?
- [x] **이종 번들러(`Rspack` ↔ `Vite`) 빌드 및 무-Shim `@mf-types` 검증**: `rsbuild build` 및 `tsc --noEmit`가 `@ark-ui/react` 임시 Shim `0줄` 상태로 에러 없이 통과하고 `dist/remoteEntry.js` · `dist/mf-manifest.json` · `dist/@mf-types.zip`을 정상 생성하는가?
- [x] **이벤트 버스 및 쿼리 캐시 연동**: `Mode A`(`useMfeEvent` + 독립 `QueryClient`)와 `Mode B`(싱글톤 `sharedQueryClient` + `cancelQueries`/`invalidateQueries`)가 서로의 메커니즘을 침범하지 않고 대칭 동작하는가?
- [x] **접근성(A11y) 및 역할 검증**: 로딩 중 `aria-busy="true"`, 에러 배너 `role="alert"`, 비로그인 안내 및 버튼 비활성화 속성이 정상 렌더링되는가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
- **적용 여부**: `N/A (해당 없음)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [x] 모든 단위 및 통합 테스트(`Vitest`)가 통과(`Green`)했는가? (`remote-cart 8개 파일 / 28건`, 루트 전체 `42개 파일 / 126건`)
- [x] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 등)을 준수했는가?
- [x] `Biome` 포맷팅 및 린트 검사(`LF` 줄바꿈 포함)를 통과했는가?
- [x] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`, `apps/remote-cart/docs/todo.md` 및 `docs/service-registry.md`를 최신 상태로 업데이트했는가?
