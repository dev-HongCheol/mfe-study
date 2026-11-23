# 📐 [기획 및 설계] `remote-shared` React 서브패스 3종 명시 공유 통일 및 미사용 이벤트 계약 정리 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 이벤트 버스, 상태 공유, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `exposes`, `remotes`, `singleton`, `CustomEvent`, `Zod`, `@mf-types` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261123-cleanup-subpaths-and-unused-events` |
| **서비스 스코프 (`Scope ID`)** | `shared` (`apps/remote-shared`, `Port 3004`) |
| **작업 브랜치** | `shared/chore/cleanup-subpaths-and-unused-events` (패턴 A) |
| **기술 스택 / 번들러** | `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite + Zod + Vitest` |
| **작성일** | `2026-11-23` |
| **작업 규모 평가** | `적정 (단일 PR)` — 최하위 공통 공급자(`remote-shared`)의 React 서브패스 공유 정렬, 미사용 이벤트 제거, 방어 가드 보강 및 루트 SSOT 정본 동기화를 단일 PR로 처리 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- **배경 1 — `Vite` ↔ `Rspack` 이종 번들러 간 React 서브패스 공유 경합 원천 봉쇄**:
  - `Step 1.4`(`remote-cart`, `Rsbuild/Rspack`) 구축 과정에서 `Vite dev(ESM)` 공급자인 `remote-shared(3004)`와 `Rsbuild(Rspack)` 소비자인 `remote-cart(3003)`를 연동할 때, `react`와 `react-dom`만 공유하면 React 19 Automatic JSX Transform이 참조하는 서브패스(`react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom/client`)가 공유 협상에서 누락되어 `jsxDEV is not a function` 또는 이중 React 인스턴스 경합 위험이 있음을 확인했습니다.
  - 현재 `remote-cart/rsbuild.config.ts`에는 이미 3개 서브패스가 명시되어 있으나, 최하위 공급자인 `apps/remote-shared/vite.config.ts`에는 아직 반영되지 않아 설정 비대칭이 존재합니다.
  - 이에 `apps/remote-shared/vite.config.ts`의 `federation.shared`에 `'react/jsx-runtime'`, `'react/jsx-dev-runtime'`, `'react-dom/client'` 3종을 `singleton: true, requiredVersion: '^19.1.0'`으로 명시 통일합니다.
- **배경 2 — 미사용 `MFE_EVENTS.CSS_ISOLATION_CHANGED` 이벤트 계약 정리 및 폐기 이벤트 런타임 방어**:
  - `Step 1.4` 리뷰 과정에서 `remote-cart`는 `.cart-*` 프리픽스와 정적 회귀 테스트(`body|html|button|h1~h5|*` 전역 선택자 금지)로 CSS 격리를 이미 완벽히 보장하므로, 인위적 시각 연출용 `cssIsolated` 토글을 제거했습니다.
  - 이에 따라 `remote-shared/utils`에 남아 있는 미사용 이벤트 상수(`MFE_EVENTS.CSS_ISOLATION_CHANGED`), 페이로드 타입(`CssIsolationChangedEventPayload`), `Zod` 스키마(`cssIsolationChangedEventSchema`)를 제거하여 표준 이벤트 계약을 실사용 4종(`CART_UPDATED`, `AUTH_CHANGED`, `THEME_CHANGED`, `SYNC_MODE_CHANGED`)으로 간결하게 정리합니다.
  - 동시에, 멀티레포 환경에서 구버전 리모트나 외부 스크립트가 폐기된 이벤트 이름(`'mfe:css-isolation-changed'` 등)을 런타임에 전달하더라도 `mfeEventBus`가 `undefined.safeParse(...)` 예외로 크래시하지 않도록 미등록 스키마 방어 가드를 보강합니다.
- **배경 3 — 루트 SSOT 정본(`20261027-phase1-service-contracts`) 정합성 동기화**:
  - 최하위 공급자 계약과 루트 정본 문서가 어긋나지 않도록, `docs/features/20261027-phase1-service-contracts/01-plan-and-design.md`의 `§ 5.2.1`(미사용 이벤트), `§ 5.4.3`(제거된 `cssIsolated` 속성), `§ 5.5`(React 서브패스 3종 공유 규약)을 현행 구현과 1:1로 동기화합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **이종 번들러(`Vite` ↔ `Rspack`) 공유 스코프 키(`shareKey`) 대칭성 보장**:
  - Module Federation 런타임에서 `shared`에 `'react'`만 등록하면 정확 일치(exact match) 모듈만 공유되고 `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom/client` 같은 서브패스 import는 공유 풀에서 누락될 수 있습니다.
  - 공급자(`Vite`)와 소비자(`Rspack`/`Vite`) 양쪽에 동일한 3개 서브패스 키와 버전 범위(`^19.1.0`)를 명시하여 호스트 2종(`host-vite`, `host-rspack`) 구축 전에 공유 계약을 표준화합니다.
