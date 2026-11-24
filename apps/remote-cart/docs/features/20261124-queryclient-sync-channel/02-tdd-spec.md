# 🧪 [TDD 명세서] `remote-cart` `Mode A` 자기 에코(Self-Echo) 제거 및 `QueryClient` 단위 동기화 채널 리팩토링 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 시드 데이터, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `Vitest`, `ErrorBoundary`, `Suspense`, `CustomEvent`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `cart` (`apps/remote-cart`) |
| **테스트 러너 및 모킹 도구** | `Vitest` (`jsdom`) + `@testing-library/react` + `@testing-library/user-event` + `MSW v2` |
| **단위 테스트 경로 (`Co-location`)** | `src/features/cart/model/cart-sync-channel.test.ts` |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/CartWidget.integration.test.tsx` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/remote-cart test` |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> [Study 12 § 4](../../../../docs/study/12-mfe-event-self-echo-and-queryclient-sync.md)의 **8대 회귀 테스트 매트릭스**를 기준으로 **`receivedEventCount`(화면 배지/스토어)**, **`invalidateQueries` 호출 횟수**, **MSW 실제 `GET /api/cart` 호출 횟수** 3가지 지표를 분리해 검증합니다.

### TC-01: 단일 위젯 자기 뮤테이션 (`Mode A`) — 자기 에코 차단 및 `GET /api/cart` 중복 제거 (매트릭스 #1)
- **사전 조건 (`Given`)**: `CartWidget`이 `userId="user-1"`, `syncMode="mode-a-event"`로 마운트되어 초기 `GET /api/cart` 1회가 완료된 상태
- **실행 동작 (`When`)**: 사용자가 위젯 내부의 `[+1]`(또는 `[삭제]`) 버튼을 클릭하여 쓰기 뮤테이션을 실행
- **기대 결과 (`Then`)**:
  - `mfeEventBus.emit`은 `MFE_EVENTS.CART_UPDATED` 페이로드와 `{ sourceId: 'remote-cart:...' }` 옵션으로 정확히 1회 호출됨
  - 자기 에코가 차단되어 화면의 외부 이벤트 수신 배지(`receivedEventCount`)는 **`0회` 유지**
  - 독립 `QueryClient.invalidateQueries`는 초기 조회 이후 `{ queryKey: ['cart', 'user-1'] }`로 **정확히 1회** 호출됨
  - MSW 실제 `GET /api/cart` 호출 횟수는 초기 1회 + 뮤테이션 후 재조회 **1회 = 총 2회**

### TC-02: 동일 `QueryClient` 공유 위젯 2개 (`Mode A`) — 리스너 1개 불변식 및 `receivedEventCount` 동기화 (매트릭스 #2)
- **사전 조건 (`Given`)**: 동일한 `QueryClient`를 공유하는 `CartWidgetView` 2개가 `userId="user-1"`, `syncMode="mode-a-event"`로 동시 마운트된 상태
- **실행 동작 (`When`)**: 외부 발신자(`sourceId` 미지정 또는 타 앱 `sourceId`)가 `MFE_EVENTS.CART_UPDATED` (`userId: 'user-1'`) 이벤트를 1회 발행
- **기대 결과 (`Then`)**:
  - 두 위젯의 `receivedEventCount` 배지가 **모두 `1회`로 일치** (`useSyncExternalStore` 동기화)
  - 공유 `QueryClient.invalidateQueries` 호출 횟수는 **정확히 1회** (`QueryClient`당 리스너 1개 불변식)
  - MSW 실제 `GET /api/cart` 호출 횟수는 초기 1회 + 외부 이벤트 재조회 **1회 = 총 2회**

