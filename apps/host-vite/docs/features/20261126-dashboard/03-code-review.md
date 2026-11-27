# 🔍 [코드 리뷰 및 품질·보안 검증서] `host-vite` 공통 껍데기 호스트 대시보드 · 장애 격리 · `MfeInspector` 구축 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어(호스트, 리모트, 컴포넌트, 모킹 등)와 범용 영문 키워드(`PR`, `TDD`, `API`, `SQL`, `XSS`, `CORS` 등)로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 (서비스 루트 기준 — 루트 파일은 `[루트]` 표기) | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 규모 | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `src/vite-env.d.ts` | `Port 3000` 고정, `remote_shared`/`remote_products`(`module`) + `remote_cart`(`var`) 소비, React 서브패스 3종 포함 6종 싱글톤, 무-Shim `@mf-types` 소비 | `NEW` | 신규 6개 파일 | `일치` (`vite-env.d.ts` 주석 문구만 `TC-07` 문자열 검사와 충돌 없도록 다듬음) |
| `src/main.ts`, `src/bootstrap.tsx`, `src/bootstrap-fallback.{ts,css,test.ts}`, `src/App.tsx` | `remote_shared` 3대 서브패스 선행 프리로드 + 실패 시 `<template>`·전용 CSS 기반 폴백 모듈 지연 로드, `StrictMode` + `ThemeProvider`, 호스트 상태 오케스트레이션 | `NEW` | 신규 6개 파일 | `일치 (PR 리뷰 피드백 반영해 폴백 UI·CSS·테스트를 별도 모듈로 분리)` |
| `src/features/auth/{model,api}/*` (`auth-schema.ts`, `auth-api.ts`, `auth-api.test.ts`, `use-host-auth.ts`) | `GET /api/users`, `POST /api/auth/login` `Zod` 검증, `createScopedStorage('host-vite')` 세션 영속화 및 `AUTH_CHANGED` 발행 | `NEW` | 신규 4개 파일 | `일치` |
| `src/features/dashboard/{model,ui}/*` (`host-preferences.ts`, `host-remotes.ts`, `RemoteErrorBoundary.tsx`, `RemoteWidgetSlot.tsx`, `HostHeader.tsx`, `DashboardWorkspace.tsx`, `host-dashboard.css` + 단위 테스트 3종) | 글로벌 헤더, `Splitter` 좌/우 리모트 지연 로딩, 순수 React `RemoteErrorBoundary`(`remote_shared/ui` 미의존), `.host-*` 스타일 격리 | `NEW` | 신규 10개 파일 | `일치` (`host-remotes.ts`로 3대 리모트 메타 및 6종 싱글톤 정본 분리) |
| `src/features/inspector/{model,ui}/*` (`use-mfe-event-log.ts`, `use-shared-query-cache.ts`, `EventLogTab.tsx`, `RuntimeStatusTab.tsx`, `MfeInspector.tsx` + 단위 테스트 2종) | `Mode A ↔ Mode B` 전환 스위치, 4대 이벤트 실시간 스트림, `sharedQueryClient.getQueryCache()` 스냅샷 관찰 | `NEW` | 신규 7개 파일 | `일치` |
| `src/testing/**` 및 `src/__tests__/HostDashboard.integration.test.tsx` | 3대 리모트 로컬 스텁, MSW 핸들러 및 `TC-01 ~ TC-07`, `EC-01 ~ EC-03` 통합 테스트 | `NEW` | 신규 9개 파일 | `일치` |
| `[루트] docs/study/14-mfe-host-shell-and-inspector-architecture.md`, `docs/study/assets/host-shell-wireframe.svg`, `README.md` | 두 호스트(`host-vite`, `host-rspack`) 공통 App Shell 아키텍처·SVG 와이어프레임·5대 내부 모델 정본 신설 및 목차 반영 | `NEW` / `MOD` | 신규 2개 + 수정 1개 | `보완 (사용자 요청으로 공통 호스트 정본 스터디 문서 및 SVG 와이어프레임 신설)` |
| `[루트] vitest.config.ts`, `package.json`, `pnpm-lock.yaml` | `apps/host-vite` 테스트 프로젝트 등록, `dev:host-vite` 스크립트 추가 및 워크스페이스 의존성 연결 | `MOD` | 수정 3개 파일 | `일치` |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`REST API` / `localStorage` / `mfeEventBus` / `QueryCache`)**:
  - `GET /api/users` · `POST /api/auth/login` 응답 (`Zod` 스키마 검증), `mfe:host-vite:auth-session` 및 `mfe:host-vite:preferences` 스토리지 복원
  - `mfeEventBus` 표준 4대 이벤트(`CART_UPDATED`, `AUTH_CHANGED`, `THEME_CHANGED`, `SYNC_MODE_CHANGED`) 및 `sharedQueryClient.getQueryCache()` 실시간 변화 알림
