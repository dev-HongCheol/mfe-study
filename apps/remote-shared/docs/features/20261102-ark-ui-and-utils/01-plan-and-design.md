# 📐 [기획 및 설계] 원격 공통 디자인 시스템(`Ark UI`), 실시간 테마 및 MFE 유틸리티 구축 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Suspense`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261102-ark-ui-and-utils` |
| **서비스 스코프 (`Scope ID`)** | `shared` (`apps/remote-shared`, `Port 3004`) |
| **작업 브랜치** | `shared/feat/ark-ui-and-utils` (패턴 A) |
| **기술 스택 / 번들러** | `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite + @ark-ui/react v5 + clsx + TanStack Query v5 + ky + Zod + date-fns + Vitest` |
| **작성일** | `2026-11-02` |
| **작업 규모 평가** | `적정 (단일 PR)` — `./utils` → `./theme` → `./ui` 3대 서브패스가 단방향 의존성으로 결합된 단일 원격 컨테이너(`remote_shared`)의 초기 베이스라인 구축 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- 물리적 멀티레포 환경에서 각 도메인 리모트(`remote-products:3002`, `remote-cart:3003`)와 다중 호스트(`host-vite:3000`, `host-rspack:3001`)가 로컬 파일(`workspace:*`) 참조 없이 **오직 Module Federation 2.0 런타임 로딩만으로 동일한 디자인 시스템, 테마 컨텍스트, 이벤트 버스 및 싱글톤 쿼리 클라이언트를 공유**할 수 있도록 기반 원격 서비스(`remote-shared`, `Port 3004`)를 구축합니다.
- `@ark-ui/react` 및 `clsx`는 오직 본 서비스(`apps/remote-shared`)에만 설치하고 `remote_shared/ui` 단일 창구로 캡슐화하여 노출하며, **타 서비스 앱들이 지켜야 할 노출 시그니처와 소비 규칙을 [`docs/service-registry.md`](../../../../../docs/service-registry.md)에 정본화**하여 이후 앱 구현 시 즉시 참조할 수 있도록 합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **단일 배럴 파일 금지, `1 컴포넌트 = 1 파일` (`PascalCase.tsx`) 분리 및 3계층 단방향 노출 아키텍처 ([Study 05 #09](../../../../../docs/study/05-fullstack-service-real-world-issues.md))**:
  - 노출 서브패스를 `./utils`, `./theme`, `./ui` 3개로 엄격히 분리하고 내부 참조 방향을 **`utils`(최하단) → `theme`(중간) → `ui`(최상단)** 단방향으로만 강제합니다.
  - 모든 React 컴포넌트는 `1 컴포넌트 = 1 파일` 원칙으로 개별 파일에 분리하고 컴포넌트 `.tsx` 파일명은 반드시 대문자(`PascalCase`, 예: `Button.tsx`, `Select.tsx`, `Splitter.tsx`)로 시작합니다.
- **`Ark UI` 원본 `Props` (`Ark*.RootProps` / `HTMLArkProps<*>`) 기본 상속(`Omit` / `Pick`) 통일**:
  - `Ark UI`를 사용하는 13종 모든 UI·레이아웃 컴포넌트는 해당 `Ark UI` 컴포넌트의 원본 `Props`를 기본으로 상속(`extends Omit<..., ...>`)받고, 개발자 편의를 위한 단순화(`options` 배열, 단일 문자열 `value`/`onChange` 등)만 재정의하여 일관성과 확장성(`asChild`, `lazyMount`, `disabled` 등 원본 기능 투과)을 동시에 확보합니다.
- **MFE 고유 런타임 함정 및 서비스 품질 방어 ([Study 04](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) & [Study 05](../../../../../docs/study/05-fullstack-service-real-world-issues.md))**:
  - `main.ts` + `bootstrap.tsx` 2단 비동기 분리(`#01`), `strictPort: true` & `cors: true`(`#03`), 시맨틱 CSS 변수(`--mfe-*`) 및 `Z_INDEX_TOKENS`(`#05, #06`), 단일 원격 `ThemeContext`(`#07`), 자동 해제 `useMfeEvent`(`#09`), `createScopedStorage`(`#10`), `Zod` 경계 검증 및 접근성·CLS·고정폭 숫자 방어를 기본 내장합니다.

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**: [Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)](../../../../../docs/features/20261027-phase1-service-contracts/01-plan-and-design.md)
- **참조 항목(섹션 제목)**:
  - `§ 5.1.1 표준 API 응답 엔벨로프 계약 (ApiResponse<T> & ApiErrorPayload)`
  - `§ 5.2.1 표준 커스텀 이벤트 이름 상수 (MFE_EVENTS)`
  - `§ 5.2.2 이벤트별 페이로드 인터페이스 및 Zod 검증 스키마`
  - `§ 5.3.1 remote_shared/ui 노출 컴포넌트 및 레이아웃 인터페이스`
  - `§ 5.3.2 remote_shared/theme 실시간 테마(ThemeMode) 및 CSS 변수·z-index 토큰 계약`
  - `§ 5.3.3 remote_shared/utils 공통 유틸리티 및 sharedQueryClient 시그니처 계약`
  - `§ 5.4.1 상태 동기화 비교 모드 타입 (SyncMode) 및 동작 규약`
  - `§ 5.5 Module Federation 2.0 공통 공유 의존성(shared singleton) 및 포트·CORS 계약`

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `@module-federation/vite` (`/module-federation/vite`, `v1.23.7`), `@ark-ui/react` (`/websites/ark-ui` & `/chakra-ui/ark`, `v5.40.0`), `Vite` (`v7.3.7` — 루트 `vitest@3.2.7` 내장 Vite와 동일 버전)
- **핵심 스펙 및 주의사항**:
  1. **`@module-federation/vite` 서브패스 노출 및 매니페스트·원격 타입(`@mf-types`)**: `federation({ name: 'remote_shared', filename: 'remoteEntry.js', manifest: true, dts: { generateTypes: true, tsConfigPath: './tsconfig.json' }, exposes: { './ui', './theme', './utils' }, shared: { react, 'react-dom', '@tanstack/react-query' } })` 설정으로 Vite(`3000`)와 Rspack(`3001`) 호스트 양쪽 호환 `mf-manifest.json` 및 `@mf-types.zip`을 생성합니다.
  2. **`Vitest 3.2` ↔ `Vite 7.3` 버전 정렬**: `vite@^7.3.7` + `@vitejs/plugin-react@^5.2.0` 조합으로 플러그인 타입 충돌을 차단합니다.
  3. **`@ark-ui/react` v5 원본 `RootProps` 및 `HTMLArkProps` 활용**:
     - 상태 머신 4종(`Select`, `Splitter`, `Tabs`, `Collapsible`)은 각각 `Select.RootProps<SelectOptionItem>`, `Splitter.RootProps`, `Tabs.RootProps`, `Collapsible.RootProps`를 `Omit`으로 상속하고 나머지 속성(`...rest`)을 `<Ark*.Root {...rest}>`에 그대로 투과합니다.
     - 팩토리 프리미티브 9종(`Button`, `Heading`, `Skeleton`, `Badge`, `Container`, `Grid`, `Flex`, `Stack`, `Card`)은 `@ark-ui/react/factory`의 `ark.*` 엘리먼트와 `HTMLArkProps<'button' | 'h1' | 'div' | 'span'>`을 기본 상속합니다.
     - `jsdom` 환경의 `Splitter` 테스트를 위해 `src/testing/setup.ts`에 `ResizeObserver` 폴리필 스텁을 등록합니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> 모든 React 컴포넌트(`.tsx`)는 `1 컴포넌트 = 1 파일`로 분리하고 파일명을 대문자(`PascalCase`)로 시작합니다.

| 구분 (`NEW` / `MOD`) | 파일 경로 (루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `apps/remote-shared/docs/todo.md` | `shared` 서비스 스코프 전용 작업 현황 및 백로그 관리 문서 |
| `NEW` | `apps/remote-shared/docs/features/20261102-ark-ui-and-utils/01-plan-and-design.md` | 본 기획 및 상세 설계 문서 |
| `NEW` | `apps/remote-shared/docs/features/20261102-ark-ui-and-utils/02-tdd-spec.md` | 단위·통합 TDD 테스트 명세서 |
| `NEW` | `apps/remote-shared/package.json` | `@mfe-study/remote-shared` 매니페스트 (`catalog:` 공유 의존성 + `@ark-ui/react`, `clsx`, `@module-federation/vite`) |
| `NEW` | `apps/remote-shared/tsconfig.json` | 루트 `tsconfig.base.json`을 상속하는 React JSX(`react-jsx`) 및 DOM 타입 설정 |
| `NEW` | `apps/remote-shared/vite.config.ts` | Port `3004`, `strictPort: true`, `cors: true` 및 Module Federation 2.0(`remote_shared`) 설정 |
| `NEW` | `apps/remote-shared/vitest.config.ts` | `jsdom` 환경 기반 `remote-shared` 단위·통합 TDD 설정 |
| `NEW` | `apps/remote-shared/index.html` | 단독 실행(Standalone `Port 3004`) 진입 HTML 문서 |
| `NEW` | `apps/remote-shared/src/main.ts` | `eager consumption` 방지를 위한 비동기 동적 `import('./bootstrap')` 진입 스크립트 (비컴포넌트 `.ts`) |
| `NEW` | `apps/remote-shared/src/bootstrap.tsx` | 단독 실행 시 `ThemeProvider`와 `<App />`을 `#root`에 마운트하는 부트스트랩 엔트리 |
| `NEW` | `apps/remote-shared/src/App.tsx` | `http://localhost:3004` 단독 실행용 디자인 시스템·테마·유틸리티 쇼케이스 컴포넌트 (`PascalCase`) |
| `NEW` | `apps/remote-shared/src/testing/setup.ts` | `@testing-library/jest-dom/vitest` 및 `ResizeObserver` `jsdom` 보완 설정 |
| `NEW` | `apps/remote-shared/src/features/utils/model/contracts.ts` | 루트 SSOT `§ 5.1.1`, `§ 5.2`, `§ 5.4.1` 공통 이벤트·API 봉투 타입 및 `Zod` 스키마 |
| `NEW` | `apps/remote-shared/src/features/utils/model/event-bus.ts` | `MFE_EVENTS`, `mfeEventBus`(`emit`, `subscribe`), `useMfeEvent` 훅 (`+ event-bus.test.ts`, `UseMfeEvent.test.tsx`) |
| `NEW` | `apps/remote-shared/src/features/utils/model/storage.ts` | `mfe:<scopeId>:<key>` 네임스페이스 및 `Zod` 파싱 `createScopedStorage` (`+ storage.test.ts`) |
| `NEW` | `apps/remote-shared/src/features/utils/model/formatters.ts` | `formatCurrency`, `formatDate`, `formatRelativeTime` (`+ formatters.test.ts`) |
| `NEW` | `apps/remote-shared/src/features/utils/model/error.ts` | `normalizeError` 및 `NormalizedError` 타입 (`+ error.test.ts`) |
| `NEW` | `apps/remote-shared/src/features/utils/api/http-client.ts` | `ky` 기반 `httpClient`, `createApiClient`, `unwrapApiResponse` (`+ http-client.test.ts`) |
| `NEW` | `apps/remote-shared/src/features/utils/api/query-client.ts` | 싱글톤 `sharedQueryClient`, `createMfeQueryClient`, `CART_QUERY_KEY` (`+ query-client.test.ts`) |
| `NEW` | `apps/remote-shared/src/features/theme/model/tokens.ts` | `ThemeMode` 4종 팔레트 맵, `Z_INDEX_TOKENS` 상수 및 루트 CSS 변수 주입 도우미 |
| `NEW` | `apps/remote-shared/src/features/theme/ui/theme.css` | 시맨틱 CSS 변수 토큰(`--mfe-*`) 및 표준 `z-index` 변수 스타일 |
| `NEW` | `apps/remote-shared/src/features/theme/ui/ThemeProvider.tsx` | 단일 원격 `ThemeContext`, `ThemeProvider`, `useTheme` 훅 (`+ ThemeProvider.test.tsx`) |
| `NEW` | `apps/remote-shared/src/features/ui/ui-styles.css` | 시맨틱 CSS 변수(`var(--mfe-*)`) 기반 공통 UI·레이아웃 스타일 |
| `NEW` | `apps/remote-shared/src/features/ui/components/Button.tsx` | `HTMLArkProps<'button'>` 상속 공통 버튼 컴포넌트 (`+ Button.test.tsx`) |
| `NEW` | `apps/remote-shared/src/features/ui/components/Heading.tsx` | `HTMLArkProps<'h1'>` 상속 시맨틱 제목(`H1~H5`) 컴포넌트 (`+ Heading.test.tsx`) |
| `NEW` | `apps/remote-shared/src/features/ui/components/Select.tsx` | `Omit<ArkSelect.RootProps, ...>` 상속 포털 드롭다운 컴포넌트 (`+ Select.test.tsx`) |
| `NEW` | `apps/remote-shared/src/features/ui/components/Skeleton.tsx` | `HTMLArkProps<'div'>` 상속 CLS 방지 스켈레톤 컴포넌트 (`+ Skeleton.test.tsx`) |
| `NEW` | `apps/remote-shared/src/features/ui/components/Badge.tsx` | `HTMLArkProps<'span'>` 상속 상태 배지 컴포넌트 (`+ Badge.test.tsx`) |
| `NEW` | `apps/remote-shared/src/features/ui/layouts/Splitter.tsx` | `Omit<ArkSplitter.RootProps, ...>` 상속 리사이즈 분할 레이아웃 (`+ Splitter.test.tsx`) |
| `NEW` | `apps/remote-shared/src/features/ui/layouts/Tabs.tsx` | `Omit<ArkTabs.RootProps, ...>` 상속 탭 전환 레이아웃 (`+ Tabs.test.tsx`) |
| `NEW` | `apps/remote-shared/src/features/ui/layouts/Collapsible.tsx` | `Omit<ArkCollapsible.RootProps, ...>` 상속 접기/펴기 레이아웃 (`+ Collapsible.test.tsx`) |
| `NEW` | `apps/remote-shared/src/features/ui/layouts/Container.tsx` | `HTMLArkProps<'div'>` 상속 최대 너비 중앙 정렬 컨테이너 (`+ StaticLayouts.test.tsx`) |
| `NEW` | `apps/remote-shared/src/features/ui/layouts/Grid.tsx` | `HTMLArkProps<'div'>` 상속 반응형 그리드 레이아웃 |
| `NEW` | `apps/remote-shared/src/features/ui/layouts/Flex.tsx` | `HTMLArkProps<'div'>` 상속 플렉스 레이아웃 (`min-width: 0` 지원) |
| `NEW` | `apps/remote-shared/src/features/ui/layouts/Stack.tsx` | `HTMLArkProps<'div'>` 상속 수직 스택 레이아웃 |
| `NEW` | `apps/remote-shared/src/features/ui/layouts/Card.tsx` | `HTMLArkProps<'div'>` 상속 서피스 카드 레이아웃 |
| `NEW` | `apps/remote-shared/src/exposed/utils.ts` | Module Federation `./utils` 공개 진입점 (`theme`/`ui` 역참조 0%) |
| `NEW` | `apps/remote-shared/src/exposed/theme.ts` | Module Federation `./theme` 공개 진입점 (`ui` 역참조 0%) |
| `NEW` | `apps/remote-shared/src/exposed/ui.ts` | Module Federation `./ui` 공개 진입점 (개별 컴포넌트 13종 + `clsx` 재노출) |
| `NEW` | `apps/remote-shared/src/__tests__/SharedShowcase.integration.test.tsx` | 단방향 의존성 무결성 및 단독 쇼케이스(`App.tsx`) 통합 테스트 |
| `MOD` | `vitest.config.ts` | 루트 `Vitest` 프로젝트에 `apps/remote-shared` 테스트 연결 |
| `MOD` | `docs/service-registry.md` | **(5단계-B 머지 직전 필수 갱신)** `remote-shared` 명령어, `./ui`·`./theme`·`./utils` 노출 시그니처 및 **타 서비스(호스트·리모트) 필수 소비 규칙** 상세 명세화 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`
> 모든 인터페이스는 내부 속성마다 `/** ... */` 한글 설명 주석을 필수로 작성하며, `Ark UI` 기반 13종 컴포넌트는 모두 `Ark*.RootProps` 또는 `HTMLArkProps<*>`를 `Omit`/`Pick`으로 기본 상속합니다.

### 5.1 `./utils` 세부 유틸리티 인터페이스 (`NormalizedError`, `ScopedStorage`)

```ts
import type { ZodType } from 'zod';

/**
 * @description 모든 형태의 런타임 예외(Error, 문자열, API 에러 봉투 등)를 안전하게 표준화한 에러 객체 인터페이스
 */
export interface NormalizedError {
  /** 사용자 또는 로그에 안전하게 표시할 한글/표준 에러 메시지 */
  message: string;

  /** 머신 판독용 에러 코드 (예: 'UNKNOWN_ERROR', 'OUT_OF_STOCK', 'NETWORK_ERROR') */
  code: string;

  /** HTTP 응답 상태 코드 (네트워크 에러 등 상태 코드가 있는 경우 선택적 포함) */
  status?: number;

  /** 디버깅 추적을 위해 보존한 원본 예외 값 */
  originalError: unknown;
}

/**
 * @description 스코프 프리픽스(mfe:<scopeId>:<key>)와 Zod 런타임 검증이 결합된 안전한 localStorage 래퍼 인터페이스
 */
export interface ScopedStorage {
  /** 현재 스토리지 인스턴스에 바인딩된 서비스 스코프 식별자 */
  readonly scopeId: string;

  /** 실제 localStorage에 저장될 네임스페이스 키 문자열(mfe:<scopeId>:<key>)을 생성합니다. */
  buildKey: (key: string) => string;

  /** 저장된 JSON 값을 읽어 Zod 스키마(safeParse)로 검증한 뒤 유효하면 반환하고, 오염·부재 시 fallback을 반환합니다. */
  getItem: <T>(key: string, schema: ZodType<T>, fallback: T) => T;

  /** 값을 JSON 직렬화하여 스코프 프리픽스가 붙은 키에 안전하게 저장합니다. */
  setItem: <T>(key: string, value: T) => void;

  /** 해당 스코프 프리픽스가 붙은 단일 키를 삭제합니다. */
  removeItem: (key: string) => void;

  /** 타 마이크로 앱의 키는 건드리지 않고 현재 스코프(mfe:<scopeId>:*)의 키만 선택적으로 모두 삭제합니다. */
  clearScope: () => void;
}
```

### 5.2 `./theme` 테마 컨텍스트 인터페이스 (`ThemeMode`, `ThemeContextValue`)

```ts
/**
 * @description 실시간 전환 가능한 4종 디자인 테마 식별자 타입 (루트 SSOT § 5.3.2 준수)
 */
export type ThemeMode = 'indigo' | 'emerald' | 'rose' | 'dark';

/**
 * @description ThemeProvider가 하위 호스트 및 모든 리모트 컴포넌트에 공유하는 테마 컨텍스트 값 인터페이스
 */
export interface ThemeContextValue {
  /** 현재 활성화된 테마 모드 ('indigo' | 'emerald' | 'rose' | 'dark') */
  theme: ThemeMode;

  /** 테마를 즉시 변경하고 localStorage 영속화 및 mfe:theme-changed 이벤트를 함께 발행하는 함수 */
  setTheme: (nextTheme: ThemeMode) => void;

  /** 지원되는 전체 테마 목록 메타데이터 (테마 스위처 UI 렌더링용) */
  availableThemes: ReadonlyArray<{
    /** 테마 고유 코드 */
    value: ThemeMode;
    /** 화면에 표시할 한글/영문 테마 라벨 */
    label: string;
  }>;
}
```

### 5.3 `./ui` 캡슐화 컴포넌트 및 레이아웃 `Props` 인터페이스 (`Ark UI` 원본 `Props` 기본 상속)

```ts
import type { Collapsible as ArkCollapsible } from '@ark-ui/react/collapsible';
import type { HTMLArkProps } from '@ark-ui/react/factory';
import type { Select as ArkSelect } from '@ark-ui/react/select';
import type { Splitter as ArkSplitter } from '@ark-ui/react/splitter';
import type { Tabs as ArkTabs } from '@ark-ui/react/tabs';
import type { ReactNode } from 'react';

/**
 * @description [Button.tsx] ark.button(HTMLArkProps<'button'>)을 기본 상속하고 로딩 잠금 및 시각 변형을 제공하는 버튼 Props
 */
export interface ButtonProps extends HTMLArkProps<'button'> {
  /** 버튼의 시각적 강조 스타일 변형 (기본값: 'primary') */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';

  /** 버튼 패딩 및 폰트 크기 규격 (기본값: 'md') */
  size?: 'sm' | 'md' | 'lg';

  /** 비동기 요청 진행 중 여부 (true일 때 disabled 및 aria-busy 자동 활성화) */
  isLoading?: boolean;

  /** 가로 너비 100% 확장 여부 (기본값: false) */
  fullWidth?: boolean;
}

/**
 * @description [Heading.tsx] ark.h1~h5(HTMLArkProps<'h1'>)를 기본 상속하고 시맨틱 제목 레벨(1~5)을 렌더링하는 Props
 */
export interface HeadingProps extends HTMLArkProps<'h1'> {
  /** 렌더링할 시맨틱 제목 레벨 (1 ~ 5, 기본값: 2) */
  level?: 1 | 2 | 3 | 4 | 5;
}

/**
 * @description [Select.tsx] 드롭다운 개별 선택 항목 인터페이스
 */
export interface SelectOptionItem {
  /** 화면에 표시할 항목 텍스트 */
  label: string;

  /** 선택 시 전달될 고유 문자열 값 */
  value: string;

  /** 개별 항목 비활성화 여부 (선택적) */
  disabled?: boolean;
}

/**
 * @description [Select.tsx] ArkSelect.RootProps를 Omit으로 기본 상속하고 단일 문자열 value/onChange 및 options 배열로 편의성을 높인 Props
 */
export interface SelectProps
  extends Omit<
    ArkSelect.RootProps<SelectOptionItem>,
    'collection' | 'value' | 'defaultValue' | 'onValueChange' | 'onChange' | 'children'
  > {
  /** 선택 가능한 옵션 배열 (내부에서 createListCollection으로 자동 변환) */
  options: SelectOptionItem[];

  /** 현재 선택된 단일 문자열 값 (내부에서 [value] 배열로 자동 매핑) */
  value: string;

  /** 새 항목 선택 시 단일 문자열 값으로 호출되는 편의 콜백 */
  onChange: (value: string) => void;

  /** 값이 선택되지 않았을 때 표시할 안내 문구 (선택적) */
  placeholder?: string;

  /** 스크린 리더 접근성을 위한 필수 레이블 */
  ariaLabel: string;

  /** 상단에 시각적으로 표시할 선택적 라벨 텍스트 */
  label?: string;
}

/**
 * @description [Skeleton.tsx] ark.div(HTMLArkProps<'div'>)를 기본 상속하고 CLS 방지 프리셋 및 반복 렌더링(count)을 지원하는 Props
 */
export interface SkeletonProps extends HTMLArkProps<'div'> {
  /** 스켈레톤 형태 프리셋 ('card'는 실제 카드 min-height와 1:1 매칭) */
  variant?: 'card' | 'text' | 'rect';

  /** 가로 너비 (숫자 입력 시 px, 문자열 입력 시 CSS 단위 적용) */
  width?: string | number;

  /** 세로 높이 (숫자 입력 시 px, 미지정 시 variant 기본 높이 적용) */
  height?: string | number;

  /** 연속으로 반복 렌더링할 스켈레톤 블록 개수 (기본값: 1) */
  count?: number;
}

/**
 * @description [Badge.tsx] ark.span(HTMLArkProps<'span'>)을 기본 상속하는 상태·출처 표시 배지 Props
 */
export interface BadgeProps extends HTMLArkProps<'span'> {
  /** 배지의 의미론적 색상 톤 (기본값: 'neutral') */
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

/**
 * @description [Splitter.tsx] 개별 분할 패널 설정 및 콘텐츠 항목 인터페이스
 */
export interface SplitterPanelItem {
  /** 패널 고유 식별자 (예: 'products', 'cart') */
  id: string;

  /** 패널 내부에 렌더링할 콘텐츠 노드 */
  content: ReactNode;

  /** 최소 크기 비율 (0~100%, 선택적) */
  minSize?: number;

  /** 최대 크기 비율 (0~100%, 선택적) */
  maxSize?: number;

  /** 패널 접기 허용 여부 (선택적) */
  collapsible?: boolean;

  /** 접혔을 때 유지할 최소 비율 (선택적) */
  collapsedSize?: number;
}

/**
 * @description [Splitter.tsx] ArkSplitter.RootProps를 Omit으로 기본 상속하고 패널 콘텐츠 배열을 선언형으로 받는 Props
 */
export interface SplitterProps extends Omit<ArkSplitter.RootProps, 'panels' | 'children'> {
  /** 분할 렌더링할 패널 메타데이터 및 콘텐츠 배열 (2개 이상) */
  panels: SplitterPanelItem[];
}

/**
 * @description [Tabs.tsx] 개별 탭 항목 정의 인터페이스
 */
export interface TabItem {
  /** 탭 고유 식별자 값 */
  value: string;

  /** 탭 트리거 버튼에 표시할 제목 */
  label: ReactNode;

  /** 탭 활성화 시 표시할 패널 본문 */
  content: ReactNode;

  /** 개별 탭 비활성화 여부 (선택적) */
  disabled?: boolean;
}

/**
 * @description [Tabs.tsx] ArkTabs.RootProps를 Omit으로 기본 상속하고 단일 문자열 onChange 콜백을 제공하는 Props
 */
export interface TabsProps
  extends Omit<ArkTabs.RootProps, 'onValueChange' | 'onChange' | 'children'> {
  /** 렌더링할 탭 목록 배열 */
  items: TabItem[];

  /** 탭 전환 시 선택된 탭의 문자열 value만 전달하는 편의 콜백 (선택적) */
  onChange?: (nextValue: string) => void;
}

/**
 * @description [Collapsible.tsx] ArkCollapsible.RootProps를 Omit으로 기본 상속하고 boolean onOpenChange 콜백을 제공하는 Props
 */
export interface CollapsibleProps
  extends Omit<ArkCollapsible.RootProps, 'title' | 'onOpenChange'> {
  /** 상단 열기/닫기 트리거 버튼에 표시할 제목 노드 */
  title: ReactNode;

  /** 펼쳐졌을 때 표시할 본문 콘텐츠 */
  children: ReactNode;

  /** 펼침 상태 변경 시 boolean(details.open) 값만 전달하는 편의 콜백 (선택적) */
  onOpenChange?: (open: boolean) => void;
}
```

*(정적 레이아웃 5종 `Container.tsx`, `Grid.tsx`, `Flex.tsx`, `Stack.tsx`, `Card.tsx` 역시 모두 `HTMLArkProps<'div'>`를 기본 상속하며 각 레이아웃 전용 속성에 `/** ... */` 주석을 부여합니다.)*

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`shared` 전용)

- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared` — `vite.config.ts`)**:
  - **컨테이너 이름 (`name`)**: `'remote_shared'` (`filename: 'remoteEntry.js'`, `manifest: true`)
  - **노출 모듈 (`exposes`)**:
    - `'./ui': './src/exposed/ui.ts'`
    - `'./theme': './src/exposed/theme.ts'`
    - `'./utils': './src/exposed/utils.ts'`
  - **소비 모듈 (`remotes`)**: `없음 ({})`
  - **공유 의존성 (`shared` & `singleton`)**: `react`, `react-dom`, `@tanstack/react-query` (`singleton: true`, 카탈로그 버전 연동)
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**:
  - `src/main.ts`(`import('./bootstrap')`) + `src/bootstrap.tsx`(`<ThemeProvider><App /></ThemeProvider>`) 2단 분리로 `http://localhost:3004` 단독 쇼케이스를 제공하며, 노출 모듈(`./ui`, `./theme`, `./utils`)은 부트스트랩을 실행하지 않아 호스트 결합 시 부작용이 없습니다.
- **타 서비스(호스트·도메인 리모트) 소비 규칙의 `docs/service-registry.md` 명문화 계획**:
  - 다른 서비스(`products`, `cart`, `host-vite`, `host-rspack`) 구현 시 에이전트와 개발자가 즉시 규칙을 확인할 수 있도록 머지 시점에 [`docs/service-registry.md`](../../../../../docs/service-registry.md) `§ 4`에 다음 5대 소비 규칙과 전체 노출 시그니처를 상세 기록합니다:
    1. `@ark-ui/react`, `clsx` 개별 앱 설치 금지 → `remote_shared/ui` 단일 창구 사용 (단, `RemoteErrorBoundary` 폴백만 자체 스타일 작성)
    2. 수동 `window.addEventListener` 금지 → `remote_shared/utils`의 `useMfeEvent` 및 `mfeEventBus` 사용
    3. 직접 `window.localStorage` 접근 금지 → `createScopedStorage('<scopeId>')` 사용
    4. 색상 `#hex` 및 임의 `z-index` 숫자 하드코딩 금지 → `remote_shared/theme`의 `var(--mfe-*)` 및 `Z_INDEX_TOKENS` 사용
    5. 상태 동기화 비교 모드 전환 시 `Mode A`는 자체 `QueryClient` + `mfeEventBus`, `Mode B`는 `remote_shared/utils`의 싱글톤 `sharedQueryClient` + `CART_QUERY_KEY` 사용

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)

- **적용 여부**: `N/A (해당 없음 — 프론트엔드 원격 공통 모듈 작업으로 백엔드 DB/SQL 수정 없음)`
