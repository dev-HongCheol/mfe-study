# 🔍 [코드 리뷰 및 품질·보안 검증서] `remote-shared/ui` 노출 Props 경계 캡슐화 및 Step 1.2 후속 정리 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어(호스트, 리모트, 컴포넌트, 캡슐화 등)와 범용 영문 키워드(`PR`, `TDD`, `MFE`, `Ark UI`, `@mf-types` 등)로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 라인 수 (`+ / -`) | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `apps/remote-shared/vite.config.ts` | `dev: { disableDynamicRemoteTypeHints: true }` 추가 | `MOD` | `+3 / -0` | `일치` |
| `apps/remote-shared/src/features/ui/components/{Badge,Button,Heading,Skeleton}.tsx` | `HTMLArkProps<*>` → `ComponentPropsWithoutRef<*>` 전환 및 6대 주석 동기화 | `MOD` | `+31 / -30` | `일치` |
| `apps/remote-shared/src/features/ui/layouts/{Card,Container,Flex,Grid,Stack}.tsx` | `HTMLArkProps<'div'>` → `ComponentPropsWithoutRef<'div'>` 전환 및 6대 주석 동기화 | `MOD` | `+40 / -40` | `일치` |
| `apps/remote-shared/src/features/ui/components/Select.tsx` | `ArkSelect.RootProps` 제거 → `ComponentPropsWithoutRef<'div'>` + 명시 폼·제어 속성(`name`, `disabled`, `readOnly`, `required`, `invalid`, `closeOnSelect`, `lazyMount`, `unmountOnExit`) 캡슐화 | `MOD` | `+51 / -7` | `일치 (JSDoc 패키지명 표기도 정리해 .d.ts 누출 0건 보장)` |
| `apps/remote-shared/src/features/ui/layouts/Splitter.tsx` | `ArkSplitter.RootProps` 제거 → `ComponentPropsWithoutRef<'div'>` + `defaultSize`/`size`/`orientation`/`onResize` 캡슐화 | `MOD` | `+41 / -7` | `일치` |
| `apps/remote-shared/src/features/ui/layouts/Tabs.tsx` | `ArkTabs.RootProps` 제거 → `ComponentPropsWithoutRef<'div'>` + `value`/`defaultValue`/`orientation`/`lazyMount`/`unmountOnExit` 캡슐화 | `MOD` | `+44 / -7` | `보완 (제어 모드 value 전달 시 defaultValue 충돌 버그 동시 해결)` |
| `apps/remote-shared/src/features/ui/layouts/Collapsible.tsx` | `ArkCollapsible.RootProps` 제거 → `ComponentPropsWithoutRef<'div'>` + `open`/`defaultOpen`/`disabled`/`lazyMount`/`unmountOnExit` 캡슐화 | `MOD` | `+37 / -6` | `보완 (disabled={true} 시 Trigger 네이티브 disabled 동기화 추가)` |
| `apps/remote-shared/src/**` (`.js` 제거 대상 28개 파일) | 내부 상대 경로 import `.js` 확장자 전수 제거 (`Study 04 #01`) | `MOD` | `전수 제거` | `일치` |
| `apps/remote-shared/src/features/ui/**/*.test.tsx` & `src/__tests__/SharedShowcase.integration.test.tsx` | 캡슐화 명시 Props 단위 테스트(`TC-02~05`, `EC-01~03`) 및 아키텍처 무결성 3대 정적 검증(`TC-06`) 추가 | `MOD` | `+220 / -28` | `일치` |
| `GEMINI.md` | 3조 3항 `Ark UI` 래핑 규칙을 `ComponentPropsWithoutRef` 기반 경계 캡슐화 규약으로 현행화 | `MOD` | `+1 / -1` | `일치` |
| `apps/remote-shared/docs/todo.md` & `docs/features/20261119-ui-prop-encapsulation/*` | 진행 중 등록, `01-plan-and-design.md`, `02-tdd-spec.md`, `03-code-review.md` 작성 | `NEW/MOD` | `문서 4종` | `일치` |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`Props` / `Config`)**:
  - 13종 UI 컴포넌트는 모두 순수 React 표준 속성(`ComponentPropsWithoutRef<'button' | 'span' | 'h1' | 'div'>`)과 명시적 커스텀/제어 속성(`variant`, `size`, `isLoading`, `options`, `value`, `onChange`, `panels`, `defaultSize`, `orientation`, `onResize`, `items`, `defaultValue`, `lazyMount`, `open`, `defaultOpen`, `disabled` 등)만 외부 계약으로 수신합니다.
  - `vite.config.ts`는 `dev: { disableDynamicRemoteTypeHints: true }`로 동적 WebSocket 타입 힌트만 비활성화하고 `dts: { generateTypes: true, tsConfigPath: './tsconfig.json' }`는 그대로 유지합니다.
