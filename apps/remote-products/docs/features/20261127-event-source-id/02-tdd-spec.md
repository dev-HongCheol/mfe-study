# 🧪 [TDD 명세서] `remote-products` 이벤트 발신자 식별(`sourceId`) 적용 및 이종 번들러·캐시 정합화 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 시드 데이터, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `Vitest`, `CustomEvent`, `TanStack Query`, `@mf-types` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `products` (`apps/remote-products`, `Port 3002`) |
| **테스트 러너 및 모킹 도구** | `Vitest` + `@testing-library/react` + `@testing-library/user-event` + `MSW` |
| **단위 테스트 경로 (`Co-location`)** | `src/features/catalog/model/*.test.ts`, `src/features/catalog/ui/*.test.tsx` (기존 유지) |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/ProductList.integration.test.tsx` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/remote-products test` |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 작성 전 먼저 실패하는 테스트(`Red`)로 구현할 목록입니다.

### TC-01: `Mode A` 장바구니 담기 시 `remote-products:` 접두사의 고유 `sourceId`가 `mfeEventBus.emit` 옵션 및 수신 `meta.sourceId`로 정확히 전파된다
- **사전 조건 (`Given`)**: `ProductList`가 `userId="user-1"`, `hostType="vite"`, `syncMode="mode-a-event"`로 마운트되어 있고, 외부 관찰자 리스너가 `mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, (payload, meta) => ...)`로 구독 중이다.
- **실행 동작 (`When`)**: 첫 번째 상품 카드의 `[장바구니 담기]` 버튼을 클릭한다.
- **기대 결과 (`Then`)**:
  - `mfeEventBus.emit`이 3번째 인자 `{ sourceId: expect.stringMatching(/^remote-products:.+/) }`와 함께 1회 호출된다.
  - 외부 구독 핸들러에 순수 도메인 페이로드(`__mfeSourceId` 미포함)와 두 번째 인자 `meta.sourceId`가 동일한 `remote-products:<uuid>` 값으로 전달된다.
  - `sharedQueryClient.invalidateQueries`는 호출되지 않는다.

### TC-02: 동일 `ProductList` 인스턴스에서 리렌더 또는 연속 장바구니 담기 시 동일한 `sourceId`를 일관 유지하고, 서로 다른 인스턴스는 고유 `sourceId`를 발급받는다
- **사전 조건 (`Given`)**: 첫 번째 `ProductList` 인스턴스가 `Mode A`로 마운트되어 있다.
- **실행 동작 (`When`)**: `hostType` prop 변경 등 리렌더를 거친 뒤 두 번 연속으로 상품을 장바구니에 담고, 이후 새로 언마운트·재마운트한 별도 `ProductList` 인스턴스에서 상품을 한 번 더 담는다.
- **기대 결과 (`Then`)**:
  - 동일 인스턴스에서 발행된 두 이벤트의 `meta.sourceId`는 서로 정확히 일치한다.
  - 재마운트된 새 인스턴스에서 발행된 이벤트의 `meta.sourceId` 역시 `^remote-products:` 형식이며 첫 번째 인스턴스와 다른 고유 값이다.

### TC-03: 단독 실행 쇼케이스(`App.tsx`) 실시간 이벤트 로그에 발신자 `sourceId`가 함께 표시된다
- **사전 조건 (`Given`)**: `ThemeProvider`로 감싼 `App`이 마운트되고, 사용자 선택 드롭다운에서 `user-1`을 선택해 로그인 상태(`Mode A`)로 전환한다.
- **실행 동작 (`When`)**: 첫 번째 상품의 `[장바구니 담기]` 버튼을 클릭한 뒤 실시간 이벤트 수신 로그 패널을 확인한다.
- **기대 결과 (`Then`)**:
  - 이벤트 로그 항목에 상품 정보와 함께 `source=remote-products:`로 시작하는 발신자 식별자가 화면에 표시된다.

