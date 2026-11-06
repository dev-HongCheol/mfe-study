# 🔍 [코드 리뷰 및 품질·보안 검증서] 원격 공통 디자인 시스템(`Ark UI`), 실시간 테마 및 MFE 유틸리티 구축 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어(호스트, 리모트, 컴포넌트, 모킹 등)와 범용 영문 키워드(`PR`, `TDD`, `API`, `SQL`, `XSS`, `CORS` 등)로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`
> 승인자가 빠르고 정확하게 리뷰할 수 있도록 정리한 **5대 핵심 검증 데이터**입니다.

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 라인 수 (`+ / -`) | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `apps/remote-shared/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts` | Port `3004`, Module Federation 2.0(`remote_shared`) 및 `jsdom` Vitest 설정 | `NEW` | `+126 / -0` | `일치` (`react`, `react-dom`, `@tanstack/react-query` 싱글톤 설정 포함) |
| `apps/remote-shared/src/testing/setup.ts` | `jest-dom` 매처 및 브라우저 API 폴리필 | `NEW` | `+38 / -0` | `보완` (`afterEach` 포털 `cleanup()` 및 `ResizeObserver`, `scrollTo` 스텁 추가) |
| `apps/remote-shared/src/features/utils/model/contracts.ts` | 루트 SSOT 기반 5대 이벤트·API 봉투 타입 및 `Zod` 스키마 | `NEW` | `+228 / -0` | `일치` (`MFE_EVENTS`, `MFE_EVENT_SCHEMAS` 1:1 매핑) |
| `apps/remote-shared/src/features/utils/model/event-bus.ts` (+ `test` 2종) | `mfeEventBus`(`emit`, `subscribe`) 및 자동 해제 `useMfeEvent` 훅 | `NEW` | `+226 / -0` | `일치` (`savedHandlerRef`로 불필요한 리스너 재등록 방지 적용) |
| `apps/remote-shared/src/features/utils/model/storage.ts` (+ `test`) | `mfe:<scopeId>:<key>` 네임스페이스 및 `Zod` 검증 `createScopedStorage` | `NEW` | `+175 / -0` | `일치` (`clearScope()` 선택 삭제 및 `QuotaExceededError` 방어) |
| `apps/remote-shared/src/features/utils/model/formatters.ts`, `error.ts` (+ `test` 2종) | 원화·날짜 포맷터 및 `normalizeError` 표준 예외 변환기 | `NEW` | `+257 / -0` | `보완` (`-0` 원화 정규화 및 SQLite 로컬 시간 문자열 ISO 자동 보정 추가) |
| `apps/remote-shared/src/features/utils/api/http-client.ts`, `query-client.ts` (+ `test` 2종) | `ky` 기반 `httpClient`, `unwrapApiResponse`, 싱글톤 `sharedQueryClient` | `NEW` | `+240 / -0` | `일치` (`AbortSignal` 연동 및 `HTTPError` 표준 에러 봉투 복원) |
| `apps/remote-shared/src/features/theme/*` (+ `test`) | 4종 실시간 테마 토큰(`--mfe-*`), `Z_INDEX_TOKENS`, `ThemeProvider`, `useTheme` | `NEW` | `+407 / -0` | `일치` (`localStorage` 영속화 및 `mfe:theme-changed` 양방향 동기화) |
| `apps/remote-shared/src/features/ui/components/*` (5종 + `test` 5종) | `Button`, `Heading`, `Select`, `Skeleton`, `Badge` (`1 컴포넌트 = 1 파일`) | `NEW` | `+494 / -0` | `일치` (`ArkSelect.RootProps` 및 `HTMLArkProps` 기본 상속 적용) |
| `apps/remote-shared/src/features/ui/layouts/*` (8종 + `test` 4종) | `Splitter`, `Tabs`, `Collapsible`, `Container`, `Grid`, `Flex`, `Stack`, `Card` | `NEW` | `+647 / -0` | `일치` (`Ark*.RootProps` 및 `HTMLArkProps<'div'>` 기본 상속 적용) |
| `apps/remote-shared/src/features/ui/ui-styles.css` | `.mfe-ui-*` 프리픽스 및 `var(--mfe-*)` 시맨틱 토큰 스타일시트 | `NEW` | `+387 / -0` | `일치` (전역 태그 선택자 0건, `:focus-visible`, `tabular-nums`, `min-width: 0` 적용) |
| `apps/remote-shared/src/exposed/{utils,theme,ui}.ts` | Module Federation 3대 서브패스 공개 진입점 (`clsx` 재노출 포함) | `NEW` | `+103 / -0` | `일치` (`utils -> theme -> ui` 단방향 의존성 엄수) |
| `apps/remote-shared/index.html`, `src/main.ts`, `src/bootstrap.tsx`, `src/App.tsx`, `src/__tests__/SharedShowcase.integration.test.tsx` | 비동기 부트스트랩 분리 및 `Port 3004` 단독 실행 쇼케이스 + 통합 테스트 | `NEW` | `+318 / -0` | `일치` (`TC-08` 아키텍처 정적 검증 및 쇼케이스 통합 검증 통과) |
| `vitest.config.ts`, `GEMINI.md` | 루트 멀티 프로젝트 Vitest 연결 및 컴포넌트 분리·레지스트리 헌법 보강 | `MOD` | `+15 / -4` | `보완` (`node` + `jsdom` 멀티 프로젝트 통합 실행 및 프로젝트 헌법 명문화) |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`Props` / `Event Payload` / `API Response`)**:
  - **UI 및 레이아웃 (`./ui`)**: `Ark UI` 원본 `RootProps` 및 `HTMLArkProps`를 `Omit`으로 기본 상속받아 표준 HTML·접근성 속성을 그대로 투과하며, `Select`(`options`, 단일 문자열 `value`/`onChange`), `Tabs`(`items`), `Splitter`(`panels`), `Collapsible`(`title`, `boolean` `onOpenChange`) 등 직관적인 선언형 `Props`를 입력받습니다.
  - **이벤트 및 스토리지 (`./utils`)**: `mfeEventBus.emit`/`subscribe`와 `createScopedStorage.getItem`, `unwrapApiResponse`는 외부 경계 데이터를 `Zod` 스키마(`safeParse`)로 최전선에서 검증합니다.