- **내부 핵심 처리 로직**:
  - 9종 기본·정적 레이아웃 컴포넌트는 `ComponentPropsWithoutRef<*>` 기반 나머지 속성을 내부 `ark.*` 팩토리에 안전하게 전달합니다.
  - 4종 인터랙티브 컴포넌트(`Select`, `Splitter`, `Tabs`, `Collapsible`)는 HTML 표준 `div`와 충돌하는 속성(`defaultValue`, `onChange`, `onSelect`, `onResize`, `title`, `children`, `dir`)을 `Omit`으로 배제한 뒤, 각 `Ark*.Root`에 필요한 제어·비제어 속성과 단순화 콜백(`onChange(string)`, `onResize(number[])`, `onOpenChange(boolean)`)을 내부 브릿징합니다.
- **출력 데이터 (`Render` / `@mf-types`)**:
  - 런타임 렌더링 및 접근성(`role`, `aria-*`, `Portal`, `data-*`)은 기존과 100% 동일하게 유지되며, `vite build`로 생성되는 `dist/@mf-types/**/*.d.ts` 전 파일에서 `@ark-ui/react` import 및 참조가 **`0건`**으로 완전 격리됩니다.

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **실행 명령어**: `pnpm --filter @mfe-study/remote-shared test` 및 루트 통합 `pnpm test` (`vitest run`)
- **통과 현황**:
  - `remote-shared` 단독: **`18`개 파일 / `35`건 전원 통과** (`0`건 실패, 소요 시간: `6.13s`)
  - 워크스페이스 전체 회귀 검증: **`34`개 파일 / `97`건 전원 통과** (`0`건 실패, 소요 시간: `8.80s`)
- **주요 검증 시나리오 요약**:
  - `[TC-01]` 기본 4종·정적 레이아웃 5종(`ComponentPropsWithoutRef` 전환) 표준 HTML·ARIA·`data-*` 속성 투과 및 `isLoading`·`clsx` 유지 통과
  - `[TC-02, EC-01]` `Select` 폼 속성(`name`, `required`, `invalid`, `data-testid`) 투과, 포털 선택 단일 문자열 `onChange`, `disabled={true}` 드롭다운 차단 통과
  - `[TC-03]` `Splitter` `orientation="vertical"`, `defaultSize`, `onResize`, `data-testid` 투과 및 구분선 렌더링 통과
  - `[TC-04, EC-03]` `Tabs` 제어 모드(`value` 리렌더링 전환), `orientation="vertical"` 및 `lazyMount={true}` 초기 미마운트 경계 통과
  - `[TC-05, EC-02]` `Collapsible` `defaultOpen={true}` 초기 펼침·접기 및 `disabled={true}` 트리거 비활성화 차단 통과
  - `[TC-06]` 아키텍처 무결성 3대 정적 검증 통과: ① `vite.config.ts` `disableDynamicRemoteTypeHints: true` + `generateTypes: true` 공존, ② `src/**` `.js` 상대 경로 import `0건`, ③ UI 13종 소스 및 실제 빌드된 `dist/@mf-types/**/*.d.ts` 전 파일 `@ark-ui/react` 참조 `0건`

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` (`Checked 131 files in 32ms. No fixes applied.`)
- **타입 검사 (`tsc --noEmit`)**: `통과` (`apps/remote-shared/tsconfig.json` 에러 `0`건)
- **프로덕션 빌드 (`vite build`)**: `통과` (`dist/remoteEntry.js`, `dist/mf-manifest.json`, `dist/@mf-types/` 정상 생성 및 `@ark-ui/react` 참조 `0건` 실증)
- **작업 스코프 격리 (`verify-scope.mjs`)**: `shared` (`apps/remote-shared`) 및 전역 허용 문서(`GEMINI.md`, `.agents/active-scope.json`) 외 타 서비스 수정 `0건` 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `N/A (해당 없음 — api 스코프 SQL 미변경)`

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`