- **내부 핵심 처리 로직**:
  1. `src/main.ts`에서 `remote_shared/{utils,theme,ui}`만 선행 프리로드하고 `remote_shared` 자체 장애 시 순수 DOM(`textContent`) 안내 폴백을 렌더링
  2. `DashboardWorkspace`에서 `remote_products/ProductList`(:3002)와 `remote_cart/CartWidget`(:3003)을 `React.lazy`로 지연 로딩하여 각각 독립된 `<RemoteWidgetSlot>`(`<RemoteErrorBoundary>` + `<Suspense fallback={<Skeleton />}>`) 안에 격리
  3. `App`이 `hostSourceId` (`createMfeEventSourceId('host-vite')`)를 유지하며 인증 전환(`AUTH_CHANGED`), 동기화 모드 전환(`SYNC_MODE_CHANGED`), 테마 전환(`ThemeProvider` → `THEME_CHANGED`)을 전파하고 `userId`/`syncMode`/`simulateDelay`를 하위 리모트에 동기화
  4. `MfeInspector`가 `useMfeEventLog`(관찰자 모드, `ignoreSourceId` 미지정)와 `useSharedQueryCacheSnapshot`(`getQueryCache().subscribe` + `getAll()`)로 `Mode A` vs `Mode B`의 이벤트·캐시 차이를 실시간 표시
- **출력 데이터 (`Render` / `Props` / `Event` / `Storage`)**:
  - 3단 대시보드 화면 렌더링, `ProductList`·`CartWidget`에 `hostType="vite"` 및 최신 상태 Props 전달, 한쪽 리모트 장애 시 해당 슬롯만 폴백 UI + `[다시 시도]`로 복구

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **실행 명령어**:
  - 앱 단독: `pnpm --filter @mfe-study/host-vite test`
  - 루트 전체: `pnpm test`
- **통과 현황**:
  - `host-vite` 단독: 총 `8`개 파일 / `25`건 중 **`25`건 통과** (`0`건 실패)
  - 루트 전체: 총 `51`개 파일 / `174`건 중 **`174`건 통과** (`0`건 실패)
- **주요 검증 시나리오 요약**:
  - `[TC-01 ~ TC-06]` 초기 비로그인 부팅 및 2대 리모트 결합, 로그인·전환·게스트 복귀(`POST /api/auth/login` + 스토리지 + `AUTH_CHANGED`), 4종 테마 및 `1.5초 지연` 토글, `MfeInspector` `Mode A ↔ Mode B` 전환·4대 이벤트 스트림·`sharedQueryClient` 캐시 스냅샷 관찰, `CartWidget` 장애 격리 및 `[다시 시도]` 복구 전원 통과
  - `[TC-07]` `@ark-ui/react`/`clsx` 직접 설치 0건, 임시 Shim 0줄, `remote_cart` `type: 'var'` 및 React 서브패스 3종 공유, 전역 CSS 태그 선택자·`#hex` 0건 정적 회귀 통과
  - `[EC-01 ~ EC-04]` 로그인 API 실패 시 세션 보호·에러 배너, 오염된 `localStorage` 안전 폴백, `Suspense` 스켈레톤 폴백, `RemoteErrorBoundary` `remote_shared/ui` 미의존 검증 전원 통과

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` (`pnpm check` — `205`개 파일 검사, 수정 필요 `0`건, `44ms`)
- **프로덕션 번들링 및 `@mf-types` 동기화 (`vite build`)**: `통과` (`1.45s`, `3004`/`3002`/`3003` 정적 서빙 상태에서 `mf-manifest.json` · `@mf-types.zip` · `@mf-types.d.ts` 3종 모두 HTTP `200` 자동 다운로드 → `apps/host-vite/@mf-types/[remote_shared, remote_products, remote_cart]` 생성 확인)
- **타입 검사 (`tsc --noEmit`)**: `통과` (3대 원격 `@mf-types` 기반 무-Shim 정적 타입 검사 오류 `0`건)
- **작업 스코프 격리 (`verify-scope.mjs`)**: `host-vite` (`apps/host-vite`) 및 루트 화이트리스트(`vitest.config.ts`, `package.json`, `pnpm-lock.yaml`, `README.md`, `docs/study/`, `.agents/active-scope.json`) 외 타 서비스 폴더 수정 `0`건 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `N/A (해당 없음)`

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`