- **내부 핵심 처리 로직**:
  - **3계층 단방향 아키텍처**: 최하단 `./utils`(이벤트·스토리지·통신·포맷터) → 중간 `./theme`(`ThemeContext`·CSS 변수 토큰·`Z_INDEX_TOKENS`) → 최상단 `./ui`(`Ark UI` 13종 컴포넌트) 순서로만 참조하여 순환 참조를 원천 차단합니다.
  - **실시간 테마 동기화**: `ThemeProvider`에서 `setTheme` 호출 시 ① React 상태 갱신, ② `document.documentElement`의 `data-mfe-theme` 및 `--mfe-*` CSS 변수 즉시 주입, ③ `mfe:shared:theme` 스코프 스토리지 저장, ④ `mfe:theme-changed` 커스텀 이벤트 발행을 일괄 수행하며, 타 마이크로 앱이 발행한 테마 변경 이벤트도 `useMfeEvent`로 수신하여 양방향 동기화합니다.
- **출력 데이터 (`Render` / `State Change` / `Exposed Contract`)**:
  - Module Federation 2.0(`remote_shared`)을 통해 `./ui`, `./theme`, `./utils` 3개 서브패스를 런타임에 노출하며, `http://localhost:3004` 단독 실행 시 전체 컴포넌트와 테마·이벤트 버스를 즉시 체험할 수 있는 인터랙티브 쇼케이스(`App.tsx`)를 렌더링합니다.

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **실행 명령어**: `pnpm --filter @mfe-study/remote-shared test` (루트 통합: `pnpm test`)
- **통과 현황**: `remote-shared` 단독 **총 `18`개 테스트 파일 / `25`건 중 `25`건 통과** (`0`건 실패, 테스트 실행 소요 시간: `1,460ms`) / 루트 전체 통합 **총 `26`개 테스트 파일 / `45`건 중 `45`건 통과**
- **주요 검증 시나리오 요약**:
  - `[TC-01 / EC-01]` `mfeEventBus` 발행·구독, `useMfeEvent` 언마운트 시 `removeEventListener` 자동 호출(좀비 리스너 방지), 오염된 `CustomEvent` 페이로드 `Zod` 차단 검증 통과
  - `[TC-02 / EC-02]` `createScopedStorage`의 `mfe:<scopeId>:<key>` 키 격리, `clearScope()` 스코프별 선택 삭제, 깨진 JSON 및 스키마 불일치 시 안전한 `fallback` 반환 검증 통과
  - `[TC-03 / EC-04]` `formatCurrency` 부동소수점 반올림(`19999.999999` → `"20,000원"`), `date-fns`(`ko`) 기반 `formatDate`·`formatRelativeTime` 및 잘못된 날짜 문자열 `"-"` 폴백 검증 통과
  - `[TC-04 / EC-03]` `httpClient` + `unwrapApiResponse` 표준 봉투 언래핑, `AbortController` 요청 취소 연동, HTTP `400` 에러 봉투의 `code`/`message` 보존(`normalizeError`), 싱글톤 `sharedQueryClient` 참조 동일성 검증 통과
  - `[TC-05]` `ThemeProvider` & `useTheme` 초기 토큰 주입(`--mfe-z-dropdown: 200` 등), `setTheme('dark')` 전환 시 DOM·스토리지·이벤트 동기화, 외부 `mfe:theme-changed` 이벤트 수신 자동 전환 검증 통과
  - `[TC-06 / TC-07]` 기본 컴포넌트 5종(`Button` 로딩 잠금 및 `asChild` 합성, `Heading`, `Select` 포털 드롭다운 선택, `Skeleton` 다건 렌더링, `Badge`) 및 레이아웃 8종(`Splitter`, `Tabs` `lazyMount`, `Collapsible`, 정적 레이아웃 5종 + `clsx`) 검증 통과
  - `[TC-08]` `utils -> theme -> ui` 역방향 import `0`건, 모든 `.tsx` 컴포넌트 파일명 `PascalCase` 규칙 준수, `App.tsx` 단독 쇼케이스 렌더링 및 테마 전환 통합 테스트 통과

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` (`Checked 97 files in 15ms. No fixes applied.`)
- **타입 검사 (`tsc --noEmit`)**: `통과` (`pnpm --filter @mfe-study/remote-shared typecheck` 에러 `0`건)
- **작업 스코프 격리 (`verify-scope.mjs`)**: `shared` (`apps/remote-shared`) 및 허용된 루트 설정 외 타 마이크로 앱 수정 `0`건 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `통과` (`✅ 3종 SQL 해시 및 인메모리 멱등성 검증 통과!`)

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`
- [x] **[SEC-01] SQL 인젝션 방어 및 입력 스키마 검증**: 프론트엔드 공통 모듈로서 외부 입력과 맞닿는 3대 경계(① `mfeEventBus` 발신·수신 페이로드, ② `createScopedStorage.getItem` 로컬 스토리지 데이터, ③ `unwrapApiResponse`의 `dataSchema` 응답 데이터)에 모두 `Zod` `safeParse` 런타임 스키마 검증을 적용하여 오염된 데이터 유입을 차단함 (`통과`)
- [x] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `Function` 등 위험한 DOM 조작·동적 실행 API 사용이 `0`건이며, 모든 컴포넌트 텍스트와 라벨은 React JSX 기본 이스케이프를 통해 안전하게 렌더링됨 (`통과`)
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: `normalizeError` 및 `unwrapApiResponse`에서 예외 객체를 정규화할 때 민감한 인증 헤더나 토큰을 콘솔에 출력하지 않으며, 비표준 예외 발생 시에도 안전한 사용자 메시지로 폴백함 (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: `vite.config.ts`에 `port: 3004`, `strictPort: true`, `cors: true`, `origin: 'http://localhost:3004'`를 명시하고, `ky` 기반 `httpClient`에 `timeout: 10_000` 및 `retry: 0`을 설정하여 무한 대기 및 중복 변경 요청 위험을 방지함 (`통과`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)
- **적용 여부**: `적용`
- [x] **초기화·경로 (#01~#04)**: `src/main.ts`(`import('./bootstrap.js')`)와 `src/bootstrap.tsx` 2단 비동기 분리로 싱글톤(`react`, `react-dom`, `@tanstack/react-query`) `eager consumption` 에러를 방지했으며, `base: 'http://localhost:3004/'`, `cors: true`, `strictPort: true`를 모두 적용함 (`통과`)
- [x] **DOM·스타일 격리 (#05~#06)**: `ui-styles.css`에서 전역 태그 선택자(`button`, `body`, `h1`, `*`)를 단 하나도 사용하지 않고 `.mfe-ui-*` 전용 클래스 프리픽스만 사용했으며, `Select` 포털 드롭다운 위치자에 `z-index: var(--mfe-z-dropdown, 200)` 표준 계층 토큰을 적용함 (`통과`)
- [x] **상태·라우팅·메모리·스토리지 (#07~#10)**: 단일 원격 `ThemeContext`(`remote_shared/theme`) 노출로 침묵의 Context 단절을 예방하고, 언마운트 시 `window.removeEventListener`를 100% 자동 호출하는 `useMfeEvent` 훅과 `mfe:<scopeId>:<key>` 프리픽스를 강제하는 `createScopedStorage`를 구현함 (`통과`)
- [x] **단독 테스트·장애 복구 (#11~#14)**: 다른 마이크로 앱 서버 기동 없이 `Vitest` 단독 실행으로 18개 테스트 파일이 모두 통과하며, Module Federation 2.0 `manifest: true`(`mf-manifest.json` 및 `remoteEntry.js`) 설정을 완료함 (`통과`)

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../../../../../docs/study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`shared`, `products`, `cart`, `host-*` 해당 시)
- [x] **비동기 경합 및 폭포수 방지 (#01~#02)**: `Button` 컴포넌트에 `isLoading` 전달 시 `disabled` 및 `aria-busy="true"`가 즉시 활성화되어 연타 중복 요청을 물리적으로 차단하며, `httpClient`는 `AbortSignal`(`signal`)을 그대로 투과하여 `cancelQueries` 시 네트워크 요청 취소를 지원함 (`통과`)
- [x] **렌더링 및 금액·시간 정확성 (#03~#04)**: `Select`, `Tabs`, `Splitter`, `Skeleton` 등 모든 리스트 렌더링에 고유 식별자 `key`를 부여하고 불필요한 `useEffect` 파생 상태를 배제했으며, `formatCurrency`의 `Math.round` 정수 반올림과 `date-fns`(`ko` 로케일) 순수 함수형 날짜 포맷팅을 구현함 (`통과`)
- [x] **레이아웃·테마·접근성 (#13~#16)**: `Skeleton` 프리셋(`card: min-height 11.5rem`)을 통한 `CLS` 방지, 4종 실시간 시맨틱 CSS 변수(`var(--mfe-*)`), `:focus-visible` 키보드 포커스 링 및 `Ark UI` 상태 속성(`data-disabled`, `data-highlighted`, `data-selected`) 스타일 매핑, `Flex`·`Grid`·`Card`·`Heading`의 `min-width: 0` 말줄임 방어, `Button`·`Badge`의 `font-variant-numeric: tabular-nums` 고정폭 숫자를 모두 적용함 (`통과`)

### 4.2 백엔드 API & SQLite DB 점검 (`api` 해당 시)
- `N/A (해당 없음 — 프론트엔드 원격 공통 디자인 시스템 및 유틸리티 스코프)`

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: 단일 배럴 파일(`index.ts`) 없이 `./utils`, `./theme`, `./ui` 3대 서브패스로 분리하고 `utils -> theme -> ui` 단방향 의존성만 허용(통합 테스트 `TC-08`로 자동 검증)했으며, 13종 컴포넌트 모두 비즈니스 도메인 지식 `0%` 유지 및 `Ark UI` 원본 `Props` 기본 상속, `normalizeError` 예외 안전성을 확보함 (`통과`)
- [x] **6대 주석 원칙 ([`Study 02` §3](../../../../../docs/study/02-polyrepo-and-architecture-decisions.md) 및 `GEMINI.md` 기준)**: 모든 파일 최상단 헤더(`@file`, `@app`, `@exposed`, `@description`), **모든 인터페이스 내부 속성의 `/** */` 인텔리센스 한글 주석**, 함수·컴포넌트 `@param`/`@returns` JSDoc, 주요 상수·상태(`useState`/`useRef`) 주석, 분기문(`if/else`)의 의도(Why) 주석이 빠짐없이 작성·동기화됨 (`통과`)

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 중 발견 및 즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **루트 `Vitest` 단일 `node` 환경 설정으로 인한 프론트엔드(`jsdom`) 테스트 통합 실행 제약 발견** -> 루트 `vitest.config.ts`를 `projects` 멀티 프로젝트 구성(`root-harness`, `apps/api-server/vitest.config.ts`, `apps/remote-shared/vitest.config.ts`)으로 개선하여 `pnpm test` 한 번으로 백엔드(`node`)와 프론트엔드(`jsdom`) 전체 테스트(45건)가 각자의 환경에서 정확히 실행되도록 조치함 (해결 완료)
2. **`jsdom` 환경에서 `Ark UI` `Splitter` 및 `Select` 포털 실행 시 브라우저 API(`ResizeObserver`, `Element.prototype.scrollTo`) 부재 이슈 발견** -> `src/testing/setup.ts`에 `MockResizeObserver`와 `Element.prototype.scrollTo` 폴리필 스텁 및 `afterEach(cleanup)` 포털 정리 훅을 등록하여 헤드리스 UI 상태 머신 테스트 안정성을 확보함 (해결 완료)
3. **`Skeleton` 다건(`count > 1`) 렌더링 시 배열 인덱스 `key` 사용으로 인한 Biome `noArrayIndexKey` 린트 경고 발견** -> `skeleton-${variant}-slot-${slotNumber + 1}` 결정적 슬롯 키 배열을 생성하도록 개선하고, `count = 1`일 때는 불필요한 그룹 래퍼 `div` 없이 단일 엘리먼트를 반환하도록 최적화함 (해결 완료)
4. **`formatCurrency`의 `-0` 입력 시 `"-0원"` 출력 가능성 및 SQLite 로컬 시간(`YYYY-MM-DD HH:mm:ss`) 파싱 호환성 보완** -> `Object.is(rounded, -0)` 정규화로 `"0원"` 반환을 보장하고, `parseSafeDate`에서 공백 구분 날짜 문자열을 ISO 형식(`T`)으로 자동 보정하여 백엔드 SQLite 타임스탬프와 완벽히 호환되도록 조치함 (해결 완료)

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **`1 컴포넌트 = 1 파일` (`PascalCase.tsx`) 분리 및 `Ark UI` 원본 `Props` 기본 상속 구조**:
   - `src/features/ui/components/`(5종)와 `src/features/ui/layouts/`(8종)의 모든 컴포넌트를 개별 대문자 `.tsx` 파일로 분리하고, 각각 `ArkSelect.RootProps`, `ArkSplitter.RootProps`, `ArkTabs.RootProps`, `ArkCollapsible.RootProps` 및 `HTMLArkProps<'button' | 'h1' | 'div' | 'span'>`을 `Omit`으로 기본 상속하도록 구현했습니다.
2. **5단계-B 머지 직전 [`docs/service-registry.md`](../../../../../docs/service-registry.md) 정본화 계획**:
   - 다음 단계(`5단계-B`)에서 PR 머지 승인을 주시면, 실제 머지 직전에 루트 `todo.md`, `apps/remote-shared/docs/todo.md`와 함께 `docs/service-registry.md`에 `remote-shared`(`Port 3004`)의 명령어, `./ui`·`./theme`·`./utils` 노출 시그니처, 그리고 타 서비스(호스트·도메인 리모트) 필수 소비 규칙을 상세히 업데이트할 예정입니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: 이상 없으므로 **🟡 `Argon Medium` 모델로 전환** 후 [`pull-request.template.md`](../../../../../docs/templates/pull-request.template.md) 기반 PR 초안 및 순수 텍스트 커밋 메시지 보고(`5단계-B`) 진행