- [x] **[SEC-01] SQL 인젝션 방어 및 입력 스키마 검증**: `N/A (UI Props 타입 리팩토링 및 빌드 설정 정리 스코프, 기존 Zod 이벤트/스토리지 검증 유지)`
- [x] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: `dangerouslySetInnerHTML`, `innerHTML`, `eval` 사용이 전무하며 모든 텍스트·라벨·제목 노드는 React JSX로 안전하게 이스케이프됩니다. (`통과`)
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: 내부 UI 라이브러리 구현 세부가 외부 타입 선언(`.d.ts`)으로 누출되지 않도록 경계를 캡슐화했으며 민감 정보 노출 요소가 없습니다. (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: `vite.config.ts`의 Port `3004`, `strictPort: true`, `cors: true`를 유지하면서 불필요한 로컬 동적 타입 힌트 WebSocket 연결(`ws://127.0.0.1:16322`)을 `disableDynamicRemoteTypeHints: true`로 차단했습니다. (`통과`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)

- **적용 여부**: `적용`
- [x] **초기화·경로 (#01~#04)**: `main.ts` + `bootstrap.tsx` 2단 비동기 분리(#01), `src/**` 전체 상대 경로 `.js` 확장자 제거로 MF 정적 스캐너 호환성 확보(#01), `cors: true` & `strictPort: true`(#03), `@mf-types` 서빙 유지 + `disableDynamicRemoteTypeHints: true` WebSocket 에러 차단 + `@ark-ui/react` 타입 누출 `0건` 달성(#04)을 모두 통과했습니다.
- [x] **DOM·스타일 격리 (#05~#06)**: 기존 `.mfe-ui-*` 프리픽스 및 `Select` 포털의 `--mfe-z-dropdown` 토큰 계층이 그대로 보존되었습니다.
- [x] **상태·라우팅·메모리·스토리지 (#07~#10)**: `ThemeProvider` Context, `useMfeEvent` 자동 해제, `createScopedStorage` 격리 동작 모두 기존 100% 회귀 통과했습니다.
- [x] **단독 테스트·장애 복구 (#11~#14)**: `apps/remote-shared` 단독 `Vitest` 35건 및 워크스페이스 통합 97건이 타 서버 기동 없이 전원 통과합니다.

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../../../../../docs/study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`shared`)
- [x] **비동기 경합 및 폭포수 방지 (#01~#02)**: `Button`의 `isLoading` 중복 클릭 잠금(`disabled` + `aria-busy="true"`)과 `httpClient`의 `AbortSignal` 지원이 회귀 없이 유지됩니다.
- [x] **렌더링 및 금액·시간 정확성 (#03~#04)**: `Skeleton` 슬롯 고유 키, `formatCurrency` 정수 반올림 포맷터가 회귀 없이 유지됩니다.
- [x] **레이아웃·테마·접근성 (#13~#16)**: `Collapsible.Trigger`에 네이티브 `disabled={disabled}`를 추가 보강하여 스크린 리더·키보드 접근성을 개선했고(#15), `CLS` 방지 스켈레톤·시맨틱 CSS 변수·`min-width: 0`·`tabular-nums`가 그대로 보존됩니다.

### 4.2 백엔드 API & SQLite DB 점검 (`api` 해당 시)
- [x] **백엔드 스코프 해당 없음 (`N/A`)**

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: `./utils` → `./theme` → `./ui` 단방향 의존성(`0건` 역참조)이 정적 테스트로 지속 보장됩니다.
- [x] **6대 주석 원칙 ([`Study 02` §3](../../../../../docs/study/02-polyrepo-and-architecture-decisions.md) 및 [`GEMINI.md`](../../../../../GEMINI.md) 기준)**: 변경된 13종 컴포넌트 및 테스트 파일의 파일 헤더, 모든 인터페이스 내부 속성 `/** ... */` 한글 주석, JSDoc, 분기문 의도 주석을 전수 동기화했습니다.

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 및 TDD 과정에서 발견·즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **`Tabs.tsx` 제어 모드(`value` 전달)와 `defaultValue` 동시 주입 충돌 버그 발견 및 수정**:
   - 기존 `Tabs.tsx`가 제어 모드(`value` prop 전달)일 때도 `defaultValue={defaultValue ?? items[0]?.value}`를 무조건 주입해 `value` 변경 시 상태 머신 전환과 충돌하던 문제를 3단계 `TC-04`에서 조기 포착했습니다.
   - `const resolvedDefaultValue = value === undefined ? (defaultValue ?? items[0]?.value) : undefined;`로 수정하고, 제어 모드 리렌더링의 비동기 presence 반영을 `waitFor`로 검증해 해결 완료했습니다.
2. **`Collapsible.tsx` `disabled={true}` 시 트리거 버튼의 네이티브 `disabled` 속성 누락 보완**:
   - `ArkCollapsible.Root`에 `disabled={true}`를 넘기면 트리거 `<button>`에 `data-disabled=""`만 부여되고 네이티브 HTML `disabled` 속성이 누락되는 현상을 3단계 `EC-02`에서 포착했습니다.
   - `<ArkCollapsible.Trigger disabled={disabled} ...>`를 명시 연결하여 키보드 포커스 차단과 `toBeDisabled()` 접근성 테스트를 모두 통과하도록 보강 완료했습니다.
3. **`Select.d.ts` JSDoc 설명 문구 내 `@ark-ui/react` 문자열 정리**:
   - 빌드 후 실물 `dist/@mf-types/**/*.d.ts` 전수 검사에서 13개 컴포넌트의 TypeScript 코드에서는 `@ark-ui/react` import가 0건이었으나, `Select.tsx` JSDoc 주석의 한글 설명에 포함된 `@ark-ui/react` 문자열 1건이 감지되어 `"Ark UI"`로 자연스럽게 다듬어 빌드 산출물 전체 `@ark-ui/react` 문자열 `0건`을 달성 완료했습니다.

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **외부 노출 `Props` 경계 캡슐화 범위 및 후속 `products` Shim 제거 연계**:
   - 13종 UI 컴포넌트의 `dist/@mf-types/**/*.d.ts` 전 파일에서 `@ark-ui/react` 의존이 완전히 사라졌습니다.
   - 본 PR이 `main`에 머지되면 직후 `products` 스코프(`products/chore/remove-ark-type-shim`)에서 `apps/remote-products/src/vite-env.d.ts`의 임시 Shim(10~89행)을 삭제하고 무-Shim 정적 타입 검사를 검증할 예정입니다.
2. **5단계-A PR 초안 보고 및 PR 생성 승인 요청**:
   - 본 코드 리뷰서와 PR 초안·커밋 메시지를 확인해 주시고, **커밋·푸시 및 PR 생성(`gh pr create`) 진행 여부**를 승인해 주시면 **PR 생성까지만 완료하고 즉시 멈추어** GitHub PR 확인 및 별도 머지 결정을 대기하겠습니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: 이상 없으므로 [`pull-request.template.md`](../../../../../docs/templates/pull-request.template.md) 기반 PR 초안 및 순수 텍스트 커밋 메시지 보고 진행
