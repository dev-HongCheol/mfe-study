# 📐 [기획 및 설계] `remote-products` `@ark-ui/react/*` 임시 타입 Shim 제거 및 무-Shim `@mf-types` 소비 검증 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 캡슐화, 추상화 누출, 임시 보강 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `exposes`, `remotes`, `Ark UI`, `ComponentPropsWithoutRef`, `@mf-types`, `Shim` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261119-remove-ark-type-shim` |
| **서비스 스코프 (`Scope ID`)** | `products` (`apps/remote-products`, `Port 3002`) |
| **작업 브랜치** | `products/chore/remove-ark-type-shim` (패턴 A) |
| **기술 스택 / 번들러** | `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite + TanStack Query v5 + React Hook Form + Zod + ky + MSW + Vitest` |
| **작성일** | `2026-11-19` |
| **작업 규모 평가** | `적정 (단일 PR)` — `src/vite-env.d.ts` 임시 Shim 80줄 제거, 정적 회귀 차단 테스트 추가 및 최신 `remote-shared` `@mf-types.zip` 재수신 무-Shim 검증을 단일 `products` PR로 완결 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- **배경 — 공급자 경계 캡슐화 완료(`PR #10`)에 따른 소비자 임시 Shim 청산 ([Study 09](../../../../../docs/study/09-mfe-shared-types-and-design-system-encapsulation.md))**:
  - 기존 Step 1.3 구축 당시에는 공급자(`remote-shared/ui`)가 `HTMLArkProps<*>`와 `Ark*.RootProps`를 외부 계약으로 직접 상속했기 때문에, `@ark-ui/react`를 설치하지 않는 소비자 앱(`remote-products`)이 정적 타입 검사(`tsc --noEmit`)를 통과하려면 [`src/vite-env.d.ts`](../../../src/vite-env.d.ts) 10~89행에 5개 모듈(`@ark-ui/react/{factory,select,collapsible,tabs,splitter}`)의 임시 타입 Shim을 두어야 했습니다.
  - 직전 **`PR #10` (`shared/refactor/ui-prop-encapsulation`)**에서 `remote-shared/ui` 13종 컴포넌트의 노출 `Props`가 순수 `React.ComponentPropsWithoutRef` 및 명시적 원시 타입 기반으로 완전히 캡슐화되어 `dist/@mf-types/**/*.d.ts` 전 파일에서 `@ark-ui/react` 참조가 **`0건`**이 되었습니다.
  - 따라서 이제 소비자(`remote-products`)에 남아 있는 임시 타입 Shim(80줄)을 완전히 제거하고, 갱신된 `@mf-types`만으로 정적 타입 검사(`typecheck`)·빌드(`vite build`)·테스트(`Vitest`)가 100% 통과함을 실증합니다.
- **회귀 방지 목적**:
  - 향후 다른 개발자나 작업에서 `src/vite-env.d.ts`에 서드파티 UI 라이브러리 Shim(`declare module '@ark-ui/react...'`)이 다시 유입되지 않도록 통합 아키텍처 테스트(`ProductList.integration.test.tsx`)에 정적 차단 단언을 추가합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **공급자-소비자 원격 타입 동기화 생명주기 (`@mf-types` 캐시 갱신 실증)**:
  - Git 미추적 로컬 디렉터리 `apps/remote-products/@mf-types/`에는 이전 시점에 수신한 구버전 `.d.ts`(`import ... from '@ark-ui/react/...'`)가 남아 있을 수 있습니다.
  - 공급자(`remote-shared`, `Port 3004`)의 최신 `@mf-types.zip`을 서빙한 상태에서 `remote-products`가 `dts.consumeTypes`로 원격 타입을 재수신하면 구버전 타입이 순수 `ComponentPropsWithoutRef` 기반 선언으로 교체되며, 소비자 앱은 `@ark-ui/react` 설치나 타입 Shim `0줄`로 완전한 인텔리센스와 정적 타입 검증을 얻게 됩니다.
