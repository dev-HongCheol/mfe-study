# 📐 [기획 및 설계] `remote-cart` `Mode A` 자기 에코(Self-Echo) 제거 및 `QueryClient` 단위 동기화 채널 리팩토링 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Suspense`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261124-queryclient-sync-channel` |
| **서비스 스코프 (`Scope ID`)** | `cart` (`apps/remote-cart`) |
| **작업 브랜치** | `cart/refactor/queryclient-sync-channel` |
| **기술 스택 / 번들러** | `Rsbuild (Rspack 1.7) + React 19 + TypeScript 5.7 + @module-federation/rsbuild-plugin + TanStack Query v5 + Zod + MSW + Vitest` |
| **작성일** | `2026-11-24` |
| **작업 규모 평가** | `적정 (단일 PR)` — 1차 선행 PR(#16 `remote-shared/utils` `sourceId` 자기 에코 차단) 완료 후 `apps/remote-cart` 내부 동기화 채널 리팩토링·쿼리 키 정렬·테스트 스텁 동기화 및 8대 회귀 테스트 구축에 집중 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`

### 2.1 기획 배경 및 목적
- `Step 1.4` 초기 구현에서 `apps/remote-cart`의 `Mode A (mode-a-event)`는 장바구니 쓰기 뮤테이션(`[+1]`, `[삭제]`, `[전체 비우기]`) 성공 시 **`await invalidateQueries()`로 1차 재조회 완료 후 `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED)`를 발행**하고, 같은 위젯의 `useMfeEvent` 리스너가 자신이 발행한 이벤트를 동기적으로 되받아(Self-Echo) **`receivedEventCount`를 잘못 증가시키고 2차 `invalidateQueries()`(`GET /api/cart` 중복 호출)를 유발**하는 구조적 문제가 있었습니다.
- 또한 컴포넌트 인스턴스마다 `useMfeEvent`를 개별 등록하는 구조에서는 동일 `QueryClient`를 공유하는 위젯이 2개 이상 마운트될 때 외부 이벤트 1건당 `invalidateQueries`가 중복 실행되고 위젯 간 `receivedEventCount` 일관성 관리가 분산됩니다.
- 선행 PR #16(`shared/feat/event-bus-source-id`)에서 `remote_shared/utils`에 `createMfeEventSourceId(prefix)`와 `{ sourceId }` / `{ ignoreSourceId }` 자기 에코 자동 차단 기능이 도입되었으므로, 본 2차 리팩토링에서는 **`QueryClient` 단위 단일 리스너 동기화 채널(`cart-sync-channel.ts`)**을 도입하여 자기 에코 중복 네트워크 요청(`GET /api/cart`)과 관측 지표 오염을 원천 제거합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **발신자 식별(`sourceId`) 기반 자기 에코(Self-Echo) 차단**: `QueryClient` 인스턴스당 고유 `sourceId`(`createMfeEventSourceId('remote-cart')`) 1개를 발급하고, 발행 시 `{ sourceId }`, 구독 시 `{ ignoreSourceId }`를 결합해 `mfeEventBus` 경계에서 자기 이벤트를 단 1줄로 차단합니다.
- **동기화 소유 단위 = `QueryClient` + Ref-Counting 단일 리스너**: `Symbol.for` 전역 `WeakMap<QueryClient, CartSyncChannel>` 레지스트리와 사용자별 참조 카운팅(`users: Map<string, number>`) + 멱등 클린업(`disposed` 가드)으로 React 19 `<StrictMode>` 이중 마운트·다중 위젯 환경에서도 `QueryClient`당 리스너 최대 1개 불변식을 유지합니다.
- **`useSyncExternalStore` 기반 외부 스토어 구독**: 동일 `QueryClient` 및 동일 `userId` 위젯 간 `receivedEventCount`가 100% 일치하도록 동기화하며, `Mode B`에서는 이벤트 구독 자체(`enabled: false`)를 수행하지 않아 `Mode A` / `Mode B` 완전 격리를 달성합니다.
- **사용자 단위 쿼리 키 정렬 및 `emit` 선행(`try/catch` 격리) → `invalidateQueries` 1회**: 쿼리 키를 `['cart', userId, { apiBaseUrl, simulateDelay }]`로 정렬해 타 사용자 캐시를 건드리지 않고 정밀 무효화·취소하면서도 `Mode B`의 `['cart']` prefix 무효화와 100% 하위 호환을 유지합니다.

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서 1**: [Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)](../../../../docs/features/20261027-phase1-service-contracts/01-plan-and-design.md)
  - `§ 5.1.2 장바구니 REST API 계약 (GET / POST / DELETE /api/cart)`
  - `§ 5.2 MFE 커스텀 이벤트 버스 계약 (mfe:cart-updated)`
  - `§ 5.4.3 장바구니 원격 컴포넌트 (remote_cart/CartWidget) Props 및 비인증 차단 규약`
