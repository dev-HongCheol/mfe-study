# 🧪 [TDD 명세서] `remote-shared/utils` 이벤트 버스 발신자 식별(`sourceId`) 및 자기 에코(Self-Echo) 자동 필터링 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `Vitest`, `CustomEvent`, `Zod`, `@mf-types` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `shared` (`apps/remote-shared`, `Port 3004`) |
| **테스트 러너 및 모킹 도구** | `Vitest` (`jsdom` 환경) + `@testing-library/react` + `@testing-library/jest-dom` |
| **단위 테스트 경로 (`Co-location`)** | `src/features/utils/model/event-bus.test.ts`, `src/features/utils/model/UseMfeEvent.test.tsx` |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/SharedShowcase.integration.test.tsx` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/remote-shared test` (루트 전체: `pnpm test`) |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 작성 전 먼저 실패하는 테스트(`Red`)로 구현할 목록입니다.

### TC-01: `mfeEventBus` `sourceId` 발신 및 `ignoreSourceId` 자기 에코 차단 (`event-bus.test.ts`)
- **사전 조건 (`Given`)**:
  - 구독자 A는 `{ ignoreSourceId: 'remote-cart:client-a' }`로 `MFE_EVENTS.CART_UPDATED`를 구독 중이다.
  - 구독자 B는 `{ ignoreSourceId: 'remote-cart:client-b' }`로 구독 중이며, 관찰자 C(`MfeInspector` 역할)는 `ignoreSourceId` 없이 구독 중이다.
- **실행 동작 (`When`)**:
  - `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload, { sourceId: 'remote-cart:client-a' })`를 호출한다.
- **기대 결과 (`Then`)**:
  1. 자기 자신인 **구독자 A는 0회 호출**(자기 에코 차단)된다.
  2. 다른 클라이언트인 **구독자 B와 관찰자 C는 각각 1회 호출**된다.
  3. 구독자 B와 관찰자 C에 전달된 첫 번째 인자(`payload`)에는 예약 메타 키(`__mfeSourceId`)가 포함되지 않은 **순수 도메인 페이로드**만 전달되며, 두 번째 인자(`meta`)로 `{ sourceId: 'remote-cart:client-a' }`가 전달된다.

### TC-02: `useMfeEvent`의 `{ ignoreSourceId }` 자기 에코 차단 및 옵션 변경 시 리스너 무재등록 (`UseMfeEvent.test.tsx`)
- **사전 조건 (`Given`)**:
  - `EventListenerHarness` 컴포넌트가 `useMfeEvent(MFE_EVENTS.CART_UPDATED, onEvent, { ignoreSourceId })`를 사용하고 `window.addEventListener`를 스파이한다.
- **실행 동작 (`When`)**:
  1. `ignoreSourceId="remote-cart:alpha"`로 마운트한 상태에서 `sourceId: 'remote-cart:alpha'`(자기 에코)와 `sourceId: 'remote-products:beta'`(외부 이벤트)를 각각 발행한다.
  2. `rerender`로 `ignoreSourceId="remote-cart:gamma"`로 변경한 뒤 `sourceId: 'remote-cart:alpha'`와 `sourceId: 'remote-cart:gamma'`를 각각 발행한다.
- **기대 결과 (`Then`)**:
  1. 초기 렌더에서 자기 에코(`alpha`)는 무시되고 외부 이벤트(`beta`)만 `onEvent(payload, { sourceId: 'remote-products:beta' })`로 1회 호출된다.
  2. `ignoreSourceId`가 `gamma`로 바뀐 뒤에는 `window.addEventListener` 추가 재등록 없이(최초 1회 유지) `alpha`는 수신되고 `gamma`는 차단된다.

### TC-03: `createMfeEventSourceId` 필수 `prefix` 검증·고유 ID 생성 및 `exposed/utils` 공개 심볼 검증 (`event-bus.test.ts`)
- **사전 조건 (`Given`)**: `src/exposed/utils.ts`에서 `createMfeEventSourceId`가 노출된 상태
- **실행 동작 (`When`)**:
  1. `createMfeEventSourceId('remote-cart')`를 연속 2회 호출한다.
  2. `createMfeEventSourceId('  host-vite  ')`(공백 포함 프리픽스)와 빈/공백 문자열(`''`, `'   '`)을 각각 호출한다.
- **기대 결과 (`Then`)**:
  1. 연속 호출된 두 ID는 모두 `'remote-cart:'`로 시작하며 서로 달라야(고유성) 한다.
  2. 앞뒤 공백이 있는 프리픽스는 trim되어 `'host-vite:'`로 시작하고, 빈 문자열·공백 프리픽스는 명시적 `Error`를 던져야 한다.
  3. `exposed/utils.ts` 모듈에서 `createMfeEventSourceId`가 함수로 재노출되어 있어야 한다.