- **후속 소비자 앱(`remote-cart`, `host-vite`, `host-rspack`) 무-Shim 표준 확립**:
  - `remote-products`에서 임시 Shim 없이 `remote_shared/ui` 소비가 100% 검증됨으로써, 이어서 구축할 `Step 1.4(remote-cart)`와 `Step 1.5(host-vite`, `host-rspack)`의 `src/vite-env.d.ts`도 표준 `/// <reference types="vite/client" />` 한 줄만으로 깔끔하게 시작할 수 있습니다.

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**:
  - [Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)](../../../../../docs/features/20261027-phase1-service-contracts/01-plan-and-design.md)
  - [서비스 레지스트리 (`service-registry.md`)](../../../../../docs/service-registry.md)
  - [Study 09 (`09-mfe-shared-types-and-design-system-encapsulation.md`)](../../../../../docs/study/09-mfe-shared-types-and-design-system-encapsulation.md)
- **참조 항목(섹션 제목)**:
  - `Phase 1 계약 정본 § 5.3.1 remote_shared/ui 노출 컴포넌트 및 레이아웃 인터페이스` *(소비 계약 변경 없음 — 100% 하위 호환)*
  - `service-registry.md § 4.2 Module Federation 노출(exposes) 3대 서브패스 시그니처 요약` 및 `§ 4.3 타 서비스 필수 소비 규칙 6대 원칙 (1번 무-Shim 소비 보장)`
  - `Study 09 Part 4. 향후 개선 로드맵 (shared -> products)` *(본 작업으로 2단계 로드맵 최종 완결)*

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `@module-federation/vite` (`v1.23.7`, Context7 `/module-federation/vite`)
- **핵심 스펙 및 주의사항**:
  1. **`pluginDts`의 `apply: 'build'` (`generateBundle`) 단계 `consumeTypes` 동작**:
     - `dts.consumeTypes.typesOnBuild: true`가 설정되어 있으면 `vite build` 실행 시 등록된 `remotes`(`http://localhost:3004/mf-manifest.json`)로부터 최신 `@mf-types.zip`을 다운로드·압축 해제하여 로컬 `@mf-types/` 디렉터리를 갱신한 뒤, 자신의 `./ProductList` 노출 타입을 `generateTypesAPI`로 생성합니다.
  2. **로컬 구버전 `@mf-types/` 캐시 주의사항**:
     - 공급자(`remote-shared:3004`) 서버가 꺼진 상태에서 `abortOnError: false`로 빌드하면 로컬 `@mf-types/`에 이전 구버전 파일이 그대로 남아 `tsc --noEmit`에서 `Cannot find module '@ark-ui/react/...'` 오류가 발생할 수 있습니다.
     - 따라서 검증 단계(4단계)에서는 반드시 최신 `remote-shared`를 빌드·서빙(`Port 3004`)한 상태에서 기존 구버전 `apps/remote-products/@mf-types/`를 갱신 수신하고, 수신된 `@mf-types/**/*.d.ts` 내 `@ark-ui/react` 참조가 `0건`임을 확인한 뒤 `typecheck` · `build` · `test`를 연속 검증합니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> 승인된 작업 스코프(`.agents/active-scope.json`: `products`) 및 머지 직전 전역 허용 문서(`todo.md`, `docs/service-registry.md`) 내에서 변경될 파일 목록입니다.

| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 (서비스 루트 기준 / 루트 파일은 루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `docs/features/20261119-remove-ark-type-shim/01-plan-and-design.md` | 본 1단계 기획 및 상세 설계 문서 |
| `NEW` | `docs/features/20261119-remove-ark-type-shim/02-tdd-spec.md` | *(2단계 작성 예정)* 무-Shim 소비 및 정적 회귀 차단 TDD 명세서 |
| `NEW` | `docs/features/20261119-remove-ark-type-shim/03-code-review.md` | *(5단계-A 작성 예정)* PR 생성 전 심층 코드 리뷰서 |
| `MOD` | `docs/todo.md` | `20261119-remove-ark-type-shim` 진행 중 등록 및 머지 직전 완료 이관 |
| `MOD` | `src/vite-env.d.ts` | 10~89행 `@ark-ui/react/*` 임시 `declare module` Shim 5개 블록 완전 제거 및 파일 헤더 주석 현행화 (`/// <reference types="vite/client" />`만 유지) |
| `MOD` | `src/__tests__/ProductList.integration.test.tsx` | `TC-06` 아키텍처 무결성 테스트에 `src/vite-env.d.ts` 내 `@ark-ui/react` 임시 Shim(`declare module`) `0건` 및 `/// <reference types="vite/client" />` 유지 정적 검증 추가 |
| `MOD` | `(루트) todo.md` & `docs/service-registry.md` | **(5단계-C 머지 직전 필수 갱신)** Step 1.2/1.3 후속 개선 최종 완료 반영 및 `remote-products` 무-Shim 소비 확인 기재 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript`) — `[공통 필수]`
> 본 작업은 런타임 비즈니스 로직이나 `./ProductList` 외부 계약을 변경하지 않고, 컴파일 타임 전역 앰비언트 선언 파일(`src/vite-env.d.ts`)의 임시 Shim만 제거합니다.

### 5.1 정리 후 `apps/remote-products/src/vite-env.d.ts` 최종 형태
```ts
/**
 * @file vite-env.d.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description Vite 클라이언트 실행 환경의 전역 타입 선언 파일입니다.
 *              remote_shared/ui 노출 Props는 ComponentPropsWithoutRef 기반으로 경계 캡슐화되어 있어 별도 @ark-ui/react 타입 Shim 없이 @mf-types만으로 정적 타입 검사를 통과합니다 ([Study 09]).
 */
/// <reference types="vite/client" />
```

### 5.2 정적 회귀 차단 검증 규약 (`ProductList.integration.test.tsx`)
- `src/vite-env.d.ts` 파일 본문에서 다음 조건을 검증합니다.
  1. 표준 Vite 환경 참조 지시어(`/// <reference types="vite/client" />`)가 유지되어 있어야 합니다.
  2. `declare module '@ark-ui/react` 또는 `declare module "@ark-ui/react` 문자열 및 `HTMLArkProps` 참조가 **`0건`**이어야 합니다.
- 기존 `remote-products`의 UI 컴포넌트(`ProductFilterBar`, `ProductCard`, `ProductCatalogContent`, `ProductCatalogView`, `CatalogErrorBanner`, `ProductGridSkeleton`, `App`)는 `remote_shared/ui`에서 이미 커스텀 Props와 표준 HTML 속성만 소비하므로 컴포넌트 코드 수정은 `0건`입니다.

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`products` 전용)
- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared`)**:
  - **노출 모듈 (`exposes`)**: `'./ProductList': './src/exposed/ProductList.tsx'` 기존 유지
  - **소비 모듈 (`remotes`)**: `remote_shared` (`http://localhost:3004/mf-manifest.json`) 기존 유지 (`dts.consumeTypes.typesOnBuild: true`, `dev.disableDynamicRemoteTypeHints: true`)
  - **공유 의존성 (`shared` & `singleton`)**: `react`, `react-dom`, `@tanstack/react-query` 기존 싱글톤 유지
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**:
  - 런타임 코드 변경 없으므로 단독 실행(`Port 3002`) 및 `./ProductList` 노출 동작 100% 동일 유지
- **마이크로 앱 간 통신 및 상태 공유 (`CustomEvent` / `sharedQueryClient`)**:
  - `Mode A` / `Mode B` 및 비인증 3중 차단 로직 변경 없음 (기존 32건 회귀 테스트 전원 통과 확인)
- **공통 UI 컴포넌트 (`Ark UI`) 경계 캡슐화 및 무-Shim `@mf-types` 동기화 검증 전략**:
  - 4단계 검증 시 최신 `remote-shared`를 `Port 3004`로 빌드·프리뷰(또는 서빙)한 상태에서 `remote-products`의 구버전 `@mf-types/`를 비우고 `vite build`를 실행해 최신 `@mf-types.zip`을 실제 네트워크 경로(`http://localhost:3004/mf-manifest.json` → `@mf-types.zip`)로 재수신합니다.
  - 갱신된 `apps/remote-products/@mf-types/**/*.d.ts` 전 파일에 `@ark-ui/react` 참조가 `0건`임을 확인한 뒤, `src/vite-env.d.ts` Shim이 없는 상태에서 `pnpm --filter @mfe-study/remote-products typecheck`, `build`, `test`와 루트 `pnpm test`, `pnpm check`가 모두 통과함을 실증합니다.

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `N/A (해당 없음 — 프론트엔드 상품 리모트 스코프)`