- **참조 정본 문서 2**: [Study 12. MFE Mode A 이벤트 자기 에코 차단과 QueryClient 단위 상태 동기화 아키텍처](../../../../docs/study/12-mfe-event-self-echo-and-queryclient-sync.md)
  - `§ 3. 최종 채택 아키텍처 (4대 원칙 & 2계층 구현 레퍼런스)`
  - `§ 4. 2차 PR (remote-cart) 8대 회귀 테스트 매트릭스 (3지표 분리 검증)`
- **참조 운영 정본**: [서비스 레지스트리 (`docs/service-registry.md`)](../../../../docs/service-registry.md)
  - `§ 4.2 remote_shared/utils 노출 시그니처 (createMfeEventSourceId, sourceId, ignoreSourceId)`
  - `§ 6. 장바구니 원격 앱 정본 (remote_cart)`

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `@tanstack/react-query` (`/tanstack/query`), `react` (`/websites/react_dev_reference`)
- **핵심 스펙 및 주의사항**:
  - **`TanStack Query v5` `Query Filters` 및 `invalidateQueries`**: `queryKey` 매칭은 기본값 `exact: false`(prefix 매칭)입니다. 따라서 쿼리 키를 `['cart', userId, { apiBaseUrl, simulateDelay }]` 구조로 정렬하면:
    - `invalidateQueries({ queryKey: ['cart', userId] })` 및 `cancelQueries({ queryKey: ['cart', userId] })`는 해당 사용자의 모든 옵션 조합 쿼리만 정밀하게 타깃팅하면서 타 사용자 캐시는 격리합니다.
    - 외부 앱(`remote-products`)이 `Mode B`에서 호출하는 `sharedQueryClient.invalidateQueries({ queryKey: ['cart'] })` 역시 prefix 매칭으로 100% 하위 호환됩니다.
  - **`TanStack Query v5` `cancelRefetch` 기본값 `true`**: `invalidateQueries`는 내부적으로 `refetchQueries`를 호출하며 `cancelRefetch` 기본값이 `true`입니다. 빠른 연속 뮤테이션(`[+1]` 직후 `[삭제]`)으로 진행 중이던 구버전 재조회가 있더라도 새 `invalidateQueries`가 이전 fetch를 취소하고 최신 재조회를 재시작해 최종 서버 상태와 일치시킵니다.
  - **`React 19` `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?)` 및 `<QueryClientProvider key>` 리마운트**:
    - `getSnapshot`은 불변 원시값(`number`: 사용자별 외부 이벤트 수신 횟수)을 반환해야 `Object.is` 비교 시 불필요한 리렌더링이나 무한 루프가 발생하지 않습니다.
    - `subscribe` 참조가 렌더마다 변경되면 React가 재구독을 반복하므로 `useCallback(..., [queryClient])`로 안정화합니다.
    - SSR/하이드레이션 호환성을 위해 세 번째 인자 `getServerSnapshot`으로 `() => 0`을 제공합니다.
    - `TanStack Query v5`의 `useBaseQuery`·`useMutation`은 내부 `Observer`를 `React.useState(() => new Observer(client, ...))`로 최초 마운트 시점의 `QueryClient`에 영구 바인딩하므로, 런타임 중 `Mode A ↔ Mode B` 전환으로 `QueryClient` 인스턴스가 교체될 때는 `<QueryClientProvider key={effectiveSyncMode} client={activeQueryClient}>`로 하위 트리를 리마운트하여 `QueryObserver` Split-Brain을 방지합니다([Study 12 § 3.5](../../../../docs/study/12-mfe-event-self-echo-and-queryclient-sync.md)).

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`

| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 (서비스 루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `src/features/cart/model/cart-sync-channel.ts` | `Symbol.for` `WeakMap<QueryClient, CartSyncChannel>` 레지스트리, `QueryClient`당 고유 `sourceId` + Ref-Counting 단일 리스너 + 멱등 클린업, `useSyncExternalStore` 기반 `useCartSyncChannel` 훅, `syncCartAfterMutation`(`emit` 선행 `try/catch` 격리 → `await invalidateQueries` 1회) 구현 |
| `NEW` | `src/features/cart/model/cart-sync-channel.test.ts` | `cart-sync-channel.ts` 단위 테스트 (`QueryClient`별 `sourceId` 격리, 동일 `QueryClient` 리스너 1개 불변식, Ref-Counting 부분 해제 및 완전 해제, 멱등 클린업, 외부 리스너 예외 격리, 중첩 동기 이벤트 처리 검증) |
| `MOD` | `src/exposed/CartWidget.tsx` | `<QueryClientProvider key={effectiveSyncMode} client={activeQueryClient}>` 적용 — `Mode A ↔ Mode B` 전환 시 `QueryObserver`가 이전 `QueryClient`에 고정되는 Split-Brain 차단 |
| `MOD` | `src/features/cart/model/use-cart-queries.ts` | 쿼리 키를 `['cart', validUserId, { apiBaseUrl, simulateDelay }]`로 정렬 (`buildCartQueryKey`, `buildCartUserQueryKey` 헬퍼 도입), `onMutate` `cancelQueries` 사용자 단위 정밀화, 내부 `syncCartAfterMutation`을 `cart-sync-channel.ts` 함수로 위임 |
| `MOD` | `src/features/cart/ui/CartWidgetView.tsx` | 기존 컴포넌트 로컬 `useState(0)` + `useMfeEvent` 직접 구독 제거 → `useCartSyncChannel(activeQueryClient, userId, syncMode === 'mode-a-event')`로 교체 (`Mode B` 구독 `0회` 격리) |
| `MOD` | `src/testing/stubs/remote-shared-utils.ts` | PR #15(폐기 `CSS_ISOLATION_CHANGED` 제거)·PR #16(`createMfeEventSourceId`, `MfeEventEmitOptions`/`MfeEventSubscribeOptions`/`MfeEventMeta`, `__mfeSourceId` 기반 자기 에코 필터링 및 `Zod strip`) 최신 `remote-shared/utils` 계약과 1:1 정합화 |
| `MOD` | `src/__tests__/CartWidget.integration.test.tsx` | 기존 `TC-05` 쿼리 키 정밀화 반영 + [Study 12 § 4](../../../../docs/study/12-mfe-event-self-echo-and-queryclient-sync.md) 8대 회귀 시나리오 및 3지표(`receivedEventCount` / `invalidateQueries` / 실제 `GET /api/cart`) 분리 검증 통합 테스트 추가 (`Mode A → Mode B` 전환 후 `[+1]`·`[장바구니 비우기]` 실제 `GET`·화면 갱신 포함) |
| `MOD` | `docs/study/12-mfe-event-self-echo-and-queryclient-sync.md` *(루트 학습 문서)* | `§ 3.5` `Mode A ↔ Mode B` 전환 시 `<QueryClientProvider>` `QueryObserver` Split-Brain 원인 및 `key={effectiveSyncMode}` 해결 아키텍처 보강 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`

