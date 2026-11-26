# 🧪 [TDD 명세서] `host-vite` 공통 껍데기 호스트 대시보드 · 장애 격리 · `MfeInspector` 구축 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 시드 데이터, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `Vitest`, `ErrorBoundary`, `Suspense`, `CustomEvent`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `host-vite` (`apps/host-vite`) |
| **테스트 러너 및 모킹 도구** | `Vitest` (`jsdom`) + `@testing-library/react` + `@testing-library/user-event` + `MSW v2` |
| **단위 테스트 경로 (`Co-location`)** | `src/features/auth/api/auth-api.test.ts`, `src/features/dashboard/model/host-preferences.test.ts`, `src/features/dashboard/ui/RemoteErrorBoundary.test.tsx`, `src/features/dashboard/ui/HostHeader.test.tsx`, `src/features/inspector/model/use-mfe-event-log.test.ts`, `src/features/inspector/ui/MfeInspector.test.tsx` |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/HostDashboard.integration.test.tsx` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/host-vite test` |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 작성 전 먼저 실패하는 테스트(`Red`)로 구현할 목록입니다.

### TC-01: 호스트 초기 렌더링 및 2대 도메인 리모트(`ProductList`, `CartWidget`) 지연 로딩 결합
- **사전 조건 (`Given`)**: `GET /api/users`가 시드 사용자(`user-1`, `user-2`)를 반환하고 저장된 인증 세션이 없는 초기 상태
- **실행 동작 (`When`)**: `ThemeProvider` 내부에 `host-vite` `App`을 마운트
- **기대 결과 (`Then`)**:
  - 상단 헤더에 `Vite Host` 및 `Port 3000` 식별 배지가 표시됨
  - `React.lazy` 로딩 완료 후 좌측 `ProductList`와 우측 `CartWidget`이 모두 렌더링되며, 두 리모트에 `hostType="vite"`, `userId={null}`(비로그인 기본값), `syncMode="mode-a-event"`, `simulateDelay={false}`가 정확히 전달됨

### TC-02: 사용자 로그인·전환 및 비로그인(게스트) 전환 시 인증 API · 스토리지 · 이벤트 전파
- **사전 조건 (`Given`)**: `App`이 비로그인(`userId: null`) 상태로 마운트되고 `GET /api/users`가 완료된 상태
- **실행 동작 (`When`)**:
  1. 헤더 사용자 선택에서 `홍길동 (VIP)`(`user-1`)을 선택
  2. 이어서 `이순신 (일반)`(`user-2`)으로 전환
  3. 마지막으로 `게스트 (비로그인)`을 선택
- **기대 결과 (`Then`)**:
  - `user-1` 선택 시 `POST /api/auth/login`이 `{ userId: 'user-1' }`로 호출되고, `mfe:host-vite:auth-session` 스토리지에 세션이 저장되며, `mfe:auth-changed` 이벤트(`sourceId: 'host-vite:...'`)가 발행되고 `ProductList`와 `CartWidget`의 `userId`가 모두 `'user-1'`로 갱신됨
  - `user-2` 전환 시 두 리모트의 `userId`가 `'user-2'`로 동시 변경됨
  - `게스트 (비로그인)` 선택 시 스토리지 세션이 삭제되고 두 리모트의 `userId`가 `null`로 복귀함

### TC-03: 실시간 4종 테마 전환 및 1.5초 로딩 지연 시뮬레이션 토글 연동
- **사전 조건 (`Given`)**: `App`이 기본 테마(`indigo`), `simulateDelay: false`로 마운트된 상태
- **실행 동작 (`When`)**:
  1. 헤더 테마 선택을 `dark`로 변경
  2. `1.5초 지연 시뮬레이션` 토글 버튼을 클릭
- **기대 결과 (`Then`)**:
  - `document.documentElement.dataset.mfeTheme`가 `'dark'`로 갱신되고 `mfe:theme-changed` 이벤트가 `MfeInspector` 로그에 기록됨
  - `ProductList`와 `CartWidget` 모두 `simulateDelay={true}`를 전달받으며 `mfe:host-vite:preferences` 스토리지에 상태가 저장됨

### TC-04: `MfeInspector` `Mode A` ↔ `Mode B` 실시간 전환 및 `sharedQueryClient` 캐시 관찰
- **사전 조건 (`Given`)**: `App`이 `Mode A ('mode-a-event')`로 마운트된 상태
- **실행 동작 (`When`)**:
  1. `MfeInspector`에서 상태 동기화 모드를 `Mode B ('mode-b-query')`로 전환
  2. `sharedQueryClient.setQueryData(['cart', 'user-1'], [{ id: 1 }])`로 캐시 데이터를 기록
