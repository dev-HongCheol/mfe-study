# 📐 [기획 및 설계] `remote-shared/ui` 노출 Props 경계 캡슐화 및 Step 1.2 후속 정리 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 캡슐화, 추상화 누출 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `exposes`, `remotes`, `Ark UI`, `ComponentPropsWithoutRef`, `@mf-types` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261119-ui-prop-encapsulation` |
| **서비스 스코프 (`Scope ID`)** | `shared` (`apps/remote-shared`, `Port 3004`) |
| **작업 브랜치** | `shared/refactor/ui-prop-encapsulation` (패턴 A) |
| **기술 스택 / 번들러** | `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite + @ark-ui/react v5 + clsx + Vitest` |
| **작성일** | `2026-11-19` |
| **작업 규모 평가** | `적정 (단일 PR)` — UI 13종 Props 경계 캡슐화 + Step 1.2 후속 정리(`disableDynamicRemoteTypeHints`, `.js` 확장자 일괄 제거) + `GEMINI.md` 규칙 현행화를 단일 `shared` PR로 일괄 처리 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- **배경 1 — `@ark-ui/react` 서드파티 타입 누출 해소 ([Study 09](../../../../../docs/study/09-mfe-shared-types-and-design-system-encapsulation.md))**:
  - 기존 `remote-shared/ui`의 13종 컴포넌트는 `HTMLArkProps<*>` 또는 `Ark*.RootProps`를 외부 `Props` 인터페이스에서 직접 상속했습니다.
  - 그 결과 Module Federation 2.0이 생성한 `@mf-types/remote_shared/**/*.d.ts` 내부에 `import ... from '@ark-ui/react/...'` 문이 그대로 남아, `@ark-ui/react`를 직접 설치하지 않는 소비자 앱(`remote-products`)이 정적 타입 검사를 통과하기 위해 `src/vite-env.d.ts`에 80줄 분량의 임시 타입 Shim을 작성해야 하는 **추상화 누출(Leaky Abstraction)** 문제가 발생했습니다.
  - 향후 구축할 3개 소비자 앱(`remote-cart`, `host-vite`, `host-rspack`)에서 동일한 임시 Shim을 중복 복제하지 않도록, 지금 공급자(`remote-shared`) 경계에서 노출 `Props`를 순수 React 표준 타입(`React.ComponentPropsWithoutRef`)과 허용된 명시 속성으로 완전히 캡슐화합니다.