```ts
/**
 * @description QueryClient 인스턴스당 1:1로 매핑되는 장바구니 Mode A 동기화 채널 내부 상태 인터페이스
 */
export interface CartSyncChannel {
  /** 이 QueryClient 인스턴스 전용 고유 발신자 ID (createMfeEventSourceId('remote-cart') 발급, 자기 에코 차단 키) */
  sourceId: string;

  /** 현재 이 QueryClient에서 구독 중인 userId별 활성 위젯 참조 수(Ref-Count) 맵 */
  users: Map<string, number>;

  /** 외부 이벤트 수신으로 실제 캐시 무효화가 발생한 userId별 누적 횟수 맵 */
  receivedCountByUser: Map<string, number>;

  /** QueryClient당 최대 1개만 유지되는 mfeEventBus.subscribe 해제 함수 */
  unsubscribe?: () => void;

  /** useSyncExternalStore 구독 컴포넌트에 스냅샷 변경을 알리는 리스너 집합 */
  listeners: Set<() => void>;
}

/**
 * @description 장바구니 쿼리 키 옵션 객체 인터페이스
 */
export interface CartQueryKeyOptions {
  /** 백엔드 API 기본 URL */
  apiBaseUrl: string;

  /** 1.5초 지연 시뮬레이션 활성화 여부 */
  simulateDelay: boolean;
}

/** 사용자 단위 장바구니 쿼리 키 튜플 타입 (invalidateQueries / cancelQueries prefix 타깃) */
export type CartUserQueryKey = readonly ['cart', string];

/** 장바구니 상세 조회 쿼리 키 튜플 타입 (['cart', userId, { apiBaseUrl, simulateDelay }]) */
export type CartDetailQueryKey = readonly ['cart', string | null, CartQueryKeyOptions];
```

### 주요 공개 함수 및 동작 계약 (`cart-sync-channel.ts`)
1. `buildCartUserQueryKey(userId: string): CartUserQueryKey`
   - `[...CART_QUERY_KEY, userId] as const` 반환.
2. `getCartSyncSourceId(queryClient: QueryClient): string`
   - `QueryClient`에 연결된 채널의 고유 `sourceId` 조회 (없으면 `createMfeEventSourceId('remote-cart')`로 채널 초기화).
