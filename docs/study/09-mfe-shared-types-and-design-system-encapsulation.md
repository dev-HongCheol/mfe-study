# 📒 Study 09. MFE 원격 타입(`@mf-types`) 전이 의존성과 디자인 시스템 경계 캡슐화

> **문서 목적**: `remote-products` 구축 과정에서 등장한 `src/vite-env.d.ts`의 정확한 역할과 `tsconfig.json`의 `.d.ts` 로드 규약을 이해하고, `Splitter` 컴포넌트를 사례로 **하위 공통 모듈(`remote-shared`)의 서드파티 타입(`@ark-ui/react`) 누출이 왜 소비자 앱의 타입 Shim을 유발했는지**, 그리고 이를 해결하기 위한 **실무·엔터프라이즈 아키텍처 대안과 `extractThirdParty` 옵션의 한계**를 정리한 학습 가이드입니다.

---

## 📊 한눈에 보는 핵심 요약

| 핵심 질문 | 핵심 결론 |
| :--- | :--- |
| **`vite-env.d.ts`는 환경변수(`import.meta.env`) 전용 파일인가요?** | **아니요.** Vite 실행 환경(Environment)의 전역 타입과 TypeScript 앰비언트 모듈 선언(`declare module`)을 두는 일반 `.d.ts` 파일입니다. |
| **`.d.ts` 파일은 프로젝트 아무 곳에나 두어도 자동 로드되나요?** | **아니요.** `tsconfig.json`의 `include` 범위(예: `"src"`) 안에 있어야 하며, 파일 최상단에 `import`/`export`가 없어야 전역으로 자동 인식됩니다. |
| **왜 `remote-shared`에 정의한 `Splitter` 때문에 `remote-products`에 별도 타입을 적었나요?** | `remote-shared`가 내보낸 `Splitter.d.ts` 안에 `import ... from '@ark-ui/react/splitter'`가 남아 있는데, `@ark-ui/react`가 없는 `remote-products`가 이를 읽지 못해 **임시 Shim(호환 껍데기)**을 두었기 때문입니다. |
| **가장 깔끔한 해결책은 무엇인가요?** | `remote-shared`가 외부에 공개하는 `Props`에서 `@ark-ui/react` 상속을 제거하고 **`React.ComponentPropsWithoutRef` + 허용 속성만 명시**해 경계를 캡슐화하는 것입니다. |

---

## Part 1. `vite-env.d.ts`와 TypeScript `.d.ts` 로드 규약

### 1.1 `vite-env.d.ts`의 진짜 역할
- 파일명에서 `env`는 환경변수(`import.meta.env`)만을 뜻하는 것이 아니라 **Vite 실행 환경 전체의 타입**을 의미합니다.
- `/// <reference types="vite/client" />` 한 줄이 Vite 기본 템플릿 표준 코드이며, 이를 통해 `.css`/`.svg` import, `import.meta.env`, `import.meta.hot` 같은 Vite 전용 전역 타입을 인식합니다.
- 여기에 `declare module '...'`를 작성한다고 해서 환경변수에 등록되는 것은 아니며, **컴파일 타임(`tsc`)에 특정 모듈의 타입을 전역으로 알려주는 역할**만 합니다. (런타임 번들 크기 `0B`)

### 1.2 `.d.ts` 파일의 자동 로드 조건과 함정
1. **`tsconfig.json`의 `include` 범위 필수**:
   - `include: ["src", ...]`가 설정되어 있으면 `src/` 하위 어디에 `.d.ts`를 두어도 `import` 없이 자동 로드됩니다.
   - `include` 밖의 디렉터리에 두면 TypeScript가 무시합니다.
2. **최상단(Top-level) `import` / `export` 금지 함정**:
   - `.d.ts` 파일 맨 위에 `import` 또는 `export`를 적으면 TypeScript가 해당 파일을 **일반 모듈(로컬 스코프)**로 취급해 전역 자동 적용이 깨집니다.
   - 따라서 전역 모듈 선언 파일에서는 `import type`을 파일 최상단이 아니라 `declare module '...' { ... }` 블록 **내부**에 배치하거나 `declare global { ... }`을 사용해야 합니다.

---

## Part 2. `Splitter` 사례로 보는 `@mf-types` 타입 누출과 Shim

### 2.1 문제 발생 메커니즘
1. **공급자 (`remote-shared`)의 타입 노출**:
   - `apps/remote-shared/src/features/ui/layouts/Splitter.tsx`에서 `SplitterProps`가 `@ark-ui/react/splitter`의 `ArkSplitter.RootProps`를 직접 상속합니다.
   - Module Federation(`dts`)이 생성해 전달한 `@mf-types/.../Splitter.d.ts` 안에도 외부 패키지 import가 그대로 남습니다.
     ```ts
     // @mf-types/remote_shared/.../Splitter.d.ts (자동 생성 결과)
     import { Splitter as ArkSplitter } from '@ark-ui/react/splitter';

     export interface SplitterProps extends Omit<ArkSplitter.RootProps, 'panels' | 'children'> {
       panels: SplitterPanelItem[];
     }
     ```
2. **소비자 (`remote-products`)의 해석 실패**:
   - 아키텍처 원칙상 `remote-products`에는 `@ark-ui/react`를 설치하지 않습니다.
   - 따라서 `tsc --noEmit` 실행 시 `Splitter.d.ts`가 요구하는 `@ark-ui/react/splitter`를 `node_modules`에서 찾지 못해 `SplitterProps`, `ButtonProps`, `SelectProps` 등의 기본 속성 추론이 깨집니다.