### TC-03: 독립 `QueryClient` 위젯 2개 A·B (`Mode A`) — A의 자기 뮤테이션이 B에만 외부 이벤트로 전달 (매트릭스 #3)
- **사전 조건 (`Given`)**: 각자 독립 `QueryClient`를 소유한 `CartWidget` A와 B가 모두 `userId="user-1"`, `syncMode="mode-a-event"`로 마운트되어 초기 `GET /api/cart` 2회가 완료된 상태
- **실행 동작 (`When`)**: 위젯 A에서 `[+1]` 버튼을 클릭하여 수량을 증가시킴
- **기대 결과 (`Then`)**:
  - A의 `receivedEventCount`는 **`0회`**(자기 에코 차단), B의 `receivedEventCount`는 **`1회`**(외부 이벤트 정상 수신)
  - A의 `QueryClient`와 B의 `QueryClient` 각각 `invalidateQueries` **1회씩** 수행
  - MSW 실제 `GET /api/cart` 호출 횟수는 초기 2회 + A 재조회 1회 + B 재조회 1회 = **총 4회** (중복 5회 아님)

### TC-04: 같은 `userId` 위젯 2개 중 1개만 언마운트 — Ref-Counting 조기 해제 방지 및 완전 해제 (매트릭스 #4)
- **사전 조건 (`Given`)**: 동일 `QueryClient`를 공유하는 `user-1` 위젯 2개가 마운트된 상태 (또는 단위 테스트에서 `subscribeCartSync(qc, 'user-1')` 2회 등록)
- **실행 동작 (`When`)**:
  1. 1개만 언마운트(클린업 1회) 후 외부 `mfe:cart-updated` 이벤트 1회 발행
  2. 나머지 1개도 언마운트(클린업 2회) 후 외부 `mfe:cart-updated` 이벤트 1회 추가 발행
- **기대 결과 (`Then`)**:
  - 1개 해제 직후에는 남은 위젯이 정상 유지되어 `receivedEventCount` `+1회`, `invalidateQueries` `1회`, 실제 `GET` `+1회`
  - 2개 모두 해제된 뒤에는 `mfeEventBus` 리스너가 완전 제거되어 추가 이벤트에 `invalidateQueries` `0회`, 실제 `GET` `0회`

### TC-05: React 19 `<StrictMode>` 마운트/재마운트 — 좀비 리스너 0개 및 중복 카운트 차단 (매트릭스 #5)
- **사전 조건 (`Given`)**: `<React.StrictMode>` 내부에 `CartWidget` (`userId="user-1"`, `syncMode="mode-a-event"`)을 마운트 (React 19 개발 모드 이중 Effect 실행·클린업·재실행 발생)
- **실행 동작 (`When`)**: 초기 조회 완료 후 외부 `mfe:cart-updated` (`userId: 'user-1'`) 이벤트를 1회 발행
- **기대 결과 (`Then`)**:
  - `receivedEventCount`는 정확히 **`1회`** (2회 중복 증가 없음)
  - `invalidateQueries` 및 재조회 `GET /api/cart`는 각각 **1회** (좀비 리스너 `0개`)

### TC-06: 중첩 동기 이벤트 발행 — A 발행 도중 외부 리스너가 다른 `sourceId`로 동기 `emit` (매트릭스 #6)
- **사전 조건 (`Given`)**: `QueryClient` A가 `subscribeCartSync(qcA, 'user-1')`로 구독 중이며, 별도 외부 리스너가 A의 이벤트 수신 콜백 내부에서 즉시 다른 `sourceId`로 `mfe:cart-updated` (`userId: 'user-1'`) 이벤트를 동기 발행하도록 등록된 상태
- **실행 동작 (`When`)**: `syncCartAfterMutation(qcA, 'mode-a-event', payloadA)` 실행
- **기대 결과 (`Then`)**:
  - A 자신의 최초 이벤트(`sourceId: chA.sourceId`)는 자기 에코로 차단됨
  - 외부 리스너가 동기적으로 발행한 중첩 이벤트는 다른 `sourceId`이므로 A 채널에 정상 전달되어 `receivedEventCount`가 **`1회`** 증가하고 `invalidateQueries`가 정상 호출됨

