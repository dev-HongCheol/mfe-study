# 🔍 [코드 리뷰 및 품질·보안 검증서] `remote-shared` `ThemeProvider` `sourceId` 자기 에코 차단 및 공통 유효성·에러 리포트 유틸리티 노출 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어(호스트, 리모트, 컴포넌트, 모킹 등)와 범용 영문 키워드(`PR`, `TDD`, `MFE`, `CustomEvent`, `Zod`, `@mf-types` 등)로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`
> 승인자가 빠르고 정확하게 리뷰할 수 있도록 정리한 **5대 핵심 데이터**입니다.

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 (서비스 루트 기준) | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 라인 수 (`+ / -`) | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `docs/features/20261128-theme-source-id-and-validators/01-plan-and-design.md` | `NEW` | `NEW` | `+173 / -0` | `일치` |
| `docs/features/20261128-theme-source-id-and-validators/02-tdd-spec.md` | `NEW` | `NEW` | `+135 / -0` | `일치` |
| `docs/features/20261128-theme-source-id-and-validators/03-code-review.md` | `NEW` | `NEW` | 본 문서 | `일치` |
| `docs/todo.md` | `MOD` | `MOD` | `+5 / -1` | `일치` (진행 중 작업 등록 및 단계 갱신) |
| `src/features/utils/model/validators.ts` | `NEW` | `NEW` | `+51 / -0` | `일치` (`normalizeUserId`, `isThemeMode`, `isSyncMode`) |
| `src/features/utils/model/validators.test.ts` | `NEW` | `NEW` | `+56 / -0` | `일치` (`TC-03`, `EC-02`) |
| `src/features/utils/model/error.ts` | `MOD` | `MOD` | `+145 / -0` | `일치` (`SchemaIssueDetail`, `ErrorReport`, `extractSchemaIssues`, `formatErrorReport`) |
| `src/features/utils/model/error.test.ts` | `MOD` | `MOD` | `+133 / -0` | `일치` (`TC-04`, `EC-03`) |
| `src/exposed/utils.ts` | `MOD` | `MOD` | `+10 / -1` | `일치` (신규 유틸리티 5종 및 타입 2종 재노출) |
| `src/features/theme/ui/ThemeProvider.tsx` | `MOD` | `MOD` | `+119 / -24` | `일치` (`sourceId` 생성·발행, `ignoreSourceId` 자기 에코 차단, `isThemeMode`, 기본 컨텍스트 폴백 보강) |
| `src/features/theme/ui/ThemeProvider.test.tsx` | `MOD` | `MOD` | `+147 / -1` | `일치` (`TC-01`, `TC-02`, `EC-01`) |
| `src/App.tsx` | `MOD` | `MOD` | `+61 / -17` | `일치` (`isThemeMode` 가드 전환, `remote-shared-showcase:<uuid>` 발행 및 수신 로그 `sourceId` 표시) |
| `src/__tests__/SharedShowcase.integration.test.tsx` | `MOD` | `MOD` | `+27 / -3` | `일치` (`TC-05` 쇼케이스 `sourceId` 발행 및 `dist/@mf-types` 신규 7종 심볼 포함 검증) |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`Props` / `Event Payload` / 함수 인자)**:
  - `ThemeProvider`: 기존 `ThemeProviderProps`(`defaultTheme?`, `children`) 무변경 유지. `setTheme(nextTheme)` 입력은 `isThemeMode`로 런타임 검증.
  - 공통 유틸리티: `normalizeUserId(rawUserId?: string | null)`, `isThemeMode(value: unknown)`, `isSyncMode(value: unknown)`, `extractSchemaIssues(originalError: unknown, maxIssues = 5)`, `formatErrorReport(error: NormalizedError, isDev = false)`.
- **내부 핵심 처리 로직**:
  1. `ThemeProvider`는 최초 렌더 시 `useRef` 지연 초기화로 `remote-shared-theme:<uuid>`를 1회 발급하고, `setTheme` 발행 시 `{ sourceId }` 첨부·`useMfeEvent` 구독 시 `{ ignoreSourceId }` 적용으로 자기 에코를 이벤트 버스 경계에서 차단합니다.
  2. `ThemeContext` 기본값(Provider 외부 호출) 역시 `isThemeMode` 검증 후 `remote-shared-theme-fallback:<uuid>`를 지연 생성해 첨부함으로써 무효 테마 크래시(`Object.entries(undefined)`)와 `anonymous` 발행을 동시에 차단합니다.
  3. `extractSchemaIssues`는 `instanceof ZodError`와 이종 번들러·직렬화 경계 대응 평문 `{ issues: [...] }` 덕타이핑을 모두 지원하며, `formatErrorReport`는 `isDev` 기본값을 `false`(Fail-Closed)로 고정해 운영 화면의 내부 스키마 노출을 원천 차단합니다.