### TC-04: `dist/@mf-types` 산출물 내 신규 공개 타입 포함 및 `@ark-ui/react` 무누출 검증 (`SharedShowcase.integration.test.tsx`)
- **사전 조건 (`Given`)**: 4단계 `vite build` 실행 후 `dist/@mf-types/`에 `.d.ts` 파일들이 생성된 상태
- **실행 동작 (`When`)**: `dist/@mf-types/**/*.d.ts` 전체 파일을 검사한다.
- **기대 결과 (`Then`)**:
  1. `@ark-ui/react` 참조 `0건` 및 폐기 심볼 `0건`이 유지된다.
  2. 신규 공개 심볼(`createMfeEventSourceId`, `MfeEventEmitOptions`, `MfeEventSubscribeOptions`, `MfeEventMeta`)이 원격 타입 선언 파일에 정상 생성되어 있어야 한다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`

### EC-01: 기존 2인자 `emit` / 외부 평문 `CustomEvent` 하위 호환성 (`event-bus.test.ts`)
- **사전 조건 (`Given`)**: 구독자 A는 `{ ignoreSourceId: 'remote-cart:client-a' }`로 구독 중이고, 구독자 B는 옵션 없이 구독 중이다.
- **실행 동작 (`When`)**:
  1. `sourceId` 없이 기존 2인자 `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload)`를 호출한다.
  2. 외부 스크립트가 평문 `window.dispatchEvent(new CustomEvent(MFE_EVENTS.CART_UPDATED, { detail: payload }))`를 직접 발송한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. `sourceId`가 없는 이벤트는 자기 에코로 오인되지 않고 구독자 A와 B 모두 정상 수신한다.
  2. 두 구독자 모두 `handler(payload)` 정확히 **1개 인자**로 호출되어 기존 테스트·소비자 계약이 100% 보존된다.

### EC-02: 공백 문자열 `sourceId` / `ignoreSourceId` 및 잘못된 타입의 `__mfeSourceId` 방어 (`event-bus.test.ts`)
- **사전 조건 (`Given`)**: 구독자가 `{ ignoreSourceId: '   ' }`(공백 문자열)로 구독 중이다.
- **실행 동작 (`When`)**:
  1. `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload, { sourceId: '   ' })`를 호출한다.
  2. 외부에서 `detail: { ...payload, __mfeSourceId: 12345 }`처럼 문자열이 아닌 비정상 메타 값을 포함한 `CustomEvent`를 직접 발송한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. 공백 `sourceId`와 공백 `ignoreSourceId`는 `undefined`로 정규화되어 오차단 없이 정상 수신된다(인자 1개 `handler(payload)` 호출).
  2. 비정상 타입(`number`)의 `__mfeSourceId`도 크래시 없이 무시(`undefined` 취급)되고 Zod `strip`을 거쳐 순수 도메인 `payload`만 핸들러에 안전하게 전달된다.

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**: `N/A` (`remote-shared`는 최하위 공통 공급자)
- **네트워크 / 브라우저 API 모킹 (`src/testing/setup.ts`)**: `jsdom`의 실제 `window.dispatchEvent` / `window.addEventListener`와 `vi.spyOn(window, 'addEventListener')`를 사용해 동기 브로드캐스트, 자기 에코 필터링, 무재등록 불변식을 실제 DOM 이벤트 경로로 검증합니다.

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`shared` 전용)
- **적용 여부**: `적용`
- [x] **단독 실행(Standalone) 렌더링 검증**: `App.tsx` / `bootstrap.tsx` 단독 쇼케이스 렌더링 및 테마·이벤트 버스 동작이 정상 유지되는가?
- [x] **이벤트 버스 및 자기 에코 차단 검증**: `mfeEventBus` / `useMfeEvent`의 `{ sourceId }` / `{ ignoreSourceId }` 차단 및 기존 2인자 호출 하위 호환성이 100% 통과하는가?
- [x] **원격 타입 산출물 검증**: `vite build`로 재생성된 `dist/@mf-types/**/*.d.ts`에 신규 공개 심볼이 정상 노출되고 `@ark-ui/react` 참조가 `0건`인가?
- [x] **워크스페이스 전체 회귀 검증**: `remote-shared`, `remote-products`, `remote-cart`, `api-server`, `root-harness` 전체 테스트가 단 1건의 깨짐 없이 통과하는가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
- **적용 여부**: `N/A (해당 없음)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [x] 모든 단위 및 통합 테스트(`Vitest`, 단독 + 루트 전체)가 통과(`Green`)했는가?
- [x] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 등)을 준수했는가?
- [x] `Biome` 포맷팅·린트 검사(`LF` 줄바꿈 포함), `tsc --noEmit`, `vite build` (`dist/@mf-types.zip` 재생성)를 통과했는가?
- [x] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`, `apps/remote-shared/docs/todo.md`, 그리고 [`docs/service-registry.md`](../../../../../docs/service-registry.md)를 최신 상태로 업데이트했는가?