### TC-07: 빠른 연속 뮤테이션 (`[+1]` 직후 `[삭제]` / 지연 응답 엇갈림) — 최종 서버 상태 일치 (매트릭스 #7)
- **사전 조건 (`Given`)**: `CartWidget` (`userId="user-1"`, `syncMode="mode-a-event"`) 마운트, 첫 번째 재조회 `GET /api/cart`는 지연 응답(구버전 상태)하고 두 번째 재조회 `GET /api/cart`는 즉시 최신 상태를 반환하도록 MSW 핸들러 구성
- **실행 동작 (`When`)**: `[+1]` 클릭 직후 연속으로 `[삭제]` 버튼을 클릭
- **기대 결과 (`Then`)**:
  - 두 뮤테이션 모두 자기 에코가 차단되어 `receivedEventCount`는 **`0회`** 유지
  - `cancelQueries({ queryKey: ['cart', 'user-1'] })` 및 `invalidateQueries`의 `cancelRefetch: true` 동작에 의해 구버전 지연 응답이 최신 화면을 덮어쓰지 않으며 최종 화면·캐시가 **서버 최종 상태와 일치**

### TC-08: `Mode A ↔ Mode B` 전환 — `Mode B` 완전 격리 및 `['cart']` prefix 하위 호환 (매트릭스 #8)
- **사전 조건 (`Given`)**: `CartWidget`이 `userId="user-1"`, `syncMode="mode-a-event"`로 마운트된 상태
- **실행 동작 (`When`)**:
  1. `syncMode="mode-b-query"`로 props 전환 후 외부 `mfe:cart-updated` 이벤트 발행
  2. `Mode B` 상태에서 위젯 내부 `[+1]` 클릭
  3. 외부 앱(`remote-products`)이 `sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })`(`['cart']`) 호출
