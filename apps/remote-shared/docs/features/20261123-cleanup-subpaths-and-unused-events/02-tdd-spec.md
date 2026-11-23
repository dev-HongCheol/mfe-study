# 🧪 [TDD 명세서] `remote-shared` React 서브패스 3종 명시 공유 통일 및 미사용 이벤트 계약 정리 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `Vitest`, `CustomEvent`, `Zod`, `@mf-types` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `shared` (`apps/remote-shared`, `Port 3004`) |
| **테스트 러너 및 모킹 도구** | `Vitest` (`jsdom` 환경) + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` |
| **단위 테스트 경로 (`Co-location`)** | `src/features/utils/model/event-bus.test.ts` |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/SharedShowcase.integration.test.tsx` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/remote-shared test` (루트 전체: `pnpm test`) |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 수정 전 먼저 실패하는 테스트(`Red`)로 작성할 목록입니다.

### TC-01: 표준 이벤트 계약 4종 정합성 및 `CSS_ISOLATION_CHANGED` 미포함 검증 (`event-bus.test.ts`)
- **사전 조건 (`Given`)**: `src/features/utils/model/contracts.ts` 및 `src/exposed/utils.ts`에서 `MFE_EVENTS`와 `MFE_EVENT_SCHEMAS`가 노출된 상태
- **실행 동작 (`When`)**:
  1. `Object.keys(MFE_EVENTS)`와 `Object.values(MFE_EVENTS)`를 조회한다.
  2. `Object.keys(MFE_EVENT_SCHEMAS)`를 조회해 `MFE_EVENTS` 값 집합과 비교한다.
  3. `exposed/utils.ts` 모듈 네임스페이스 객체에서 `cssIsolationChangedEventSchema` 속성의 존재 여부를 확인한다.
- **기대 결과 (`Then`)**:
  1. `MFE_EVENTS`는 정확히 4개 키(`CART_UPDATED`, `AUTH_CHANGED`, `THEME_CHANGED`, `SYNC_MODE_CHANGED`)와 4개 값(`mfe:cart-updated`, `mfe:auth-changed`, `mfe:theme-changed`, `mfe:sync-mode-changed`)만 포함해야 한다.
  2. `'CSS_ISOLATION_CHANGED'` 키 및 `'mfe:css-isolation-changed'` 값은 `MFE_EVENTS`와 `MFE_EVENT_SCHEMAS`에 포함되지 않아야 한다.
  3. `exposed/utils.ts`의 공개 export에 `cssIsolationChangedEventSchema`가 존재하지 않아야 한다.

### TC-02: `vite.config.ts` React 서브패스 3종 명시 공유 정적 회귀 검증 (`SharedShowcase.integration.test.tsx`)
- **사전 조건 (`Given`)**: `apps/remote-shared/vite.config.ts` 설정 파일이 존재하는 상태
- **실행 동작 (`When`)**:
  1. `vite.config.ts` 소스를 읽어 `federation({ shared: ... })` 블록 내 React 관련 공유 엔트리를 검사한다.
- **기대 결과 (`Then`)**:
  1. `'react/jsx-runtime'`, `'react/jsx-dev-runtime'`, `'react-dom/client'` 3개 서브패스 키가 모두 명시되어 있어야 한다.
  2. 각 서브패스 엔트리가 `singleton: true`와 `requiredVersion: '^19.1.0'`을 함께 선언하고 있어 `remote-cart` (`rsbuild.config.ts`)의 공유 규약과 1:1로 일치해야 한다.

### TC-03: `dist/@mf-types` 산출물 내 `@ark-ui/react` 무누출 및 폐기 이벤트 심볼 `0건` 검증 (`SharedShowcase.integration.test.tsx`)
- **사전 조건 (`Given`)**: `vite build` 실행 후 `apps/remote-shared/dist/@mf-types/` 디렉터리에 `.d.ts` 선언 파일들이 생성된 상태
- **실행 동작 (`When`)**:
  1. `dist/@mf-types/**/*.d.ts` 전체 파일을 재귀 수집해 본문을 검사한다.
- **기대 결과 (`Then`)**:
  1. 기존 규칙대로 `@ark-ui/react` 참조가 `0건`이어야 한다.
  2. 폐기된 심볼(`CSS_ISOLATION_CHANGED`, `CssIsolationChangedEventPayload`, `cssIsolationChangedEventSchema`, `mfe:css-isolation-changed`)이 모든 `.d.ts` 파일에서 `0건`이어야 한다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`