3. `subscribeCartSync(queryClient: QueryClient, userId: string): () => void`
   - `channel.users`에서 `userId`의 참조 수를 `+1`.
   - `channel.unsubscribe`가 없으면 `mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, handler, { ignoreSourceId: channel.sourceId })`를 1회만 등록.
   - 수신 핸들러: `channel.users.get(payload.userId)`가 `> 0`인 경우에만 `receivedCountByUser` `+1` → `listeners` 전체 통지 → `void queryClient.invalidateQueries({ queryKey: buildCartUserQueryKey(payload.userId) })`.
   - 반환된 클린업 함수는 `disposed` 플래그로 멱등 보장. 참조 수 `-1`, `0`이면 `users.delete(userId)`, `users.size === 0`이면 `channel.unsubscribe()` 호출 후 `undefined` 초기화.
4. `getCartSyncReceivedCount(queryClient: QueryClient, userId: string | null): number`
   - `userId`가 `null`이거나 채널이 아직 없으면 `0` 반환(불필요한 채널 생성 없음).
5. `useCartSyncChannel(queryClient: QueryClient, userId: string | null, enabled: boolean): number`
   - `useEffect`에서 `enabled && userId`일 때만 `subscribeCartSync(queryClient, userId)` 실행 (`Mode B`에서는 구독 `0회`).
   - `useSyncExternalStore`로 현재 `queryClient` + `userId`의 `receivedCountByUser` 스냅샷 구독 반환 (`getServerSnapshot: () => 0`).
6. `syncCartAfterMutation(queryClient: QueryClient, syncMode: SyncMode, eventPayload: CartUpdatedEventPayload): Promise<void>`
   - `syncMode === 'mode-a-event'`일 때만 `try { mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, eventPayload, { sourceId: channel.sourceId }); } catch (error) { console.error(...); }` 선행 실행.
   - 이어서 `Mode A`/`Mode B` 공통으로 `await queryClient.invalidateQueries({ queryKey: buildCartUserQueryKey(eventPayload.userId) })`를 정확히 1회 수행.

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`shared`, `products`, `cart`, `host-*` 전용)

- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared`)**:
  - **노출 모듈 (`exposes`)**: 기존 `./CartWidget` (`./src/exposed/CartWidget.tsx`) 및 공개 Props 계약(`CartWidgetProps`) 100% 무변경 유지
  - **소비 모듈 (`remotes`)**: 기존 `remote_shared` (`http://localhost:3004/mf-manifest.json`) 유지, PR #16에서 추가된 `createMfeEventSourceId`와 `{ sourceId }` / `{ ignoreSourceId }` 옵션을 최신 `@mf-types`로 무-Shim 소비
  - **공유 의존성 (`shared` & `singleton`)**: 기존 6종(`react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client`, `@tanstack/react-query`) 무변경 유지
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**:
  - `App.tsx`의 단독 쇼케이스에서 `[샘플 상품 담기]` 및 `[원격 동기화 신호 테스트]` 버튼은 `CartWidget` 내부 `QueryClient`와 다른 외부 발신자(`sourceId` 미지정 또는 외부 발신)이므로, `Mode A`에서 `CartWidget`이 이를 정상 외부 이벤트로 인식(`receivedEventCount + 1` 및 재조회 1회)하는 반면, `CartWidget` 내부의 `[+1]`/`[삭제]`/`[전체 비우기]` 클릭은 자기 에코가 차단되어 `receivedEventCount` 변동 `0` 및 재조회 정확히 `1회`로 동작합니다.
- **마이크로 앱 간 통신 및 상태 공유 (`CustomEvent` / `sharedQueryClient`)**:
  - **Mode A (`mode-a-event`)**: `QueryClient`별 고유 `sourceId` + 단일 리스너 채널(`ignoreSourceId: channel.sourceId`)로 자기 에코 완전 차단, 타 `QueryClient`·타 리모트(`remote-products`) 이벤트만 수신하여 `receivedEventCount + 1` 및 `['cart', payload.userId]` 재조회
  - **Mode B (`mode-b-query`)**: `useCartSyncChannel(..., false)`로 `mfeEventBus.subscribe` 호출 `0회`, `syncCartAfterMutation`에서 `mfeEventBus.emit` 호출 `0회`, 오직 싱글톤 `sharedQueryClient.invalidateQueries({ queryKey: ['cart', userId] })` 1회만 수행 (`remote-products`의 `['cart']` prefix 무효화 100% 호환)
- **공통 UI 컴포넌트 (`Ark UI`) 및 스타일 격리 (CSS 변수 / 프리픽스)**:
  - 기존 `remote_shared/ui` 소비 및 `.cart-*` 스타일 격리 구조 무변경 유지 (`@ark-ui/react`, `clsx` 직접 설치 0%)

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)

- **적용 여부**: `N/A (해당 없음)` — 프론트엔드 원격 앱(`cart`) 리팩토링 작업으로 백엔드 및 SQLite DB 변경 없음.