- [x] **[SEC-01] SQL 인젝션 방어 및 입력 스키마 검증**: 외부 REST API 응답(`userListSchema`, `userEntitySchema`)과 `localStorage` 복원 데이터(`hostStoredAuthSessionSchema`, `hostPreferencesSchema`)를 모두 `Zod` 런타임 스키마로 검증 (`통과`)
- [x] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: `dangerouslySetInnerHTML`, `innerHTML`, `eval` 사용 0건 (`main.ts`의 오프라인 DOM 폴백도 `document.createElement` + `textContent`만 사용) (`통과`)
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: 초기 비로그인(`userId: null`) 상태에서 임의 유저 폴백 없이 `null`을 리모트에 전달하며, 로그인 실패 시 세션을 저장하지 않고 정규화된 메시지만 표시 (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: `Port 3000` 고정(`strictPort: true`), `cors: true`, `useHostAuth` 언마운트 시 `AbortController.abort()` 취소 적용 (`통과`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)

- **적용 여부**: `적용`
- [x] **초기화·경로 (#01~#04)**: `main.ts` + `bootstrap.tsx` 2단 분리, `remote_shared` 3대 서브패스 선행 프리로드, `Port 3000` `strictPort: true` · `cors: true`, 3대 리모트 `@mf-types.zip` 무-Shim 자동 동기화 및 `dev.disableDynamicRemoteTypeHints: true` 적용 완료
- [x] **DOM·스타일 격리 (#05~#06)**: `.host-*` 프리픽스 전용 CSS 적용, 전역 태그 선택자 및 `#hex` 하드코딩 `0건` 정적 검증 통과
- [x] **상태·라우팅·메모리·스토리지 (#07~#10)**: 단일 원격 `ThemeProvider` 사용, `useMfeEvent` 및 `queryCache.subscribe` 언마운트 100% 정리(좀비 리스너 0개), `createScopedStorage('host-vite')` 네임스페이스(`mfe:host-vite:*`) 격리 준수
- [x] **단독 테스트·장애 복구 (#11~#14)**: 타 서버 없이 3대 리모트 스텁 + MSW로 21건 단독 통과, `RemoteErrorBoundary` 순수 내장 폴백(`remote_shared/ui` 미의존) + `[다시 시도]` 리마운트 복구 검증 완료

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../../../../docs/study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`host-vite`)
- [x] **비동기 경합 및 폭포수 방지 (#01~#02)**: `useHostAuth` 마운트 조회에 `AbortController` 취소 적용, 로그인 요청 중 `Select` 비활성화(`isAuthPending`) 적용
- [x] **렌더링 및 금액·시간 정확성 (#03~#04)**: 이벤트 로그에 단조 증가 시퀀스 `id` 키 부여, 시각 포맷팅에 `remote_shared/utils`의 `formatDate` 사용, `useSharedQueryCacheSnapshot`에서 불변 DTO 배열로 변환해 안정적 리렌더링 보장
- [x] **레이아웃·테마·접근성 (#13~#16)**: `RemoteWidgetSlot` `Suspense` 폴백에 `Skeleton` 적용(`min-height` 지정으로 `CLS` 완화), 시맨틱 CSS 변수(`var(--mfe-*)`) 전용, `role="alert"` · `aria-label` · `aria-pressed` 접근성 속성 적용

### 4.2 백엔드 API & SQLite DB 점검 (`api`)
- `N/A (해당 없음)`

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: `auth` / `dashboard` / `inspector` 도메인 세그먼트 단방향 의존성 유지, `normalizeError`로 일관된 에러 정규화
- [x] **6대 주석 원칙 (`GEMINI.md` 4조)**: 생성된 모든 `.ts`/`.tsx`/`.css` 파일에 최상단 역할 헤더(`@file`, `@app`, `@exposed`, `@description`), 인터페이스 내부 모든 속성 `/** ... */` 한글 주석, 함수·컴포넌트·훅 JSDoc, 주요 상수·상태 주석, 분기문(`[분기 설명]`) 주석 누락 없이 작성 완료

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 중 발견 및 즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **두 호스트(`host-vite`, `host-rspack`) 공통 App Shell 아키텍처의 정본 문서 부재** -> 사용자 피드백을 반영해 [Study 14 (`14-mfe-host-shell-and-inspector-architecture.md`)](../../../../docs/study/14-mfe-host-shell-and-inspector-architecture.md)와 [host-shell-wireframe.svg](../../../../docs/study/assets/host-shell-wireframe.svg)를 신설하고 `01-plan-and-design.md` · `README.md`에 참조 링크 연결 완료
2. **`TC-07` 정적 검사에서 `src/vite-env.d.ts` 주석 문구 매칭** -> 파일 헤더 설명 문구에서 `@ark-ui/react` 문자열을 `"서드파티 타입"`으로 다듬어 임시 Shim 부재 검증의 가독성과 정확도 확보
3. **일회성 `@mf-types` 검증 스크립트의 동기 `execSync` 이벤트 루프 블로킹 발견** -> 비동기 `spawn`으로 수정하여 `3004`/`3002`/`3003` 3대 리모트의 `mf-manifest.json` · `@mf-types.zip` 실제 HTTP `200` 다운로드 및 무-Shim `tsc --noEmit` 오류 `0건` 실증 완료
4. **`main.ts` 내 DOM 조립·인라인 `style.cssText` 책임 혼재 해소 (PR 리뷰 반영)** -> 정적 폴백 마크업을 `index.html`의 `<template id="host-bootstrap-fallback-template">`으로 옮기고, `bootstrap-fallback.ts` + `bootstrap-fallback.css` + `bootstrap-fallback.test.ts`(4건)로 분리해 프리로드 실패 시에만 지연 로드되도록 리팩터링 완료 (`vite build` 지연 청크 `1.21 kB JS` + `0.93 kB CSS` 확인)
5. **`RemoteErrorBoundary` 클래스형 보일러플레이트 및 인라인 스타일 제거 (PR 리뷰 반영)** -> `react-error-boundary` v6(`ErrorBoundary` `fallbackRender` + `onError` + `onReset`) 기반 함수형 컴포넌트로 전환하고 인라인 스타일을 `RemoteErrorBoundary.module.css`(CSS Modules)로 분리했으며, 공통 정본 [Study 14](../../../../docs/study/14-mfe-host-shell-and-inspector-architecture.md) `§ 4.1`·`§ 4.2`까지 동기화 완료 (`remote_shared/ui` 미의존 `EC-04` 및 `[다시 시도]` 복구 `TC-06` 100% 유지)

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **이종 번들러(`Vite` 호스트 ↔ `Rspack` 리모트) 소비 설정 (`vite.config.ts`)**: `remote_shared(:3004)`와 `remote_products(:3002)`는 `type: 'module'`로, `remote_cart(:3003)`는 `mf-manifest.json`의 `remoteEntry.type: 'global'`에 맞춰 **`type: 'var'`**로 명시하고 React 서브패스 3종 포함 6종 싱글톤을 통일했습니다.
2. **실전 브라우저 통합 기동 확인 방법**: 루트에서 `pnpm dev:host-vite`(또는 `pnpm dev` → `5번`)로 5개 서버(`4000`, `3004`, `3002`, `3003`, `3000`)를 한 번에 띄워 `http://localhost:3000`에서 로그인·`Mode A ↔ Mode B` 전환·`3003` 서버 중단 시 장애 격리 및 `[다시 시도]` 복구를 직접 체험해 보실 수 있습니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: `pull-request.template.md` 기반 PR 초안 및 순수 텍스트 커밋 메시지를 보고하고 **PR 생성 승인**을 요청합니다. *(PR 생성 후 즉시 멈추며, 별도 머지 승인 시 5단계-C에서 TODO·서비스 레지스트리 업데이트 후 머지 진행)*