3. **임시 우회 — Shim(심) 배치**:
   - **Shim**은 서로 맞지 않는 두 인터페이스 사이를 메우는 얇은 호환 껍데기 코드를 뜻합니다.
   - `apps/remote-products/src/vite-env.d.ts`에 `declare module '@ark-ui/react/splitter'` 등을 선언해 React 표준 `ComponentPropsWithoutRef`로 연결해 둔 것이 바로 타입 Shim입니다.

### 2.2 왜 소비자 앱에 타입 Shim을 두는 패턴이 좋지 않은가요?
- **추상화 누출(Leaky Abstraction)**: 하위 공통 레이어(`remote-shared`)가 내부에서 사용하는 UI 라이브러리(`Ark UI`) 세부가 상위 소비자 앱의 계약까지 새어 나와, 소비자가 내부 구현 라이브러리를 알아야 하는 모순이 생깁니다.
- **중복 유지보수**: `remote-shared`가 props를 추가·변경할 때마다 모든 소비자 앱(`remote-products`, `remote-cart`, `host-vite`, `host-rspack`)의 `vite-env.d.ts`를 일일이 동기화해야 합니다.

---

## Part 3. 실무·대기업 아키텍처 대안 비교 및 `extractThirdParty` 검토

### 3.1 `dts.generateTypes.extractThirdParty` 옵션과 실전 한계
Module Federation 2.0(`@module-federation/dts-plugin`)에는 원격 앱이 참조하는 서드파티 타입을 `@mf-types`에 함께 추출해 주는 공식 옵션이 존재합니다.

```ts
dts: {
  generateTypes: {
    extractThirdParty: {
      exclude: ['react', 'react-dom'], // 싱글톤 공유 패키지는 충돌 방지를 위해 제외
    },
  },
}
```

하지만 우리 프로젝트와 같은 환경에서는 아래 주의점이 있습니다.
1. **순수 ESM(`"type": "module"`) 프로젝트 버그(GitHub Issue `#5007`)**:
   - 내부 추출기(`@module-federation/third-party-dts-extractor`)가 `require.resolve()`를 호출하다 ESM 환경에서 실패하며, 내부 `try/catch`가 에러를 조용히 삼켜 빌드 성공 로그가 뜨는데도 서드파티 타입 추출이 누락되는 이슈가 보고되어 있습니다.
2. **`pnpm` 심볼릭 링크 + 다중 서브패스 패키지 무게**:
   - `@ark-ui/react/select`, `@ark-ui/react/splitter` 등 서브패스 exports와 내부 `@zag-js/*` 전이 의존성 전체를 `@mf-types.zip`으로 떠넘기게 됩니다.
3. **근본 해결 여부**:
   - `extractThirdParty`는 외부 라이브러리 타입이 밖으로 새어나가는 구조를 유지한 채 파일만 복사하는 접근이므로, 디자인 시스템 계약을 깔끔하게 유지하려면 공급자 경계 자체를 캡슐화하는 편이 유리합니다.

### 3.2 엔터프라이즈·실무 3가지 방안 비교

| 구분 | 방안 A: `remote-shared` 순수 React 타입 캡슐화 | 방안 B: 각 소비자 앱에 `@ark-ui/react` 설치 | 방안 C: 대기업 실무 정석 (코어 DS는 npm + 도메인만 MF) |
| :--- | :--- | :--- | :--- |
| **구현 방식** | 내부 구현은 `Ark UI`, 외부 `Props`는 **`ComponentPropsWithoutRef` + 허용 속성만 명시** | 소비자 `devDependencies`에 `@ark-ui/react` 직접 설치 | 버튼/셀렉트 등 코어 디자인 시스템은 **Private npm 패키지**로 배포하고, 도메인 앱만 MF로 공유 |
| **소비자 Shim** | **불필요 (0줄)** | **불필요 (0줄)** | **불필요 (0줄)** |
| **캡슐화 / 유지보수** | **최상.** 내부 UI 라이브러리 교체 시에도 소비자 타입 계약 불변 | **낮음.** 소비자가 내부 UI 라이브러리 버전에 종속 | **최상.** 앱별 버전 업그레이드 통제 및 Tree-shaking 완벽 지원 |
| **우리 프로젝트 적합도** | **가장 적합** (`remote-shared`까지 MF로 분리하는 학습 목표 유지 + Shim 완전 제거) | 비추천 (소비자 앱이 `@ark-ui/react`를 직접 import할 위험) | 참고용 (실무 프로덕션에서 "분산 모놀리스"를 피하기 위해 채택하는 표준 패턴) |

---

## Part 4. 향후 개선 로드맵 (`shared` → `products`)

1. **`remote-shared` (`shared` 스코프)**:
   - `apps/remote-shared/src/features/ui/` 컴포넌트들의 노출 `Props`가 `@ark-ui/react`를 직접 상속하지 않고 `ComponentPropsWithoutRef` 기반의 명시적 계약으로 전환 (`GEMINI.md` 관련 규칙 조정 포함).
   - `remote-products`의 실제 사용처를 점검한 결과, `remote-products`는 이미 `remote-shared`가 직접 정의한 커스텀 Props와 표준 HTML 속성만 사용하고 있어 UI/비즈니스 로직 수정 영향도는 `0건`입니다.
2. **`remote-products` (`products` 스코프)**:
   - 갱신된 `@mf-types` 반영 후 `apps/remote-products/src/vite-env.d.ts`의 `declare module '@ark-ui/react/...'` 블록(10~89행)을 완전히 제거하고 `typecheck` · `build` · `test`를 검증합니다.