- **기대 결과 (`Then`)**:
  - `ProductList`와 `CartWidget`에 `syncMode="mode-b-query"`가 전달되고, `mfe:sync-mode-changed` 이벤트가 `host-vite` `sourceId`와 함께 발행되어 이벤트 로그에 기록됨
  - `MfeInspector`의 런타임·캐시 상태 탭에서 `sharedQueryClient`의 `["cart","user-1"]` 캐시 엔트리와 상태(`success`)가 실시간으로 표시됨

### TC-05: `MfeInspector` 표준 4대 이벤트 실시간 스트림 기록 · `sourceId` 표시 · 로그 비우기 및 언마운트 정리
- **사전 조건 (`Given`)**: `useMfeEventLog` 훅 또는 `MfeInspector`가 마운트된 상태
- **실행 동작 (`When`)**: 외부 발신자(`sourceId: 'remote-products:test-1'`)가 `mfe:cart-updated` 이벤트를 발행한 뒤 `[로그 비우기]` 버튼을 클릭하고 컴포넌트를 언마운트
- **기대 결과 (`Then`)**:
  - 이벤트 로그에 `mfe:cart-updated`, 발신자 `remote-products:test-1`, 상품명 요약이 최신순으로 추가됨
  - `[로그 비우기]` 클릭 시 로그가 `0건`으로 초기화됨
  - 언마운트 이후 발행되는 이벤트에는 리스너가 호출되지 않아 좀비 리스너 `0개`를 보장함

### TC-06: 리모트 장애 격리(`RemoteErrorBoundary`) 및 `[다시 시도]` 리마운트 복구
- **사전 조건 (`Given`)**: `CartWidget`만 의도적으로 런타임 에러(또는 원격 로드 실패)를 발생시키도록 설정하고, `ProductList`는 정상 동작하는 상태
- **실행 동작 (`When`)**:
  1. `App`을 마운트해 장바구니 영역의 장애 발생을 확인
  2. 장바구니 장애 원인을 해소한 뒤 장바구니 폴백 UI 내부의 `[다시 시도]` 버튼을 클릭
- **기대 결과 (`Then`)**:
  - 장바구니 영역만 `RemoteErrorBoundary` 폴백 UI(에러 메시지 + `[다시 시도]` 버튼)로 대체되고, 좌측 `ProductList`와 상단 `HostHeader`·`MfeInspector`는 오류 없이 정상 렌더링 상태를 유지함
  - `[다시 시도]` 클릭 시 `CartWidget` 슬롯만 리마운트되어 정상 장바구니 화면으로 복구됨