- **출력 데이터 (`Render` / `CustomEvent` / `@mf-types`)**:
  - `mfe:theme-changed` 이벤트: `MfeInspector`에서 `source: remote-shared-theme:<uuid>`로 식별(`anonymous` 0건).
  - `dist/@mf-types`: `normalizeUserId`, `isThemeMode`, `isSyncMode`, `extractSchemaIssues`, `formatErrorReport`, `SchemaIssueDetail`, `ErrorReport`가 순수 TypeScript 타입과 한글 인텔리센스 주석으로 생성됨(`@ark-ui/react` 및 `zod` 타입 누출 `0건`).

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **단독 실행 명령어**: `pnpm --filter @mfe-study/remote-shared test`
  - **통과 현황**: `19`개 파일 / 총 `54`건 중 `54`건 통과 (`0`건 실패, 소요 시간: `6.59s`)
- **루트 전체 회귀 명령어**: `pnpm test`
  - **통과 현황**: `52`개 파일 / 총 `190`건 중 `190`건 통과 (`0`건 실패, 소요 시간: `21.11s`)
- **주요 검증 시나리오 요약**:
  - `[TC-01]` `ThemeProvider` `setTheme` 시 `remote-shared-theme:<uuid>` `sourceId` 첨부, 리렌더 간 ID 일관성 및 독립 인스턴스 간 고유성 검증 통과
  - `[TC-02]` 동일 `sourceId` 재발행 시 `ignoreSourceId` 경계 차단(자기 에코 0회), 외부 `sourceId` 및 레거시 2인자 이벤트 정상 동기화 검증 통과
  - `[TC-03 / EC-02]` `normalizeUserId`(비문자열·공백·null→`null`), `isThemeMode`, `isSyncMode` 및 `exposed/utils` 재노출 검증 통과
  - `[TC-04 / EC-03]` `extractSchemaIssues`(실제 `ZodError` + 직렬화 덕타이핑 + `maxIssues` 제한 + `(root)` 경로 + 비정상 입력 방어) 및 `formatErrorReport`(DEV/PROD 이원화 + `isDev` 미전달 Fail-Closed `false` 기본값) 검증 통과
  - `[TC-05]` 단독 쇼케이스 `remote-shared-showcase:<uuid>` 발행 및 `dist/@mf-types` 신규 7종 심볼 포함·`@ark-ui/react`·폐기 심볼 `0건` 검증 통과
  - `[EC-01]` 무효 테마 문자열 차단 및 `ThemeProvider` 외부 기본 `ThemeContext.setTheme`의 폴백 `sourceId`(`remote-shared-theme-fallback:<uuid>`) 검증 통과

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`, `pnpm check`)**: `통과` (`Checked 211 files in 46ms. No fixes applied.`)
- **타입 검사 (`pnpm --filter @mfe-study/remote-shared typecheck`)**: `통과` (`0 errors`)
- **프로덕션 빌드 및 원격 타입 생성 (`pnpm --filter @mfe-study/remote-shared build`)**: `통과` (`[ Module Federation DTS ] Federated types created correctly`, `dist/@mf-types.zip` 갱신 확인)
- **작업 스코프 격리 (`git status`)**: `shared` (`apps/remote-shared`) 및 `.agents/active-scope.json` 외 타 서비스 폴더 수정 `0건` 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `N/A (해당 없음 — 프론트엔드 공통 모듈 스코프)`

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`
- [x] **[SEC-01] SQL 인젝션 방어 및 입력 스키마 검증**: 외부 문자열 입력(`setTheme`, `isThemeMode`, `isSyncMode`)은 `Zod` 스키마(`safeParse`)로 런타임 검증하며, `normalizeUserId`는 비문자열·공백 입력을 임의 유저로 폴백하지 않고 `null`로 엄격 차단함 (`통과` / SQL은 `N/A`)
- [x] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: `dangerouslySetInnerHTML`, `innerHTML`, `eval` 미사용. DOM 조작은 화이트리스트 테마 토큰(`applyThemeTokensToDocument`)에 한정됨 (`통과`)
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: `formatErrorReport`의 `isDev` 기본값을 `false`(Fail-Closed)로 설정해 운영 환경 또는 파라미터 생략 시 내부 DB·스키마 경로(`devDetails`) 노출을 원천 차단함 (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: 기존 `Port 3004` 고정 및 CORS 설정 변경 없음 (`N/A`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)
- **적용 여부**: `적용`
- [x] **초기화·경로 (#01~#04)**: `main.ts` + `bootstrap.tsx` 2단 분리, `.js` 상대 import `0건`, `generateTypes: true` + `disableDynamicRemoteTypeHints: true` 및 React 서브패스 3종(6종 싱글톤) 유지, `dist/@mf-types` 신규 7종 심볼 포함·`@ark-ui/react` 무누출 검증 통과
- [x] **DOM·스타일 격리 (#05~#06)**: 기존 시맨틱 CSS 변수(`--mfe-*`) 및 `Z_INDEX_TOKENS` 100% 유지
- [x] **상태·라우팅·메모리·스토리지 (#07~#10)**: 단일 원격 `ThemeContext` 유지, `useMfeEvent(..., { ignoreSourceId })`로 자기 에코 차단 및 언마운트 리스너 자동 해제, `createScopedStorage('shared')` 유지
- [x] **단독 테스트·장애 복구 (#11~#14)**: 최하위 공급자 단독 `Vitest` 54건 및 전체 워크스페이스 190건 무회귀 통과

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../../../../../docs/study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`shared`)
- [x] **비동기 경합 및 폭포수 방지 (#01~#02)**: `N/A` (비동기 HTTP 패칭 변경 없음)
- [x] **렌더링 및 금액·시간 정확성 (#03~#04)**: `useRef` 지연 초기화로 리렌더 시 `sourceId` 재발급 차단, `useCallback`/`useMemo` 의존성 정합성 유지
- [x] **레이아웃·테마·접근성 (#13~#16)**: `App.tsx` 및 `ThemeProvider.tsx`의 시맨틱 CSS 변수·`Select` 접근성 속성 그대로 유지

### 4.2 백엔드 API & SQLite DB 점검 (`api` 해당 시)
- [x] `N/A (해당 없음 — 프론트엔드 공통 모듈 스코프)`

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: `./utils` → `./theme` → `./ui` 단방향 의존성 정적 테스트 0건 위반 확인, `extractSchemaIssues`·`formatErrorReport`·`normalizeError` 예외 안전성 검증 완료
- [x] **6대 주석 원칙 ([`Study 02` §3](../../../../../docs/study/02-polyrepo-and-architecture-decisions.md) 및 `GEMINI.md` 기준)**: 신규/수정된 모든 파일의 최상단 `@file/@app/@exposed/@description` 헤더, 인터페이스(`SchemaIssueDetail`, `ErrorReport`) 내부 모든 속성의 `/** */` 한글 인텔리센스 주석, 함수 JSDoc(`@param`/`@returns`), 상수·`useRef` 주석 및 모든 분기문 `// [분기 설명]` 의도 주석 완료

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 중 발견 및 즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **기본 `ThemeContext.setTheme`의 무효 테마 런타임 크래시 (`Red` 단계 포착)** -> 기존 `ThemeContext` 기본값 `setTheme`에 `isThemeMode` 검증이 빠져 있어 잘못된 테마 전달 시 `applyThemeTokensToDocument` 내부 `Object.entries(undefined)`에서 `TypeError`가 발생했습니다. 기본 컨텍스트에도 `if (!isThemeMode(nextTheme)) return;` 방어 가드와 폴백 `sourceId`를 함께 적용해 완전히 차단했습니다. (해결 완료)
2. **`SharedShowcase.integration.test.tsx` 상단 `import` 누락 (`typecheck` 포착)** -> 테스트 편집 중 누락된 `vi`, `MFE_EVENTS`, `mfeEventBus` import와 최상단 `@description`을 즉시 보완해 `tsc --noEmit` 0 에러를 확인했습니다. (해결 완료)
3. **과추상화 유틸리티 선제 제거 (설계 단계 조정)** -> MFE 원격 타입·소비자 스텁 유지 비용을 고려해 호출처가 없거나 과도하게 쪼개진 헬퍼를 배제하고, 실제 중복이 확인된 최소 정예 5종(`normalizeUserId`, `isThemeMode`, `isSyncMode`, `extractSchemaIssues`, `formatErrorReport`)만 노출하도록 스코프를 최소화했습니다. (해결 완료)

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **`formatErrorReport(error, isDev = false)`의 `isDev` 기본값(`false`, Fail-Closed)**: 원격 모듈(`remote-shared`)과 소비자 앱의 빌드 환경이 다를 수 있는 MFE 특성상, `isDev`를 생략해도 운영 화면에 내부 스키마 필드가 유출되지 않도록 기본값을 `false`로 두었습니다. 향후 소비자 앱(`remote-products`, `remote-cart`, `host-*`) 마이그레이션 시 `formatErrorReport(error, import.meta.env.DEV)` 형태로 명시 호출하게 됩니다.
2. **후속 작업 연결 안내**: 멀티레포 스코프 격리 규약에 따라 이번 PR에서는 `remote-shared` 공급과 `@mf-types` 생성만 완료합니다. 머지 후 `remote-products`, `remote-cart`, `host-vite`의 로컬 중복 함수(`normalizeUserId`, `extract*SchemaIssues`, `format*ErrorReport`, `as ThemeMode`/`as SyncMode`)를 `remote_shared/utils` 단일 정본으로 정리하고, 이어서 `host-rspack` 구축 시 바로 재사용할 수 있습니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: [`pull-request.template.md`](../../../../../docs/templates/pull-request.template.md) 기반 PR 초안 및 순수 텍스트 커밋 메시지를 보고하고 **PR 생성 승인만 요청** 진행 (PR 생성 후 즉시 정지)