### TC-04: `vite.config.ts`에 React 서브패스 3종을 포함한 6종 싱글톤이 명시되고, 로컬 스텁이 표준 4대 이벤트 계약과 정합한다
- **사전 조건 (`Given`)**: `apps/remote-products/vite.config.ts` 및 `src/testing/stubs/remote-shared-utils.ts` 정적 검증 대상이 존재한다.
- **실행 동작 (`When`)**: 아키텍처 무결성 정적 검증 테스트를 실행한다.
- **기대 결과 (`Then`)**:
  - `vite.config.ts`의 `shared`에 `'react'`, `'react/jsx-runtime'`, `'react/jsx-dev-runtime'`, `'react-dom'`, `'react-dom/client'`, `'@tanstack/react-query'` 6종이 모두 선언되어 있다.
  - `MFE_EVENTS` 스텁에 폐기된 `CSS_ISOLATION_CHANGED`가 존재하지 않고 표준 4종만 존재하며, `createMfeEventSourceId`가 정상 내보내진다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`

### EC-01: `ProductList`가 `Mode A → Mode B → Mode A`로 왕복 전환되어 `QueryClientProvider`가 리마운트되어도 동일 인스턴스의 `sourceId`가 일관 유지된다
- **사전 조건 (`Given`)**: `ProductList`가 `userId="user-1"`, `syncMode="mode-a-event"`로 마운트되어 있다.
- **실행 동작 (`When`)**: `Mode A`에서 1회 담기를 수행한 뒤 `syncMode="mode-b-query"` → `syncMode="mode-a-event"`로 왕복 `rerender` 후 1회 더 담기를 수행한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  - `QueryClientProvider` 리마운트와 무관하게 `ProductList`의 `productsSourceIdRef`가 보존되어, 왕복 전환 전후 발행된 이벤트의 `meta.sourceId`가 동일한 `remote-products:<uuid>` 값으로 일치한다.

### EC-02: `Mode B`에서는 `mfeEventBus.emit`이 0회 유지되며, `Mode A ↔ Mode B` 전환 시에도 상품 조회·장바구니 동기화가 정상 동작한다
- **사전 조건 (`Given`)**: `ProductList`가 `userId="user-1"`, `syncMode="mode-a-event"`로 마운트된 상태에서 상품을 조회한다.
- **실행 동작 (`When`)**: `syncMode="mode-b-query"`로 props를 전환(`rerender`)하고 `[장바구니 담기]` 버튼을 클릭한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  - `<QueryClientProvider key={effectiveSyncMode}>` 리마운트 후에도 상품 목록이 정상 표시되고, 담기 실행 시 `sharedQueryClient.cancelQueries` + `invalidateQueries({ queryKey: ['cart'] })`만 호출되며 `mfeEventBus.emit`은 0회로 유지된다.

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**:
  - `vitest.config.ts` alias로 `remote_shared/utils`를 `src/testing/stubs/remote-shared-utils.ts`에 매핑합니다.
  - 본 작업에서 스텁을 `remote-shared/utils` 정본(`PR #15`, `PR #16`)과 1:1 동일 구현(`__mfeSourceId` 예약 메타 키 + `Zod strip` + `createMfeEventSourceId` + 표준 4종 `MFE_EVENTS`)으로 동기화합니다.
- **네트워크 / API 모킹 (`src/testing/msw/`)**:
  - 기존 `src/testing/msw/handlers.ts`의 `GET /api/products`, `POST /api/cart` 핸들러를 그대로 재사용합니다.
- **테스트 픽스처**:
  - 기존 상품 시드(`기계식 무선 키보드 Pro` 등 6종) 및 사용자(`user-1`, `user-2`) 픽스처를 유지합니다.

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`products` 전용)
- **적용 여부**: `적용`
- [x] **단독 실행(Standalone) 렌더링 검증**: `App.tsx` 마운트 시 로그인 전환 → 담기 → 실시간 이벤트 로그에 `source=remote-products:` 표시가 정상 동작하는가?
- [x] **리모트 장애 격리 검증**: 기존 `CatalogErrorBanner` 및 `OUT_OF_STOCK` / `500` 에러 복구 테스트가 회귀 없이 통과하는가?
- [x] **이벤트 버스 및 쿼리 캐시 연동**: `Mode A`(`sourceId` 첨부 + `meta.sourceId` 수신)와 `Mode B`(`sharedQueryClient` 무효화 · 이벤트 0회) 대칭 전환이 정상 동작하는가?
- [x] **무-Shim `@mf-types` 및 빌드 검증**: `remote-shared(3004)` 최신 `@mf-types` 기준 `tsc --noEmit` 및 `vite build`가 경고·에러 없이 통과하는가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
- **적용 여부**: `N/A (해당 없음 — 프론트엔드 도메인 원격 앱 스코프)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [x] 모든 단위 및 통합 테스트(`Vitest`)와 전체 워크스페이스 테스트(`pnpm test`)가 통과(`Green`)했는가?
- [x] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 등)을 준수했는가?
- [x] `Biome` 포맷팅 및 린트 검사(`LF` 줄바꿈 포함)를 통과했는가?
- [ ] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`, `apps/remote-products/docs/todo.md`, `docs/service-registry.md`를 최신 상태로 업데이트했는가?
