# 🧪 [TDD 명세서] `remote-products` `@ark-ui/react/*` 임시 타입 Shim 제거 및 무-Shim `@mf-types` 소비 검증 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `Vitest`, `Ark UI`, `ComponentPropsWithoutRef`, `@mf-types`, `Shim` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `products` (`apps/remote-products`, `Port 3002`) |
| **테스트 러너 및 모킹 도구** | `Vitest` (`jsdom` + `node:fs` 정적 검사) + `@testing-library/react` + `@testing-library/user-event` + `MSW` |
| **단위 테스트 경로 (`Co-location`)** | `src/features/catalog/{api,model,ui}/*.test.ts(x)` (기존 6개 파일 회귀 검증) |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/ProductList.integration.test.tsx` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/remote-products test` (루트 통합: `pnpm test`) |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 수정 전 먼저 실패하는 테스트(`Red`)로 구현할 목록입니다.

### TC-01: `src/vite-env.d.ts` 무-Shim 정적 회귀 차단 검증 (`ProductList.integration.test.tsx`)
- **사전 조건 (`Given`)**: `apps/remote-products/src/vite-env.d.ts` 파일이 존재하는 상태
- **실행 동작 (`When`)**:
  1. `ProductList.integration.test.tsx`의 정적 아키텍처 무결성 테스트에서 `src/vite-env.d.ts` 파일 본문을 읽는다.
  2. Vite 표준 환경 지시어 존재 여부와 `@ark-ui/react/*` 앰비언트 모듈 선언(`declare module`) 및 `HTMLArkProps` 잔존 여부를 검사한다.
- **기대 결과 (`Then`)**:
  1. `/// <reference types="vite/client" />` 지시어가 포함되어 있어야 한다.
  2. `declare module '@ark-ui/react` / `declare module "@ark-ui/react` 선언과 `HTMLArkProps` 참조가 **`0건`**이어야 한다. *(3단계에서는 기존 10~89행 임시 Shim이 아직 존재하므로 의도된 `Red` 실패를 확인)*

### TC-02: 최신 `remote-shared` `@mf-types.zip` 재수신 및 무-Shim `typecheck` · `vite build` 실증 (4단계 빌드·타입 게이트)
- **사전 조건 (`Given`)**:
  1. 최신 `remote-shared`(PR #10 경계 캡슐화 반영본)가 `Port 3004`에서 `mf-manifest.json` 및 `@mf-types.zip`을 서빙 중인 상태
  2. `apps/remote-products/src/vite-env.d.ts`에서 임시 Shim(10~89행)이 제거된 상태
- **실행 동작 (`When`)**:
  1. 기존 구버전 로컬 캐시 `apps/remote-products/@mf-types/`를 비운 뒤 `pnpm --filter @mfe-study/remote-products build`를 실행해 최신 `@mf-types.zip`을 수신한다.
  2. 이어서 `pnpm --filter @mfe-study/remote-products typecheck`를 실행한다.
- **기대 결과 (`Then`)**:
  1. 갱신된 `apps/remote-products/@mf-types/**/*.d.ts` 전 파일에서 `@ark-ui/react` 참조가 **`0건`**이어야 한다.
  2. 임시 Shim `0줄` 상태에서 `tsc --noEmit -p tsconfig.json` 및 `vite build`가 타입·빌드 에러 `0건`으로 통과해야 한다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`

### EC-01: 로컬 `@mf-types/` 캐시 내 `@ark-ui/react` 전이 누출 잔존 감지 및 클린 환경 안전 분기 (`ProductList.integration.test.tsx`)
- **사전 조건 (`Given`)**: 개발 환경에서 `apps/remote-products/@mf-types/` 디렉터리가 존재하거나(로컬 개발) 아직 생성되지 않은 상태(클린 체크아웃·CI)
- **실행 동작 (`When`)**:
  1. `@mf-types/` 디렉터리가 존재하는 경우 하위 모든 `.d.ts` 파일을 재귀 순회하여 `@ark-ui/react` 문자열 포함 여부를 검사한다.
  2. `@mf-types/` 디렉터리가 존재하지 않는 클린 환경에서는 파일 부재로 인한 오탐 실패 없이 안전하게 건너뛴다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. 로컬 `@mf-types/`에 PR #10 이전의 구버전 `.d.ts`가 남아 있으면 테스트가 즉시 실패(`Red`)하여 개발자에게 최신 `remote-shared` 타입 재동기화 필요성을 알린다.
  2. 최신 `remote-shared` `@mf-types.zip`으로 갱신된 이후에는 누출 파일 `0건`으로 통과(`Green`)하며, 클린 환경에서도 안정적으로 통과한다.

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**:
  - 기존 `vitest.config.ts` alias를 통한 `remote_shared/{ui,theme,utils}` 로컬 스텁 매핑을 그대로 유지하여 기존 32건의 상품 카탈로그 단위·통합 테스트 회귀 무결성을 검증합니다.
- **네트워크 / API 모킹 (`src/testing/msw/`)**:
  - 기존 `MSW` 핸들러(`GET /api/products`, `POST /api/cart`)를 변경 없이 유지합니다.
- **정적 파일 시스템 검증**:
  - `node:fs`(`existsSync`, `readFileSync`, `readdirSync`)로 `src/vite-env.d.ts`와 `@mf-types/**/*.d.ts`(존재 시)의 무-Shim 및 `@ark-ui/react` 무누출을 직접 검증합니다.

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`products` 전용)
- **적용 여부**: `적용`
- [x] **단독 실행(Standalone) 렌더링 검증**: `src/vite-env.d.ts` 임시 Shim 제거 후에도 `App.tsx` / `ProductList` 단독 실행 및 32건 이상 테스트가 회귀 없이 동작하는가?
- [x] **최신 `@mf-types` 실제 네트워크 수신 및 무-Shim `typecheck` 검증**: `remote-shared(3004)`에서 수신한 최신 `@mf-types/**/*.d.ts` 내 `@ark-ui/react` 참조가 `0건`이고 `tsc --noEmit` 및 `vite build`가 통과하는가?
- [x] **이벤트 버스 및 쿼리 캐시 연동**: 기존 `Mode A` (`mfe:cart-updated`) / `Mode B` (`sharedQueryClient`) 및 비인증 3중 차단 테스트가 모두 유지 통과하는가?
- [x] **접근성(A11y) 및 아키텍처 무결성**: `@ark-ui/react`·`clsx` 직접 미설치, 수동 `remotes.d.ts` 미존재, `vite-env.d.ts` 임시 Shim `0건` 조건이 정적 테스트로 보장되는가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
- **적용 여부**: `N/A (해당 없음)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [x] 모든 단위 및 통합 테스트(`Vitest`)가 통과(`Green`)했는가?
- [x] 6대 주석 원칙(파일 최상단 `@file`/`@app`/`@exposed`/`@description` 헤더 동기화 및 분기문 의도 주석)을 준수했는가?
- [x] `Biome` 포맷팅 및 린트 검사(`LF` 줄바꿈 포함), `typecheck`, `vite build`를 모두 통과했는가?
- [ ] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`, `apps/remote-products/docs/todo.md`, 그리고 [`docs/service-registry.md`](../../../../../docs/service-registry.md)를 최신 상태로 업데이트했는가?
