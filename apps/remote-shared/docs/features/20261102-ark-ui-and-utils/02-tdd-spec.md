# 🧪 [TDD 명세서] 원격 공통 디자인 시스템(`Ark UI`), 실시간 테마 및 MFE 유틸리티 구축 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 시드 데이터, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `Vitest`, `ErrorBoundary`, `Suspense`, `CustomEvent`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `shared` (`apps/remote-shared`, `Port 3004`) |
| **테스트 러너 및 모킹 도구** | `Vitest` (`jsdom` 환경) + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` + `MSW` (`msw/node`) |
| **단위 테스트 경로 (`Co-location`)** | `src/features/utils/{model,api}/*.test.ts`, `src/features/utils/model/UseMfeEvent.test.tsx`, `src/features/theme/ui/ThemeProvider.test.tsx`, `src/features/ui/components/{Button,Heading,Select,Skeleton,Badge}.test.tsx`, `src/features/ui/layouts/{Splitter,Tabs,Collapsible,StaticLayouts}.test.tsx` |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/SharedShowcase.integration.test.tsx` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/remote-shared test` (루트 통합: `pnpm test`) |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 작성 전 먼저 실패하는 테스트(`Red`)로 구현할 목록입니다.

### TC-01: `mfeEventBus` 커스텀 이벤트 발행·구독 및 `useMfeEvent` 언마운트 자동 해제 검증 (`event-bus.test.ts`, `UseMfeEvent.test.tsx`)
- **사전 조건 (`Given`)**: `useMfeEvent(MFE_EVENTS.CART_UPDATED, handler)`를 구독 중인 테스트용 리액트 컴포넌트가 마운트된 상태
- **실행 동작 (`When`)**:
  1. `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, validPayload)`로 유효한 장바구니 변경 이벤트를 1회 발행한다.
  2. 해당 컴포넌트를 언마운트(`unmount()`)한 뒤 동일한 이벤트를 1회 더 발행한다.
- **기대 결과 (`Then`)**:
  1. 마운트 상태에서는 `handler`가 검증된 페이로드와 함께 정확히 1회 호출되어야 한다.
  2. 언마운트 직후 `window.removeEventListener`가 자동 호출되어 두 번째 이벤트 발행 시에는 `handler`가 절대 추가 호출되지 않아야 한다 ([Study 04 #09](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md)).

### TC-02: `createScopedStorage` 네임스페이스(`mfe:<scopeId>:<key>`) 격리 저장 및 스코프별 선택 삭제 검증 (`storage.test.ts`)
- **사전 조건 (`Given`)**: `createScopedStorage('shared')`와 `createScopedStorage('cart')` 두 개의 독립 스토리지 래퍼가 생성된 상태
- **실행 동작 (`When`)**:
  1. 두 스토리지에 각각 동일한 로컬 키 이름(`'preferences'`)으로 값을 저장(`setItem`)한다.
  2. `sharedStorage.clearScope()`를 실행하여 `'shared'` 스코프 데이터만 초기화한다.
- **기대 결과 (`Then`)**:
  1. 실제 `window.localStorage`에는 `'mfe:shared:preferences'`와 `'mfe:cart:preferences'`로 분리 저장되어 서로 덮어쓰지 않아야 한다 ([Study 04 #10](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md)).
  2. `sharedStorage.clearScope()` 실행 후 `'mfe:shared:*'` 키들은 모두 삭제되지만, 타 서비스인 `'mfe:cart:preferences'` 데이터는 손상 없이 보존되어야 한다.

### TC-03: 원화 정수 포맷터(`formatCurrency`) 및 한국어 날짜·상대 시간 포맷터(`formatDate`, `formatRelativeTime`) 검증 (`formatters.test.ts`)
- **사전 조건 (`Given`)**: 원화 금액(`129000`, `0`) 및 기준 시각 대비 2분 전 `ISO-8601` 날짜 문자열이 주어진 상태
- **실행 동작 (`When`)**: `formatCurrency`, `formatDate`, `formatRelativeTime` 함수를 각각 호출한다.
- **기대 결과 (`Then`)**:
  1. `formatCurrency(129000)`은 `"129,000원"`을 반환해야 한다.
  2. `formatDate`는 한국어 표준 날짜 문자열을 반환하고, `formatRelativeTime`은 `date-fns` `ko` 로케일 기반 한국어 상대 시간(예: `"2분 전"`)을 반환해야 한다.

### TC-04: `httpClient` 표준 `ApiResponse<T>` 언래핑·`AbortSignal` 연동 및 싱글톤 `sharedQueryClient` 검증 (`http-client.test.ts`, `query-client.test.ts`)
- **사전 조건 (`Given`)**: `MSW` 서버가 `GET http://localhost:4000/api/health` 요청에 대해 `{ success: true, data: { status: 'ok', dbMode: 'wal', foreignKeys: true } }` 표준 봉투를 반환하도록 설정된 상태
- **실행 동작 (`When`)**:
  1. `httpClient`와 `unwrapApiResponse`로 `/health`를 호출한다.
  2. `AbortController`로 즉시 취소(`abort()`)된 `signal`을 전달하여 요청을 호출한다.
  3. `exposed/utils.ts`에서 `sharedQueryClient`를 조회해 싱글톤 참조 동일성과 `CART_QUERY_KEY` 값을 확인한다.
- **기대 결과 (`Then`)**:
  1. 정상 응답 시 바깥 봉투가 벗겨진 내부 도메인 데이터가 반환되어야 한다.
  2. 취소된 `signal` 전달 시 요청이 즉시 중단되어야 한다 ([Study 05 #01](../../../../../docs/study/05-fullstack-service-real-world-issues.md)).
  3. `sharedQueryClient`는 항상 동일한 메모리 참조를 유지하는 싱글톤 `QueryClient` 인스턴스여야 하며, `CART_QUERY_KEY`는 `['cart']`와 일치해야 한다.

### TC-05: `ThemeProvider` & `useTheme()` 실시간 4종 테마 전환, CSS 변수 주입 및 이벤트 동기화 검증 (`ThemeProvider.test.tsx`)
- **사전 조건 (`Given`)**: `<ThemeProvider>` 내부에 현재 테마를 표시하고 변경하는 테스트 소비자 컴포넌트가 마운트된 상태
- **실행 동작 (`When`)**:
  1. 초기 렌더링 상태에서 `theme` 값과 `document.documentElement`의 `data-mfe-theme` 속성 및 `--mfe-z-dropdown` 토큰을 확인한다.
  2. `setTheme('dark')`를 호출하여 다크 모드로 전환한다.
  3. 외부 마이크로 앱이 `mfeEventBus.emit(MFE_EVENTS.THEME_CHANGED, { theme: 'emerald', timestamp: ... })` 이벤트를 발행한 상황을 시뮬레이션한다.
- **기대 결과 (`Then`)**:
  1. 기본 테마(`'indigo'`)와 `Z_INDEX_TOKENS`(`dropdown: 200` 등)가 루트 엘리먼트에 정상 주입되어야 한다.
  2. `setTheme('dark')` 호출 시 컨텍스트 상태, `document.documentElement.dataset.mfeTheme === 'dark'`, 스코프 스토리지(`mfe:shared:theme`), `mfe:theme-changed` 커스텀 이벤트 발행이 일제히 동기화되어야 한다.
  3. 외부에서 `mfe:theme-changed`(`'emerald'`) 이벤트가 수신되면 `ThemeProvider` 상태도 즉시 `'emerald'`로 자동 전환되어야 한다.

### TC-06: 개별 분리된 기본 UI 5종(`Button.tsx`, `Heading.tsx`, `Select.tsx`, `Skeleton.tsx`, `Badge.tsx`) 동작 및 `Ark UI` 원본 속성 투과 검증 (`Button.test.tsx` 외 4종)
- **사전 조건 (`Given`)**: `src/features/ui/components/` 아래에 개별 파일로 분리된 5종 컴포넌트가 렌더링된 상태
- **실행 동작 (`When`)**:
  1. `<Button isLoading onClick={spy}>담기</Button>` 클릭 및 `asChild` 합성 속성을 검증한다.
  2. `<Heading level={3}>섹션 제목</Heading>`과 `<Badge tone="brand">3004</Badge>`를 렌더링한다.
  3. `<Select ariaLabel="사용자 선택" options={[...]} value="user-1" onChange={onSelect} />` 트리거를 클릭하여 포털 목록을 열고 `'user-2'` 항목을 클릭한다.
  4. `<Skeleton variant="card" count={3} />`을 렌더링한다.
- **기대 결과 (`Then`)**:
  1. `isLoading`이 `true`인 `Button`은 `disabled`와 `aria-busy="true"`가 자동 설정되어 클릭해도 `spy`가 호출되지 않아야 하며, `HTMLArkProps<'button'>` 기본 속성이 정상 투과되어야 한다.
  2. `Heading`은 시맨틱 `<h3>` 태그로 렌더링되고, `Badge`는 해당 톤 클래스를 포함해야 한다.
  3. `Select`는 `ArkSelect.RootProps`를 상속해 동작하며 옵션 클릭 시 단일 문자열 `'user-2'`로 `onChange`를 호출해야 한다.
  4. `Skeleton`은 `count={3}`만큼 3개의 카드형 스켈레톤 블록과 `aria-hidden="true"`를 렌더링해야 한다.

### TC-07: 개별 분리된 레이아웃 8종(`Splitter.tsx`, `Tabs.tsx`, `Collapsible.tsx`, `Container.tsx`, `Grid.tsx`, `Flex.tsx`, `Stack.tsx`, `Card.tsx`) 및 `clsx` 재노출 검증 (`Splitter.test.tsx`, `Tabs.test.tsx`, `Collapsible.test.tsx`, `StaticLayouts.test.tsx`)
- **사전 조건 (`Given`)**: `src/exposed/ui.ts`를 통해 레이아웃 컴포넌트 8종과 `clsx`를 임포트한 상태
- **실행 동작 (`When`)**:
  1. 정적 레이아웃 5종(`Container > Stack > Grid > Card > Flex`)을 합성해 렌더링하고 `clsx('a', false && 'b', 'c')`를 실행한다.
  2. `<Tabs lazyMount items={[...]} onChange={onTabChange} />`에서 두 번째 탭을 클릭한다.
  3. `<Collapsible title="상세 보기" onOpenChange={onOpen}>숨김 본문</Collapsible>` 트리거를 클릭하고, `<Splitter panels={[...]} />`의 두 패널 및 리사이즈 핸들 렌더링을 확인한다.
- **기대 결과 (`Then`)**:
  1. 정적 레이아웃 5종이 `HTMLArkProps<'div'>` 속성을 투과하며 정상 렌더링되고 `clsx`가 `'a c'`를 반환해야 한다.
  2. `Tabs`는 `ArkTabs.RootProps`(`lazyMount` 등)를 그대로 지원하며 탭 클릭 시 패널 전환과 `onTabChange('tab2')`가 호출되어야 한다.
  3. `Collapsible` 트리거 클릭 시 본문이 펼쳐지며 `onOpen(true)`가 호출되고, `Splitter`의 두 패널과 리사이즈 트리거가 정상 렌더링되어야 한다.

### TC-08: 3계층 단방향 의존성(`utils -> theme -> ui`) 및 컴포넌트 파일 `PascalCase.tsx` 규칙 + 단독 쇼케이스(`App.tsx`) 통합 검증 (`SharedShowcase.integration.test.tsx`)
- **사전 조건 (`Given`)**: `apps/remote-shared/src/` 전체 소스 파일과 단독 실행 `<App />` 컴포넌트가 준비된 상태
- **실행 동작 (`When`)**:
  1. `utils` 계층이 `theme`·`ui`를 역참조하지 않고 `theme` 계층이 `ui`를 역참조하지 않는지, 그리고 `features/ui/` 및 `features/theme/ui/` 내 모든 `.tsx` 파일명이 대문자(`PascalCase`)로 시작하는지 정적 검사한다.
  2. `<ThemeProvider><App /></ThemeProvider>` 단독 실행 화면을 마운트하고 테마 전환 및 탭 조작을 수행한다.
- **기대 결과 (`Then`)**:
  1. 역방향 의존성이 `0건`이고 모든 UI 컴포넌트 `.tsx` 파일이 `1 컴포넌트 = 1 파일` 대문자 네이밍 규칙을 통과해야 한다.
  2. 단독 실행 쇼케이스 화면에서 디자인 시스템 카탈로그, 실시간 테마 전환, 유틸리티 데모가 에러 없이 동작해야 한다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`

### EC-01: 오염된 `CustomEvent` 페이로드 발행·수신 시 `Zod` 런타임 스키마 차단 및 크래시 방어 (`event-bus.test.ts`)
- **사전 조건 (`Given`)**: `mfe:cart-updated`를 구독 중인 핸들러가 있는 상태에서 필수 필드가 누락된 오염된 `CustomEvent`가 `window`에 디스패치된 상황
- **실행 동작 (`When`)**: `window.dispatchEvent(new CustomEvent('mfe:cart-updated', { detail: { broken: true } }))`를 실행한다.
- **기대 결과 및 폴백 동작 (`Then`)**: `Zod` `safeParse`가 오염된 페이로드를 차단하여 구독 핸들러가 잘못된 데이터로 실행되거나 크래시되지 않아야 한다.

### EC-02: `localStorage` JSON 파싱 손상 또는 스키마 불일치 시 안전한 `fallback` 복구 (`storage.test.ts`)
- **사전 조건 (`Given`)**: `'mfe:shared:theme'` 키에 깨진 JSON(`"{invalid"`) 또는 미지원 값(`"neon-pink"`)이 저장된 상태
- **실행 동작 (`When`)**: `sharedStorage.getItem('theme', themeModeSchema, 'indigo')`를 호출한다.
- **기대 결과 및 폴백 동작 (`Then`)**: 예외 발생 없이 기본값 `'indigo'`를 안전하게 반환해야 한다.

### EC-03: 비표준 예외(`throw "문자열"`, `null`) 및 백엔드 에러 봉투(`{ success: false, error }`) 정규화 검증 (`error.test.ts`, `http-client.test.ts`)
- **사전 조건 (`Given`)**: 문자열 예외, `null`, 그리고 HTTP `400` `{ success: false, error: { code: 'OUT_OF_STOCK', message: '재고가 부족합니다.' } }` 응답이 발생한 상황
- **실행 동작 (`When`)**: `normalizeError` 및 `httpClient` 에러 처리기를 통과시킨다.
- **기대 결과 및 폴백 동작 (`Then`)**: 항상 `{ message, code, originalError }` 규격의 `NormalizedError`로 변환되며 백엔드 에러 봉투의 `code`와 `message`가 보존되어야 한다.

### EC-04: 부동소수점 오차 금액 및 잘못된 날짜 문자열 입력 시 포맷터 방어 검증 (`formatters.test.ts`)
- **사전 조건 (`Given`)**: `19999.999999` 금액과 `"not-a-date"` 날짜 문자열이 입력된 상황
- **실행 동작 (`When`)**: `formatCurrency`, `formatDate`, `formatRelativeTime`을 호출한다.
- **기대 결과 및 폴백 동작 (`Then`)**: 금액은 정수 반올림된 `"20,000원"`을, 잘못된 날짜는 예외 없이 `"-"` 폴백 문자열을 반환해야 한다.

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**: `N/A` (최하위 공급자 모듈 — 타 원격 모듈 미소비)
- **네트워크 / API 모킹 (`MSW`) 및 브라우저 API 보완 (`src/testing/setup.ts`)**:
  - `msw/node`로 `http://localhost:4000/api/*` 요청을 가로채며, `src/testing/setup.ts`에 `ResizeObserver` 및 `Element.prototype.scrollTo` 스텁을 등록합니다.
- **테스트 픽스처**: 루트 SSOT 계약(`§ 5.1`, `§ 5.2`) 규격의 샘플 이벤트 페이로드 및 4종 테마 옵션을 사용합니다.

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`shared` 전용)
- **적용 여부**: `적용`
- [ ] **단독 실행(Standalone) 렌더링 검증**: `App.tsx` / `bootstrap.tsx` 마운트 시 쇼케이스와 실시간 테마 전환이 정상 동작하는가?
- [ ] **3계층 단방향 의존성 및 `PascalCase.tsx` 분리 검증**: `./utils` → `./theme` → `./ui` 역참조가 0건이고 모든 컴포넌트가 개별 대문자 `.tsx` 파일로 분리되었는가?
- [ ] **`Ark UI` 원본 `Props` 기본 상속 검증**: 13종 컴포넌트가 `Ark*.RootProps` 또는 `HTMLArkProps<*>`의 표준 속성을 투과 지원하는가?
- [ ] **이벤트 버스·쿼리 캐시 및 접근성 검증**: `mfeEventBus`, `useMfeEvent`, `sharedQueryClient` 및 `aria-busy` / `role` 속성이 정상 동작하는가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
- **적용 여부**: `N/A (해당 없음)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [ ] 모든 단위 및 통합 테스트(`Vitest`)가 통과(`Green`)했는가?
- [ ] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 등)을 준수했는가?
- [ ] `Biome` 포맷팅 및 린트 검사(`LF` 줄바꿈 포함)를 통과했는가?
- [ ] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`, `apps/remote-shared/docs/todo.md`, 그리고 [`docs/service-registry.md`](../../../../../docs/service-registry.md)(타 서비스 노출·소비 규칙 포함)를 최신 상태로 업데이트했는가?