- **배경 2 — Step 1.2 후속 정리 일괄 완료**:
  - `remote-shared`의 `vite.config.ts`에 `dev: { disableDynamicRemoteTypeHints: true }`를 추가하여 소비자 앱(`remote-products` 등) `pnpm dev` 실행 시 브라우저 콘솔에 반복 출력되던 `ws://127.0.0.1:16322` 동적 타입 힌트 WebSocket 연결 에러를 근본 차단합니다.
  - `apps/remote-shared/src/**` 내부의 상대 경로 import 28개 파일에서 `.js` 확장자를 일괄 제거하여 프론트엔드 번들러 표준([Study 04 #01](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md))과 `remote-products` 간 코드 스타일을 통일합니다.
- **배경 3 — 프로젝트 헌법(`GEMINI.md`) 규칙 현행화**:
  - 기존 [GEMINI.md](../../../../../GEMINI.md) 3조 3항의 `Ark UI` 래핑 규칙을 "내부 구현은 `Ark UI` 캡슐화, 외부 노출 `Props`는 순수 `React.ComponentPropsWithoutRef` 기반 + 허용 속성 명시(`@ark-ui/react` 타입 누출 금지)"로 갱신하여 아키텍처 원칙과 구현을 일치시킵니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **디자인 시스템 경계 캡슐화(Anti-Corruption Layer)와 무-Shim 소비 보장 ([Study 09](../../../../../docs/study/09-mfe-shared-types-and-design-system-encapsulation.md))**:
  - 내부 구현은 여전히 `@ark-ui/react`(`ark.*`, `ArkSelect`, `ArkSplitter`, `ArkTabs`, `ArkCollapsible`)가 제공하는 접근성(WAI-ARIA)·키보드 내비게이션·포털 레이어를 100% 활용하되, 외부 계약(`.d.ts`)에는 오직 `react`의 표준 타입(`ComponentPropsWithoutRef`, `ReactNode`)과 순수 TypeScript 유니온·콜백만 노출합니다.
  - 이를 통해 `remote-shared`가 빌드하는 `dist/@mf-types/**/*.d.ts` 전 파일에서 `@ark-ui/react` import가 **`0건`**이 되어, 모든 소비자 앱이 `@ark-ui/react` 설치나 `vite-env.d.ts` Shim 없이 `tsc --noEmit`을 100% 통과합니다.
- **공급자(`remote-shared`) 측 동적 타입 힌트 WebSocket 차단과 `@mf-types.zip` 서빙 양립 ([Study 04 #04](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md))**:
  - `@module-federation/vite`의 `dev.disableDynamicRemoteTypeHints: true`는 브라우저에 주입되는 런타임 WebSocket 힌트 플러그인만 비활성화하고, `disableHotTypesReload: false`(기본값)로 유지되는 개발 서버의 `@mf-types.zip` 생성·서빙 미들웨어는 그대로 유지함을 공식 스펙으로 확인하고 적용합니다.

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**: [Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)](../../../../../docs/features/20261027-phase1-service-contracts/01-plan-and-design.md), [서비스 레지스트리 (`service-registry.md`)](../../../../../docs/service-registry.md), [Study 09 (`09-mfe-shared-types-and-design-system-encapsulation.md`)](../../../../../docs/study/09-mfe-shared-types-and-design-system-encapsulation.md)
- **참조 항목(섹션 제목)**:
  - `§ 5.3.1 remote_shared/ui 노출 컴포넌트 및 레이아웃 인터페이스` *(기존 루트 계약 정본은 이미 `@ark-ui/react` 타입 상속을 요구하지 않는 개념적 계약으로 정의되어 있어 루트 SSOT 계약 변경 없이 100% 하위 호환됨)*
  - `service-registry.md § 4.2 Module Federation 노출(exposes) 3대 서브패스 시그니처 요약` *(5단계-C 머지 직전 `HTMLArkProps` / `Ark*.RootProps` 표기를 `ComponentPropsWithoutRef` 경계 캡슐화 표기로 갱신 예정)*
  - `Study 09 Part 4. 향후 개선 로드맵 (shared -> products)` *(본 작업 완료·머지 후 후속 `products` 브랜치에서 `remote-products/src/vite-env.d.ts` 임시 Shim 제거)*

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP & 설치 패키지 타입 교차 검증) — `[공통 필수]`
- **조회 대상 라이브러리**: `@ark-ui/react` (`v5.40.0`, Context7 `/websites/ark-ui` + 설치된 `node_modules/@ark-ui/react/dist/**/*.d.ts`), `@module-federation/vite` (`v1.23.7`, Context7 `/module-federation/vite`)
- **핵심 스펙 및 주의사항**:
  1. **`@ark-ui/react` v5.40.0 `HTMLArkProps<T>` 내부 구조**:
     - `factory.d.ts` 확인 결과 `export type HTMLProps<T> = ComponentPropsWithoutRef<T>` 및 `export type HTMLArkProps<T> = HTMLProps<T> & PolymorphicProps({ asChild?: boolean })`로 정의되어 있습니다.
     - 따라서 기본·정적 레이아웃 9종(`Button`, `Badge`, `Heading`, `Skeleton`, `Card`, `Container`, `Flex`, `Grid`, `Stack`)의 노출 `Props`를 `ComponentPropsWithoutRef<T>`로 전환해도 내부 `ark.button` / `ark.span` / `ark.h1~h5` / `ark.div`에 `{...restProps}` 전달 시 100% 타입 호환되며, 모든 소비자 앱(`remote-products` 등)에서 사용 중인 표준 HTML·ARIA·`data-*` 속성이 깨지지 않습니다.
  2. **`@ark-ui/react` v5.40.0 인터랙티브 4종(`Select`, `Splitter`, `Tabs`, `Collapsible`) `RootProps` 및 HTML 속성 충돌 방어**:
     - `Select.RootProps`: `Assign<HTMLProps<'div'>, UseSelectProps<T> & UsePresenceProps & PolymorphicProps>`. 표준 `div` 속성 중 `defaultValue`, `onChange`, `onSelect`, `dir`, `children`은 `ArkSelect.Root`와 충돌할 수 있으므로 `Omit` 처리하고, 소비자용 제어/폼 속성(`disabled`, `readOnly`, `required`, `invalid`, `name`, `closeOnSelect`, `lazyMount`, `unmountOnExit`)을 순수 boolean/string 타입으로 명시합니다.
     - `Splitter.RootProps`: `Assign<HTMLProps<'div'>, UseSplitterProps & PolymorphicProps>`. 표준 `div`의 `onResize`, `dir`, `children`을 `Omit` 처리하고, `defaultSize?: number[]`, `size?: number[]`, `orientation?: 'horizontal' | 'vertical'`, `onResize?: (size: number[]) => void`를 명시 노출합니다 (`ArkSplitter.Root`에는 `onResize={(details) => onResize?.(details.size)}`로 브릿징하여 `@zag-js/splitter`의 `ResizeDetails` 타입 누출을 원천 차단).
     - `Tabs.RootProps`: `Assign<HTMLProps<'div'>, UseTabsProps & RenderStrategyProps & PolymorphicProps>`. 표준 `div`의 `defaultValue`, `onChange`, `dir`, `children`을 `Omit` 처리하고, `value?: string`, `defaultValue?: string`, `orientation?: 'horizontal' | 'vertical'`, `lazyMount?: boolean`, `unmountOnExit?: boolean`을 명시 노출합니다.
     - `Collapsible.RootProps`: `HTMLProps<'div'> & UseCollapsibleProps & PolymorphicProps`. 표준 `div`의 `title`, `dir`, `children`을 `Omit` 처리하고, `open?: boolean`, `defaultOpen?: boolean`, `disabled?: boolean`, `lazyMount?: boolean`, `unmountOnExit?: boolean`을 명시 노출합니다.
  3. **`@module-federation/vite` `pluginDts` & `dev.disableDynamicRemoteTypeHints: true`**:
     - `DEFAULT_DEV_OPTIONS`는 `{ disableLiveReload: true, disableHotTypesReload: false, disableDynamicRemoteTypeHints: false }`입니다.
     - `dev: { disableDynamicRemoteTypeHints: true }` 설정 시 `config` 훅에서 `@module-federation/dts-plugin/dynamic-remote-type-hints-plugin` WebSocket 런타임 플러그인 등록만 건너뛰고, `configureServer`의 `@mf-types.zip` 서빙 미들웨어와 `DevWorker`는 그대로 유지됩니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> 승인된 작업 스코프(`.agents/active-scope.json`: `shared`) 및 전역 허용 루트 문서(`GEMINI.md`, `todo.md`, `docs/service-registry.md`) 내에서 변경될 파일 목록입니다.

| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 (서비스 루트 기준 / 루트 파일은 루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `docs/features/20261119-ui-prop-encapsulation/01-plan-and-design.md` | 본 1단계 기획 및 상세 설계 문서 |
| `NEW` | `docs/features/20261119-ui-prop-encapsulation/02-tdd-spec.md` | *(2단계 작성 예정)* 단위·통합 및 `@mf-types` 무누출 TDD 명세서 |
| `NEW` | `docs/features/20261119-ui-prop-encapsulation/03-code-review.md` | *(5단계-A 작성 예정)* PR 생성 전 심층 코드 리뷰서 |
| `MOD` | `docs/todo.md` | `20261119-ui-prop-encapsulation` 진행 중 등록 및 머지 직전 완료 이관 |
| `MOD` | `vite.config.ts` | `federation({ ... })` 옵션에 `dev: { disableDynamicRemoteTypeHints: true }` 추가 |
| `MOD` | `src/features/ui/components/Badge.tsx` | `HTMLArkProps<'span'>` → `ComponentPropsWithoutRef<'span'>` 전환 및 주석 동기화 |
| `MOD` | `src/features/ui/components/Button.tsx` | `HTMLArkProps<'button'>` → `ComponentPropsWithoutRef<'button'>` 전환 및 주석 동기화 |
| `MOD` | `src/features/ui/components/Heading.tsx` | `HTMLArkProps<'h1'>` → `ComponentPropsWithoutRef<'h1'>` 전환 및 주석 동기화 |
| `MOD` | `src/features/ui/components/Skeleton.tsx` | `HTMLArkProps<'div'>` → `ComponentPropsWithoutRef<'div'>` 전환 및 주석 동기화 |
| `MOD` | `src/features/ui/components/Select.tsx` | `ArkSelect.RootProps` 상속 제거 → `ComponentPropsWithoutRef<'div'>` 기반 캡슐화 Props 전환 |
| `MOD` | `src/features/ui/layouts/Card.tsx` | `HTMLArkProps<'div'>` → `ComponentPropsWithoutRef<'div'>` 전환 및 주석 동기화 |
| `MOD` | `src/features/ui/layouts/Container.tsx` | `HTMLArkProps<'div'>` → `ComponentPropsWithoutRef<'div'>` 전환 및 주석 동기화 |
| `MOD` | `src/features/ui/layouts/Flex.tsx` | `HTMLArkProps<'div'>` → `ComponentPropsWithoutRef<'div'>` 전환 및 주석 동기화 |
| `MOD` | `src/features/ui/layouts/Grid.tsx` | `HTMLArkProps<'div'>` → `ComponentPropsWithoutRef<'div'>` 전환 및 주석 동기화 |
| `MOD` | `src/features/ui/layouts/Stack.tsx` | `HTMLArkProps<'div'>` → `ComponentPropsWithoutRef<'div'>` 전환 및 주석 동기화 |
| `MOD` | `src/features/ui/layouts/Splitter.tsx` | `ArkSplitter.RootProps` 상속 제거 → `ComponentPropsWithoutRef<'div'>` + 명시 속성(`defaultSize`, `size`, `orientation`, `onResize`) 전환 |
| `MOD` | `src/features/ui/layouts/Tabs.tsx` | `ArkTabs.RootProps` 상속 제거 → `ComponentPropsWithoutRef<'div'>` + 명시 속성(`value`, `defaultValue`, `orientation`, `lazyMount`, `unmountOnExit`) 전환 |
| `MOD` | `src/features/ui/layouts/Collapsible.tsx` | `ArkCollapsible.RootProps` 상속 제거 → `ComponentPropsWithoutRef<'div'>` + 명시 속성(`open`, `defaultOpen`, `disabled`, `lazyMount`, `unmountOnExit`) 전환 |
| `MOD` | `src/**` 내부 상대 경로 `.js` 확장자 보유 28개 파일 (`exposed/*.ts`, `App.tsx`, `bootstrap.tsx`, `main.ts`, `features/**`, `__tests__/SharedShowcase.integration.test.tsx`) | 상대 경로 import에서 `.js` 확장자 전수 제거 (`Study 04 #01` 표준 통일) |
| `MOD` | `src/features/ui/{components,layouts}/*.test.tsx` 및 `src/__tests__/SharedShowcase.integration.test.tsx` | 캡슐화 명시 Props 동작 검증(`Select` disabled, `Tabs` lazyMount/value, `Collapsible` defaultOpen/disabled, `Splitter` orientation/onResize) + `disableDynamicRemoteTypeHints`·`.js` 확장자 0건·UI Props `@ark-ui/react` 무누출 정적 검증 테스트 추가 |
| `MOD` | `(루트) GEMINI.md` | 3조 3항 `Ark UI` 래핑 규칙을 `ComponentPropsWithoutRef` 기반 경계 캡슐화(`@ark-ui/react` 타입 누출 금지)로 현행화 |
| `MOD` | `(루트) todo.md` & `docs/service-registry.md` | **(5단계-C 머지 직전 필수 갱신)** Step 1.2 후속 정리 및 `remote-shared/ui` 캡슐화 완료 반영 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript`) — `[공통 필수]`
> 모든 노출 컴포넌트의 `Props`는 오직 `react` 표준 타입(`ComponentPropsWithoutRef`, `ReactNode`)과 순수 TypeScript 타입만 참조하며, `@ark-ui/react` 타입은 컴포넌트 구현부 내부로 100% 은닉합니다. 모든 인터페이스 속성에는 `/** ... */` 한글 설명 주석을 필수로 유지합니다.

### 5.1 기본 4종 및 정적 레이아웃 5종 (`HTMLArkProps<*>` → `ComponentPropsWithoutRef<*>`)

```ts
import type { ComponentPropsWithoutRef } from 'react';

/**
 * @description [Button.tsx] 표준 button 속성을 상속하고 로딩 잠금 및 시각 변형을 제공하는 버튼 Props
 */
export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  /** 버튼의 시각적 강조 스타일 변형 (기본값: 'primary') */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';

  /** 버튼 패딩 및 폰트 크기 규격 (기본값: 'md') */
  size?: 'sm' | 'md' | 'lg';

  /** 비동기 요청 진행 중 여부 (true일 때 disabled 및 aria-busy 자동 활성화 — Study 05 #01, #15) */
  isLoading?: boolean;

  /** 가로 너비 100% 확장 여부 (기본값: false) */
  fullWidth?: boolean;
}

/**
 * @description [Badge.tsx] 표준 span 속성을 상속하는 상태·출처 표시 배지 Props
 */
export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  /** 배지의 의미론적 색상 톤 (기본값: 'neutral') */
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

/**
 * @description [Heading.tsx] 표준 h1 속성을 상속하고 시맨틱 제목 레벨(1~5)을 렌더링하는 Props
 */
export interface HeadingProps extends ComponentPropsWithoutRef<'h1'> {
  /** 렌더링할 시맨틱 제목 레벨 (1 ~ 5, 기본값: 2) */
  level?: 1 | 2 | 3 | 4 | 5;
}

/**
 * @description [Skeleton.tsx] 표준 div 속성을 상속하고 CLS 방지 프리셋 및 반복 렌더링(count)을 지원하는 Props
 */
export interface SkeletonProps extends ComponentPropsWithoutRef<'div'> {
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
 * @description [Card.tsx] 표준 div 속성을 상속하는 카드 서피스 레이아웃 Props
 */
export interface CardProps extends ComponentPropsWithoutRef<'div'> {
  /** 내부 패딩 프리셋 ('sm' | 'md' | 'lg', 기본값: 'md') */
  padding?: 'sm' | 'md' | 'lg';

  /** 입체 그림자 강조 여부 (기본값: false) */
  elevated?: boolean;
}

/**
 * @description [Container.tsx] 표준 div 속성을 상속하는 페이지/섹션 컨테이너 Props
 */
export interface ContainerProps extends ComponentPropsWithoutRef<'div'> {
  /** 최대 가로 너비 프리셋 ('sm' | 'md' | 'lg' | 'xl' | 'full', 기본값: 'xl') */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * @description [Flex.tsx] 표준 div 속성을 상속하는 플렉스 레이아웃 Props
 */
export interface FlexProps extends ComponentPropsWithoutRef<'div'> {
  /** 플렉스 주축 방향 (기본값: 'row') */
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';

  /** 교차축 정렬 방식 */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';

  /** 주축 정렬 방식 */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';

  /** 자식 요소 간격 프리셋 또는 CSS 길이 문자열 (기본값: 'sm') */
  gap?: 'sm' | 'md' | 'lg' | string;

  /** 줄바꿈 허용 여부 */
  wrap?: 'nowrap' | 'wrap';
}

/**
 * @description [Grid.tsx] 표준 div 속성을 상속하는 그리드 레이아웃 Props
 */
export interface GridProps extends ComponentPropsWithoutRef<'div'> {
  /** 그리드 열 개수(숫자 입력 시 repeat(N, minmax(0, 1fr))) 또는 커스텀 gridTemplateColumns 문자열 (기본값: 2) */
  columns?: number | string;

  /** 그리드 셀 간격 프리셋 또는 CSS 길이 문자열 (기본값: 'md') */
  gap?: 'sm' | 'md' | 'lg' | string;
}

/**
 * @description [Stack.tsx] 표준 div 속성을 상속하는 수직 스택 레이아웃 Props
 */
export interface StackProps extends ComponentPropsWithoutRef<'div'> {
  /** 수직 자식 요소 간격 프리셋 또는 CSS 길이 문자열 (기본값: 'md') */
  gap?: 'sm' | 'md' | 'lg' | string;
}
```

### 5.2 인터랙티브 4종 (`Ark*.RootProps` → `ComponentPropsWithoutRef<'div'>` + 명시 허용 속성)

```ts
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * @description [Select.tsx] 표준 div 속성(충돌 속성 제외) 기반의 경계 캡슐화 드롭다운 Props
 */
export interface SelectProps
  extends Omit<
    ComponentPropsWithoutRef<'div'>,
    'defaultValue' | 'onChange' | 'onSelect' | 'children' | 'dir'
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

  /** 네이티브 폼 제출 시 사용할 hidden select 필드 이름 (선택적) */
  name?: string;

  /** 드롭다운 전체 비활성화 여부 (선택적) */
  disabled?: boolean;

  /** 읽기 전용 여부 (선택적) */
  readOnly?: boolean;

  /** 필수 입력 여부 (선택적) */
  required?: boolean;

  /** 유효성 검사 오류 상태 표시 여부 (선택적) */
  invalid?: boolean;

  /** 항목 선택 후 드롭다운 자동 닫힘 여부 (기본값: true) */
  closeOnSelect?: boolean;

  /** 드롭다운 콘텐츠 최초 열림 시 지연 마운트 여부 (선택적) */
  lazyMount?: boolean;

  /** 드롭다운 닫힘 시 콘텐츠 언마운트 여부 (선택적) */
  unmountOnExit?: boolean;
}

/**
 * @description [Splitter.tsx] 표준 div 속성(충돌 속성 제외) 기반의 경계 캡슐화 분할 레이아웃 Props
 */
export interface SplitterProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'dir' | 'onResize'> {
  /** 분할 렌더링할 패널 메타데이터 및 콘텐츠 배열 (2개 이상) */
  panels: SplitterPanelItem[];

  /** 초기 마운트 시 각 패널의 기본 크기 비율 배열 (예: [60, 40], 비제어 모드) */
  defaultSize?: number[];

  /** 외부 상태로 제어하는 각 패널의 크기 비율 배열 (제어 모드) */
  size?: number[];

  /** 분할 배치 방향 ('horizontal' | 'vertical', 기본값: 'horizontal') */
  orientation?: 'horizontal' | 'vertical';

  /** 패널 크기 변경 시 갱신된 숫자 비율 배열을 전달하는 편의 콜백 (선택적) */
  onResize?: (size: number[]) => void;
}

/**
 * @description [Tabs.tsx] 표준 div 속성(충돌 속성 제외) 기반의 경계 캡슐화 탭 레이아웃 Props
 */
export interface TabsProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'onChange' | 'children' | 'dir'> {
  /** 렌더링할 탭 목록 배열 */
  items: TabItem[];

  /** 외부 상태로 제어하는 현재 활성 탭 값 (제어 모드) */
  value?: string;

  /** 초기 활성 탭 값 (미지정 시 첫 번째 탭 활성화, 비제어 모드) */
  defaultValue?: string;

  /** 탭 전환 시 선택된 탭의 문자열 value만 전달하는 편의 콜백 (선택적) */
  onChange?: (nextValue: string) => void;

  /** 탭 목록 배치 방향 ('horizontal' | 'vertical', 기본값: 'horizontal') */
  orientation?: 'horizontal' | 'vertical';

  /** 탭 콘텐츠 최초 활성화 시 지연 마운트 여부 (선택적) */
  lazyMount?: boolean;

  /** 비활성화된 탭 콘텐츠 언마운트 여부 (선택적) */
  unmountOnExit?: boolean;
}

/**
 * @description [Collapsible.tsx] 표준 div 속성(충돌 속성 제외) 기반의 경계 캡슐화 접기/펴기 Props
 */
export interface CollapsibleProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'title' | 'children' | 'dir'> {
  /** 상단 열기/닫기 트리거 버튼에 표시할 제목 노드 */
  title: ReactNode;

  /** 펼쳐졌을 때 표시할 본문 콘텐츠 */
  children: ReactNode;

  /** 외부 상태로 제어하는 펼침 여부 (제어 모드) */
  open?: boolean;

  /** 초기 마운트 시 기본 펼침 여부 (비제어 모드) */
  defaultOpen?: boolean;

  /** 접기/펴기 토글 비활성화 여부 (선택적) */
  disabled?: boolean;

  /** 본문 콘텐츠 최초 펼침 시 지연 마운트 여부 (선택적) */
  lazyMount?: boolean;

  /** 접힘 완료 시 본문 콘텐츠 언마운트 여부 (선택적) */
  unmountOnExit?: boolean;

  /** 펼침 상태 변경 시 boolean(details.open) 값만 전달하는 편의 콜백 (선택적) */
  onOpenChange?: (open: boolean) => void;
}
```

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`shared` 전용)
- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared` / `dev` / `dts`)**:
  - **노출 모듈 (`exposes`)**: 기존 3대 서브패스 그대로 유지 (`'./ui': './src/exposed/ui.ts'`, `'./theme': './src/exposed/theme.ts'`, `'./utils': './src/exposed/utils.ts'`)
  - **소비 모듈 (`remotes`)**: `N/A` (최하위 공통 공급자)
  - **공유 의존성 (`shared` & `singleton`)**: `react`, `react-dom`, `@tanstack/react-query` 기존 싱글톤 유지
  - **개발 모드 WebSocket 힌트 비활성화 (`dev`)**: `vite.config.ts`에 `dev: { disableDynamicRemoteTypeHints: true }` 추가 및 `node_modules/.vite` 캐시 정리 (기존 `dts: { generateTypes: true, tsConfigPath: './tsconfig.json' }`는 그대로 유지하여 `@mf-types.zip` 실시간 생성·서빙 보장)
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**:
  - `App.tsx`, `bootstrap.tsx`, `main.ts`의 상대 경로 import에서 `.js` 확장자를 제거하고, 기존 단독 쇼케이스(`Port 3004`)의 모든 UI·테마·이벤트 동작은 100% 동일하게 유지합니다.
- **마이크로 앱 간 통신 및 상태 공유**:
  - `./utils` 및 `./theme`의 런타임 계약은 변경 없이 유지하고 내부 상대 경로 `.js` 확장자만 제거합니다.
- **공통 UI 컴포넌트 (`Ark UI`) 경계 캡슐화 및 `@mf-types` 무누출 보장 전략**:
  - 13종 컴포넌트 구현부 내부에서는 계속 `@ark-ui/react`(`ark.*`, `ArkSelect`, `ArkSplitter`, `ArkTabs`, `ArkCollapsible`, `Portal`)를 사용해 WAI-ARIA 접근성과 포털 드롭다운(`--mfe-z-dropdown`)을 유지합니다.
  - 외부 `export interface ...Props` 및 `vite build`로 출력되는 `dist/@mf-types/**/*.d.ts` 전 파일에서 `@ark-ui/react` import 및 타입 참조가 **`0건`**이 되도록 강제하여, 소비자 앱(`remote-products`, `remote-cart`, `host-vite`, `host-rspack`)이 타입 Shim 없이 순수 `@mf-types`만으로 정적 타입 검사를 통과하게 합니다.
  - `apps/remote-products/src/vite-env.d.ts`의 임시 Shim(10~89행) 제거는 물리적 멀티레포 스코프 격리 원칙(`verify-scope.mjs`)에 따라 본 `shared` PR 머지 직후 별도 `products` 브랜치(`products/chore/remove-ark-type-shim`)에서 후속 수행합니다.

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `N/A (해당 없음 — 최하위 프론트엔드 공통 모듈 스코프)`