> 구버전 리모트나 외부 스크립트가 제거된 이벤트 이름으로 접근하는 비정상 런타임 상황을 검증합니다.

### EC-01: 폐기·미등록 이벤트 이름으로 런타임 `emit` / `subscribe` 호출 시 크래시 차단 (`event-bus.test.ts`)
- **사전 조건 (`Given`)**: `CSS_ISOLATION_CHANGED`가 `MFE_EVENTS` 및 `MFE_EVENT_SCHEMAS`에서 제거된 상태
- **실행 동작 (`When`)**:
  1. 구버전 리모트 동작을 시뮬레이션해 `'mfe:css-isolation-changed'` 문자열을 타입 캐스팅(`as never`)으로 `mfeEventBus.emit(...)`에 전달한다.
  2. 동일한 폐기 이벤트 이름으로 `mfeEventBus.subscribe(...)`를 호출한 뒤 반환된 해제 함수를 실행한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. `TypeError`(`Cannot read properties of undefined (reading 'safeParse')`) 등 예외가 발생하지 않아야 한다.
  2. `emit`은 경고 로그(`console.warn`)를 남기고 안전하게 `false`를 반환해야 한다.
  3. `subscribe`는 경고 로그를 남기고 안전한 빈 해제 함수(`() => {}`)를 반환하며, 해제 함수 호출 시에도 예외가 발생하지 않아야 한다.

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**: `N/A` (`remote-shared`는 최하위 공통 공급자)
- **네트워크 / 브라우저 API 모킹 (`src/testing/setup.ts`)**: 기존 `jsdom` 환경과 `vi.spyOn(console, 'warn')`을 사용하여 경고 로그 출력과 예외 미발생을 검증합니다.
- **정적 파일 시스템 검증**: `SharedShowcase.integration.test.tsx`에서 `node:fs`와 `node:path`로 `vite.config.ts`와 빌드 산출물 `dist/@mf-types/**/*.d.ts`의 정적 계약 무결성을 직접 검증합니다.

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`shared` 전용)
- **적용 여부**: `적용`
- [x] **단독 실행(Standalone) 렌더링 검증**: 변경 후에도 `App.tsx` / `bootstrap.tsx` 단독 쇼케이스 렌더링 및 테마·이벤트 버스 동작이 정상 유지되는가?
- [x] **React 서브패스 3종 명시 공유 검증**: `vite.config.ts`의 `shared`에 `'react/jsx-runtime'`, `'react/jsx-dev-runtime'`, `'react-dom/client'`가 `singleton: true`, `requiredVersion: '^19.1.0'`으로 선언되어 `vite build`가 정상 완료되는가?
- [x] **이벤트 버스 및 원격 타입 산출물 검증**: 표준 이벤트 4종 발행/구독 및 미등록 이벤트 방어 가드가 통과하고, 재생성된 `dist/@mf-types.zip` / `dist/@mf-types/**/*.d.ts`에 `@ark-ui/react` 누출 및 폐기 이벤트 심볼이 모두 `0건`인가?
- [x] **접근성(A11y) 및 기존 18개 테스트 회귀 검증**: 기존 `remote-shared` 전체 테스트(`35건`) 및 루트 전체 테스트(`124건`+)가 모두 회귀 없이 통과하는가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
- **적용 여부**: `N/A (해당 없음)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [x] 모든 단위 및 통합 테스트(`Vitest`, 단독 + 루트 전체)가 통과(`Green`)했는가?
- [x] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 및 변경 주석 동기화)을 준수했는가?
- [x] `Biome` 포맷팅·린트 검사(`LF` 줄바꿈 포함), `tsc --noEmit`, `vite build` (`dist/@mf-types.zip` 재생성 및 무누출 확인)를 통과했는가?
- [ ] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`, `apps/remote-shared/docs/todo.md`, 그리고 [`docs/service-registry.md`](../../../../../docs/service-registry.md)를 최신 상태로 업데이트했는가?