### TC-07: 정적 아키텍처·무-Shim·이종 번들러 설정·스타일 격리 회귀 검증
- **사전 조건 (`Given`)**: `apps/host-vite/package.json`, `vite.config.ts`, `src/vite-env.d.ts`, `src/features/dashboard/ui/host-dashboard.css`
- **실행 동작 (`When`)**: 정적 파일 내용을 읽어 아키텍처 불변식을 검사
- **기대 결과 (`Then`)**:
  - `package.json`에 `@ark-ui/react`, `clsx` 직접 의존성이 `0건`임
  - `src/vite-env.d.ts`에 `@ark-ui/react` 임시 모듈 선언(`declare module`)이 `0건`임
  - `vite.config.ts`에 `remote_shared`/`remote_products`(`type: 'module'`), `remote_cart`(`type: 'var'`), React 서브패스 3종 포함 6종 `shared` 싱글톤, `dev.disableDynamicRemoteTypeHints: true`가 정확히 선언되어 있음
  - `host-dashboard.css`에 전역 태그 선택자 및 `#hex` 색상 하드코딩이 `0건`임

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`

### EC-01: `POST /api/auth/login` 실패(404/500) 시 기존 세션 보호 및 에러 배너 표시
- **사전 조건 (`Given`)**: `POST /api/auth/login`이 HTTP `404 NOT_FOUND` 또는 `500`을 반환하도록 MSW 핸들러 오버라이드
- **실행 동작 (`When`)**: 사용자가 헤더에서 로그인을 시도
- **기대 결과 및 폴백 동작 (`Then`)**: 앱이 크래시되지 않고 `normalizeError`로 정규화된 한글 안내 배지가 표시되며, 잘못된 세션이 스토리지에 저장되지 않음

### EC-02: 오염된 `localStorage` JSON 복원 시 크래시 없이 기본값으로 안전 폴백
- **사전 조건 (`Given`)**: `localStorage`의 `mfe:host-vite:preferences` 및 `mfe:host-vite:auth-session`에 손상된 JSON 또는 스키마 위반 값(`{ syncMode: 'invalid' }`)이 들어있는 상태
- **실행 동작 (`When`)**: `loadHostPreferences()` 및 `App` 초기화 실행
- **기대 결과 및 폴백 동작 (`Then`)**: 예외를 던지지 않고 기본 설정(`mode-a-event`, `simulateDelay: false`)과 비로그인(`userId: null`) 상태로 안전 복구됨

### EC-03: `Suspense` 지연 로딩 중 `Skeleton` 폴백 표시
- **사전 조건 (`Given`)**: `RemoteWidgetSlot`에 아직 resolve되지 않은 지연 Promise 기반 컴포넌트를 전달
- **실행 동작 (`When`)**: 슬롯 렌더링
- **기대 결과 및 폴백 동작 (`Then`)**: 로딩 완료 전까지 지정된 리모트 로딩 안내와 `Skeleton` 폴백 UI가 표시되고, resolve 후 실제 컴포넌트가 렌더링됨

### EC-04: `RemoteErrorBoundary` 자체 독립성 (`remote_shared/ui` 미의존) 검증
- **사전 조건 (`Given`)**: `src/features/dashboard/ui/RemoteErrorBoundary.tsx` 소스 코드
- **실행 동작 (`When`)**: 파일 import 문 정적 검사 및 에러 렌더링 실행
- **기대 결과 및 폴백 동작 (`Then`)**: `remote_shared/ui`를 import하지 않아 공통 UI 서버 장애 시에도 폴백 UI가 안전하게 렌더링됨

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**:
  - `vitest.config.ts` alias로 `remote_shared/{ui,theme,utils}`, `remote_products/ProductList`, `remote_cart/CartWidget`를 로컬 스텁으로 매핑
  - `remote-products.tsx` / `remote-cart.tsx` 스텁은 호스트가 전달한 `Props`(`userId`, `hostType`, `syncMode`, `simulateDelay`)를 화면 `data-*` 속성 및 텍스트로 노출하고, 테스트에서 플래그로 런타임 에러를 주입할 수 있는 제어 헬퍼를 제공
  - `remote-shared-utils.ts` 스텁은 PR #15·#16 최신 계약(`sourceId` / `ignoreSourceId`, 표준 4대 이벤트, `createScopedStorage`, `sharedQueryClient`)과 1:1 정합화
- **네트워크 / API 모킹 (`src/testing/msw/`)**:
  - `MSW v2`로 `GET http://localhost:4000/api/users` 및 `POST http://localhost:4000/api/auth/login`을 표준 `ApiResponse<T>` 엔벨로프로 모킹
- **테스트 픽스처 (시드 / 더미 데이터)**:
  - `user-1` (`홍길동 (VIP)`, `admin`, `token-user-1`), `user-2` (`이순신 (일반)`, `member`, `token-user-2`) 시드 제공, `afterEach`에서 `localStorage`, `sharedQueryClient`, 리모트 에러 주입 플래그 초기화

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`host-vite` 전용)

- **적용 여부**: `적용`
- [ ] **호스트 부트스트랩 및 3대 리모트 결합 검증**: `main.ts` 선행 프리로드와 `ProductList(:3002)` + `CartWidget(:3003)` 동시 결합이 정상 동작하는가?
- [ ] **리모트 장애 격리 검증**: 한쪽 리모트 오류 시 `RemoteErrorBoundary`가 해당 영역만 격리하고 `[다시 시도]`로 복구되며 다른 리모트는 정상 유지되는가?
- [ ] **이벤트 버스 및 쿼리 캐시 연동**: `MfeInspector`의 `Mode A ↔ Mode B` 전환, 4대 이벤트 스트림, `sharedQueryClient` 캐시 스냅샷이 정상 동작하는가?
- [ ] **무-Shim 원격 타입 및 이종 번들러 빌드 검증**: `remote-shared`, `remote-products`, `remote-cart` `@mf-types` 소비 상태에서 `tsc --noEmit` 및 `vite build`가 임시 Shim 없이 통과하는가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)

- **적용 여부**: `N/A (해당 없음)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [ ] 모든 단위 및 통합 테스트(`Vitest`)가 통과(`Green`)했는가?
- [ ] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 등)을 준수했는가?
- [ ] `Biome` 포맷팅 및 린트 검사(`LF` 줄바꿈 포함)를 통과했는가?
- [ ] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`, `apps/host-vite/docs/todo.md`, `docs/service-registry.md`를 최신 상태로 업데이트했는가?