- **기대 결과 (`Then`)**:
  - `Mode B` 전환 후 외부 `mfe:cart-updated` 이벤트 발행 시 `receivedEventCount` 증가 `0회`, `invalidateQueries` `0회`, 실제 `GET /api/cart` `0회`
  - `Mode B` 자기 뮤테이션 시 `sharedQueryClient.cancelQueries({ queryKey: ['cart', 'user-1'] })` 및 `sharedQueryClient.invalidateQueries({ queryKey: ['cart', 'user-1'] })` 1회 호출, `mfeEventBus.emit` 호출 `0회`
  - 외부 `sharedQueryClient.invalidateQueries({ queryKey: ['cart'] })` 호출 시 정렬된 쿼리 키(`['cart', 'user-1', { ... }]`)가 prefix 매칭으로 정상 자동 재조회됨

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`

### EC-01: `syncCartAfterMutation`에서 외부 이벤트 리스너가 예외를 던질 때 격리 보장
- **사전 조건 (`Given`)**: `mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, ...)`에 동기적으로 `Error`를 던지는 깨진 외부 리스너가 등록된 상태
- **실행 동작 (`When`)**: `syncCartAfterMutation(qc, 'mode-a-event', payload)` 실행
- **기대 결과 및 폴백 동작 (`Then`)**: `try/catch`가 외부 리스너 예외를 격리하고 `console.error`로 로깅한 뒤, 호출 측으로 예외를 전파하지 않고 로컬 `await qc.invalidateQueries({ queryKey: ['cart', payload.userId] })`를 정상 1회 완료함

### EC-02: 멱등 클린업(중복 해제 호출) 및 타 사용자(`user-2`) 이벤트 격리
- **사전 조건 (`Given`)**: 동일 `QueryClient`에 `user-1` 위젯 2개가 구독 중이고 `user-2`는 미구독 상태
- **실행 동작 (`When`)**: 첫 번째 위젯의 해제 함수를 2번 연속 호출한 뒤, `user-2` 대상 이벤트 1회와 `user-1` 대상 이벤트 1회를 발행
- **기대 결과 및 폴백 동작 (`Then`)**:
  - 첫 번째 해제 함수의 2번째 호출은 멱등 가드로 무시되어 두 번째 `user-1` 위젯의 참조 수가 훼손되지 않음
  - `user-2` 이벤트는 `users` 맵에 없으므로 `receivedCountByUser` 변동 `0`, `invalidateQueries` `0회`
  - `user-1` 이벤트만 정상 처리되어 `user-1`의 `receivedCountByUser` `+1` 및 `['cart', 'user-1']` 무효화 `1회`

### EC-03: 비인증(`userId: null`) 상태에서 구독 미등록 및 `getCartSyncReceivedCount` 안전 반환
- **사전 조건 (`Given`)**: `CartWidget`이 `userId={null}`, `syncMode="mode-a-event"`로 마운트된 상태
- **실행 동작 (`When`)**: `mfe:cart-updated` 이벤트 발행 및 `getCartSyncReceivedCount(qc, null)` 조회
- **기대 결과 및 폴백 동작 (`Then`)**: `GET /api/cart` 호출 `0회`, `mfeEventBus` 구독 `0회`, 수신 카운트 `0` 반환

### EC-04: `remote-shared-utils` 스텁의 `sourceId` / `ignoreSourceId` 및 폐기 이벤트 방어 정합성
- **사전 조건 (`Given`)**: 로컬 테스트 스텁 `src/testing/stubs/remote-shared-utils.ts`
- **실행 동작 (`When`)**: `createMfeEventSourceId('remote-cart')` 발급, 빈/공백 prefix 호출, 동일 `sourceId` 자기 에코 발행 및 타 `sourceId` 발행, `MFE_EVENTS` 키 목록 검사
- **기대 결과 및 폴백 동작 (`Then`)**:
  - `remote-shared` 정본과 동일하게 공백 prefix 시 에러 발생, 자기 에코 차단, 외부 이벤트 시 `Zod strip`된 순수 페이로드와 선택적 `meta` 전달, 폐기된 `CSS_ISOLATION_CHANGED` 미존재 보장

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**:
  - `vitest.config.ts` alias로 `remote_shared/utils`를 `src/testing/stubs/remote-shared-utils.ts`에 매핑
  - 스텁의 `mfeEventBus`, `useMfeEvent`, `createMfeEventSourceId`를 `apps/remote-shared/src/features/utils/model/event-bus.ts`의 최신 계약(`__mfeSourceId` 예약 메타 키 + `Zod strip` + `{ sourceId }` / `{ ignoreSourceId }`)과 1:1 정합화
- **네트워크 / API 모킹 (`src/testing/msw/`)**:
  - `MSW v2` `server.use(http.get('http://localhost:4000/api/cart', ...))` 카운터 래퍼로 실제 네트워크 `GET /api/cart` 호출 횟수를 정확히 계측 (지연 응답 시나리오 포함)
- **테스트 픽스처 (시드 / 더미 데이터)**:
  - 기존 `INITIAL_MOCK_CART_ITEMS` (`user-1` 상품 1번 1개·5번 2개, `user-2` 빈 장바구니) 및 `seedExtraMockCartItem` 재사용, `afterEach`에서 `resetMockCartFixtures()`·`sharedQueryClient.clear()` 자동 초기화

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`shared`, `products`, `cart`, `host-*` 전용)

- **적용 여부**: `적용`
- [ ] **단독 실행(Standalone) 렌더링 검증**: `App.tsx`의 `[샘플 상품 담기]` 및 `[원격 동기화 신호 테스트]`가 리팩토링 후에도 정상 동작하는가?
- [ ] **리모트 장애 격리 검증**: `syncCartAfterMutation` 외부 이벤트 리스너 예외가 `try/catch`로 격리되어 로컬 장바구니 갱신에 영향을 주지 않는가?
- [ ] **이벤트 버스 및 쿼리 캐시 연동**: 8대 회귀 시나리오(3지표: `receivedEventCount` / `invalidateQueries` / 실제 `GET /api/cart`)와 `Mode A ↔ Mode B` 전환이 100% 통과하는가?
- [ ] **무-Shim 원격 타입 및 아키텍처 무결성**: 최신 `remote-shared` `@mf-types` 동기화 상태에서 `tsc --noEmit` 및 `rsbuild build`가 임시 Shim 없이 통과하는가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)

- **적용 여부**: `N/A (해당 없음)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [ ] 모든 단위 테스트(`cart-sync-channel.test.ts` 포함) 및 통합 테스트(`CartWidget.integration.test.tsx`)가 통과(`Green`)했는가?
- [ ] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 등)을 준수했는가?
- [ ] `Biome` 포맷팅 및 린트 검사(`LF` 줄바꿈 포함)를 통과했는가?
- [ ] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`, `apps/remote-cart/docs/todo.md`, `docs/service-registry.md`를 최신 상태로 업데이트했는가?