- **공통 계약 축소(Breaking Cleanup) 시 하위 계층 우선 정리 & 런타임 방어 전략**:
  - 물리적 멀티레포 격리(`verify-scope.mjs`) 원칙에 따라 최하위 공통 모듈(`remote-shared`)과 루트 정본(`docs/`)을 먼저 정리하고, 타 서비스(`remote-products`, `remote-cart`)의 테스트용 로컬 스텁 정리는 각 서비스의 후속 작업 브랜치에서 독립 수행합니다.
  - 독립 배포된 구버전 리모트가 폐기된 이벤트 이름으로 `emit`/`subscribe`를 호출해도 런타임 `TypeError`가 발생하지 않도록 `mfeEventBus` 내부에 스키마 존재 여부 가드를 둡니다([Study 05 #10](../../../../../docs/study/05-fullstack-service-real-world-issues.md)).

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**: [Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)](../../../../../docs/features/20261027-phase1-service-contracts/01-plan-and-design.md), [서비스 레지스트리 (`service-registry.md`)](../../../../../docs/service-registry.md)
- **참조 항목(섹션 제목)**:
  - `§ 5.2.1 표준 커스텀 이벤트 이름 상수 (MFE_EVENTS)` *(미사용 `CSS_ISOLATION_CHANGED` 제거 후 4종으로 동기화)*
  - `§ 5.2.2 이벤트별 페이로드 인터페이스 및 Zod 검증 스키마` *(표준 4종 이벤트 페이로드 정합 유지)*
  - `§ 5.4.3 remote_cart/CartWidget 노출 컴포넌트 Props 계약 (CartWidgetProps)` *(이미 제거된 `cssIsolated?: boolean` 속성 정리)*
  - `§ 5.5 Module Federation 2.0 공통 공유 의존성(shared singleton) 및 포트·CORS 계약` *(React 서브패스 3종 명시 공유 규약 추가 동기화)*
  - `service-registry.md § 4.2 Module Federation 노출(exposes) 3대 서브패스 시그니처 요약` *(5단계-C 머지 직전 `5대 이벤트` → `4대 이벤트` 및 React 서브패스 공유 반영)*

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `@module-federation/vite` (Context7 `/module-federation/vite`), Module Federation 공식 문서 (Context7 `/websites/module-federation_io`)
- **핵심 스펙 및 주의사항**:
  1. **React 서브패스 공유 필수성 (`@module-federation/vite` 마이그레이션 가이드 & `module-federation.io` 트러블슈팅)**:
     - 호스트와 리모트가 동일 React 렌더링 경계를 공유할 때 `react`, `react-dom`뿐 아니라 경계를 넘나드는 서브패스 import(`react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom/client`)도 반드시 공유 대상에 포함해야 합니다.
     - 정확 일치 키(`'react'`, `'react-dom'`)만 등록하면 `react-dom/client`나 `react/jsx-dev-runtime`이 로컬로 중복 번들링되어 React 싱글톤 규약이 깨지거나 `Vite dev` ↔ `Rspack` 간 `jsxDEV` 경합이 발생할 수 있습니다.
  2. **명시적 3종 키 등록으로 이종 번들러(`Vite` ↔ `Rspack`) 1:1 `shareKey` 정합**:
     - `@module-federation/vite`의 `ModuleFederationOptions['shared']`는 `Record<string, SharedConfig>` 형태를 공식 지원합니다.
     - 본 프로젝트의 `apps/remote-cart/rsbuild.config.ts`에서 이미 검증된 명시적 3종 키(`'react/jsx-runtime'`, `'react/jsx-dev-runtime'`, `'react-dom/client'`, 각각 `{ singleton: true, requiredVersion: '^19.1.0' }`)를 `remote-shared/vite.config.ts`에도 동일하게 선언하여 번들러 간 `shareKey` 불일치 가능성을 제거합니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> 승인된 작업 스코프(`.agents/active-scope.json`: `shared`) 및 전역 허용 루트 문서(`docs/`, `todo.md`) 내에서 변경될 파일 목록입니다. 타 서비스 폴더(`apps/remote-products`, `apps/remote-cart`)의 테스트 스텁 정리는 스코프 격리 원칙에 따라 각 서비스 후속 작업에서 처리합니다.

| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 (서비스 루트 기준 / 루트 파일은 루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `docs/features/20261123-cleanup-subpaths-and-unused-events/01-plan-and-design.md` | 본 1단계 기획 및 상세 설계 문서 |
| `NEW` | `docs/features/20261123-cleanup-subpaths-and-unused-events/02-tdd-spec.md` | 2단계 TDD 명세서 |
| `NEW` | `docs/features/20261123-cleanup-subpaths-and-unused-events/03-code-review.md` | *(5단계-A 작성 예정)* PR 생성 전 심층 코드 리뷰서 |
| `MOD` | `docs/todo.md` | 본 작업 진행 중 등록 및 5단계-C 머지 직전 완료 이관 |
| `MOD` | `vite.config.ts` | `federation.shared`에 `'react/jsx-runtime'`, `'react/jsx-dev-runtime'`, `'react-dom/client'` 3종(`singleton: true`, `requiredVersion: '^19.1.0'`) 명시 추가 |
| `MOD` | `src/features/utils/model/contracts.ts` | 미사용 `MFE_EVENTS.CSS_ISOLATION_CHANGED`, `CssIsolationChangedEventPayload`, `cssIsolationChangedEventSchema` 및 관련 매핑 항목 제거(표준 4종으로 정리) |
| `MOD` | `src/exposed/utils.ts` | `CssIsolationChangedEventPayload`, `cssIsolationChangedEventSchema` 재노출 제거 |
| `MOD` | `src/features/utils/model/event-bus.ts` | 미등록/폐기 이벤트 이름으로 런타임 `emit`/`subscribe` 호출 시 `TypeError` 크래시를 차단하는 스키마 존재 여부 방어 가드 추가 |
| `MOD` | `src/features/utils/model/event-bus.test.ts` | 표준 이벤트 4종 계약 검증, `CSS_ISOLATION_CHANGED` 미포함 검증, `exposed/utils` 공개 심볼 검증 및 미등록/폐기 이벤트 런타임 방어 단위 테스트 추가 |
| `MOD` | `src/__tests__/SharedShowcase.integration.test.tsx` | `vite.config.ts` React 서브패스 3종 명시 공유 정적 회귀 검증 및 `dist/@mf-types/**/*.d.ts` 내 폐기 심볼 `0건` 검증 추가 |
| `MOD` | `(루트) docs/features/20261027-phase1-service-contracts/01-plan-and-design.md` | `§ 5.2.1`(`CSS_ISOLATION_CHANGED`), `§ 5.4.3`(`cssIsolated`) 미사용 계약 정리 및 `§ 5.5` React 서브패스 3종 공유 규약 동기화 |
| `MOD` | `(루트) todo.md` & `docs/service-registry.md` | **(5단계-C 머지 직전 필수 갱신)** Step 1.2/1.4 후속 정리 완료 및 표준 이벤트 4종·서브패스 공유 현황 반영 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`
> 모든 인터페이스와 속성에는 인텔리센스 한글 설명 주석(`/** ... */`)을 유지하며, 이벤트 계약은 실사용 표준 4종으로만 구성합니다.

### 5.1 정리된 표준 이벤트 이름 상수 및 페이로드 맵 (`src/features/utils/model/contracts.ts`)

```ts
/**
 * @description 마이크로 프론트엔드 앱 간 통신에 사용되는 표준 CustomEvent 이름 상수 맵 (루트 SSOT § 5.2.1)
 */
export const MFE_EVENTS = {
  /** 상품 앱에서 장바구니에 상품을 추가했음을 알리는 이벤트 (Mode A 동기화 트리거 및 모니터 로깅용) */
  CART_UPDATED: 'mfe:cart-updated',

  /** 호스트에서 로그인 사용자를 전환했음을 알리는 이벤트 */
  AUTH_CHANGED: 'mfe:auth-changed',

  /** 실시간 디자인 테마가 변경되었음을 알리는 이벤트 */
  THEME_CHANGED: 'mfe:theme-changed',

  /** 호스트 MfeInspector에서 상태 동기화 학습 모드(Mode A <-> Mode B)를 전환했음을 알리는 이벤트 */
  SYNC_MODE_CHANGED: 'mfe:sync-mode-changed',
} as const;

/**
 * @description 각 MFE 커스텀 이벤트 이름과 페이로드 타입을 1:1로 매핑하는 인터페이스
 */
export interface MfeEventPayloadMap {
  /** 장바구니 변경 이벤트 매핑 */
  [MFE_EVENTS.CART_UPDATED]: CartUpdatedEventPayload;

  /** 인증 계정 전환 이벤트 매핑 */
  [MFE_EVENTS.AUTH_CHANGED]: AuthChangedEventPayload;

  /** 테마 변경 이벤트 매핑 */
  [MFE_EVENTS.THEME_CHANGED]: ThemeChangedEventPayload;

  /** 상태 동기화 모드 변경 이벤트 매핑 */
  [MFE_EVENTS.SYNC_MODE_CHANGED]: SyncModeChangedEventPayload;
}

/** 이벤트 이름별 Zod 스키마 조회 사전 상수 (표준 4종) */
export const MFE_EVENT_SCHEMAS: {
  [K in MfeEventName]: z.ZodType<MfeEventPayloadMap[K]>;
} = {
  [MFE_EVENTS.CART_UPDATED]: cartUpdatedEventSchema,
  [MFE_EVENTS.AUTH_CHANGED]: authChangedEventSchema,
  [MFE_EVENTS.THEME_CHANGED]: themeChangedEventSchema,
  [MFE_EVENTS.SYNC_MODE_CHANGED]: syncModeChangedEventSchema,
};
```

### 5.2 폐기·미등록 이벤트 런타임 방어 가드 (`src/features/utils/model/event-bus.ts`)
- `emit(eventName, payload)`에서 `const schema = MFE_EVENT_SCHEMAS[eventName];` 조회 후 `!schema`이면 `console.warn`을 남기고 즉시 `false`를 반환합니다.
- `subscribe(eventName, handler)`에서도 `!schema`이면 `console.warn`을 남기고 `window.addEventListener`를 등록하지 않은 채 안전한 빈 해제 함수 `() => {}`를 반환합니다.

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`shared` 전용)
- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared`)**:
  - **노출 모듈 (`exposes`)**: 기존 3대 서브패스 유지 (`'./ui'`, `'./theme'`, `'./utils'`). `./utils`에서만 폐기된 `CssIsolationChangedEventPayload` 및 `cssIsolationChangedEventSchema` 재노출을 제거합니다.
  - **소비 모듈 (`remotes`)**: `N/A` (최하위 공통 공급자)
  - **공유 의존성 (`shared` & `singleton`)**: 아래 6개 엔트리를 `apps/remote-cart/rsbuild.config.ts`와 1:1 대칭으로 통일합니다.
    ```ts
    shared: {
      react: {
        singleton: true,
        requiredVersion: '^19.1.0',
      },
      // [이종 번들러 방어] Vite Dev(ESM) 공급자와 Rspack 간 React Automatic JSX Transform 서브패스 공유 경합(jsxDEV is not a function) 차단
      'react/jsx-runtime': {
        singleton: true,
        requiredVersion: '^19.1.0',
      },
      'react/jsx-dev-runtime': {
        singleton: true,
        requiredVersion: '^19.1.0',
      },
      'react-dom': {
        singleton: true,
        requiredVersion: '^19.1.0',
      },
      'react-dom/client': {
        singleton: true,
        requiredVersion: '^19.1.0',
      },
      '@tanstack/react-query': {
        singleton: true,
        requiredVersion: '^5.74.4',
      },
    }
    ```
  - **원격 타입 생성 (`dts`)**: 기존 `generateTypes: true` 및 `dev.disableDynamicRemoteTypeHints: true`를 그대로 유지하며, 4단계 `vite build`로 `dist/@mf-types.zip`과 `dist/@mf-types/**/*.d.ts`를 재생성해 `@ark-ui/react` 참조 `0건` 및 폐기 이벤트 심볼 `0건`을 실증합니다.
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**:
  - `App.tsx`, `bootstrap.tsx`, `main.ts`의 단독 실행 쇼케이스 동작은 변경 없이 100% 유지됩니다.
- **마이크로 앱 간 통신 및 상태 공유 (`CustomEvent` / `sharedQueryClient`)**:
  - `mfeEventBus`의 표준 이벤트는 4종(`CART_UPDATED`, `AUTH_CHANGED`, `THEME_CHANGED`, `SYNC_MODE_CHANGED`)으로 정리하며, 타 서비스(`remote-products`, `remote-cart`)의 본 코드 및 테스트는 `CSS_ISOLATION_CHANGED`를 이미 미사용 중이므로 하위 호환 영향이 없습니다.
  - 타 서비스의 로컬 테스트 스텁(`apps/remote-products/src/testing/stubs/remote-shared-utils.ts`, `apps/remote-cart/src/testing/stubs/remote-shared-utils.ts`) 및 `apps/remote-products/vite.config.ts`의 서브패스 통일은 스코프 격리 원칙에 따라 각 서비스 후속 작업에서 독립 정리합니다.
- **공통 UI 컴포넌트 (`Ark UI`) 및 스타일 격리 (CSS 변수 / 프리픽스)**:
  - 기존 13종 `ComponentPropsWithoutRef` 기반 경계 캡슐화와 4종 시맨틱 테마 엔진은 변경 없이 그대로 유지합니다.

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `N/A (해당 없음 — 최하위 프론트엔드 공통 모듈 스코프)`
