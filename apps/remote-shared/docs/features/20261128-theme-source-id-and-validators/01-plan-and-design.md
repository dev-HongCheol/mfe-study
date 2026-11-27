# 📐 [기획 및 설계] `remote-shared` `ThemeProvider` `sourceId` 자기 에코 차단 및 공통 유효성·에러 리포트 유틸리티 노출 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 이벤트 버스, 상태 공유, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `exposes`, `remotes`, `singleton`, `CustomEvent`, `Zod`, `@mf-types` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261128-theme-source-id-and-validators` |
| **서비스 스코프 (`Scope ID`)** | `shared` (`apps/remote-shared`, `Port 3004`) |
| **작업 브랜치** | `shared/feat/theme-source-id-and-validators` (패턴 A) |
| **기술 스택 / 번들러** | `Vite 7 + React 19 + TypeScript 5.7 + @module-federation/vite + Zod + Vitest` |
| **작성일** | `2026-11-28` |
| **작업 규모 평가** | `적정 (단일 PR)` — `ThemeProvider` 및 단독 쇼케이스의 발신자 식별(`sourceId`)·자기 에코 차단 완결과, 다중 앱에 실제 중복 구현된 최소 정예 공통 유효성·에러 리포트 유틸리티 5종을 `./utils`에 노출 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- **배경 1 — `MfeInspector` 표준 4대 이벤트 중 `mfe:theme-changed`만 유일하게 `anonymous`로 남는 공백**:
  - `PR #16`(`remote-shared/utils`), `PR #17`(`remote-cart`), `PR #18`(`host-vite`), `PR #19`(`remote-products`)를 통해 `mfe:cart-updated`, `mfe:auth-changed`, `mfe:sync-mode-changed`는 모두 고유 `sourceId`가 첨부되도록 정비되었습니다.
  - 그러나 `ThemeProvider`(`remote_shared/theme`)의 `setTheme` 및 `ThemeContext` 기본값은 여전히 `sourceId` 없이 `mfe:theme-changed`를 발행하고 있으며, `useMfeEvent(MFE_EVENTS.THEME_CHANGED, ...)`에도 `ignoreSourceId`가 빠져 있어 자기 자신이 발행한 이벤트를 그대로 되받는(Self-Echo) 구조가 남아 있습니다.
- **배경 2 — 여러 프론트엔드 앱에 복붙 중복된 유효성 체크·에러 진단 로직과 편차 발생**:
  - `normalizeUserId`가 `remote-products`와 `remote-cart`에 100% 동일하게 중복 구현되어 있습니다.
  - `Study 05 #10`의 DEV/PROD 스키마 에러 이원화 로직(`extractSchemaIssues`, `format*ErrorReport`)이 `remote-products`(약 100줄)와 `remote-cart`(약 110줄)에 그대로 복사되어 있으며, 이미 최대 개수 제한(`slice(0, 5)`)과 `ZodError` 분기 유무에서 미세한 구현 편차가 발생했습니다.
  - 각 앱의 테마·동기화 모드 `<Select onChange>` 핸들러 4곳에서는 `as ThemeMode` / `as SyncMode` 강제 타입 단언에 의존하고 있습니다.
- **목적 — 4대 이벤트 `anonymous` 0건 완성 및 과추상화 없는 최소 정예 공통 유틸리티 공급**:
  1. `ThemeProvider`가 마운트당 1회 `createMfeEventSourceId('remote-shared-theme')`를 지연 생성해 `mfe:theme-changed` 발행(`{ sourceId }`) 및 구독(`{ ignoreSourceId }`)에 일괄 적용하고, `ThemeContext` 기본값 및 단독 쇼케이스(`App.tsx`)까지 포함해 `remote-shared` 내 `anonymous` 이벤트 발행을 `0건`으로 만듭니다.
  2. MFE 원격 계약(`@mf-types` + 소비자 스텁 유지 비용)을 고려해 불필요한 1줄 래퍼·미사용 가드를 배제하고, **실제 중복이 확인된 최소 정예 유틸리티 5종(`normalizeUserId`, `isThemeMode`, `isSyncMode`, `extractSchemaIssues`, `formatErrorReport`)**만 `remote_shared/utils`에서 노출합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **`ThemeProviderProps` 무변경 100% 하위 호환 및 `useRef` 지연 `sourceId` 고정**:
  - `host-vite`의 `bootstrap.tsx`처럼 `ThemeProvider`는 최상위 루트를 감싸는 독립 테마 엔진입니다. 공개 `ThemeProviderProps` 시그니처를 변경하지 않고 내부 `useRef` 지연 초기화(`remote-shared-theme:<uuid>`)로 발신자 ID를 고정하면, 기존 소비자의 코드를 단 한 줄도 고치지 않고도 즉시 `MfeInspector` `anonymous` 0건과 자기 에코 차단을 달성합니다.
- **이종 번들러/다중 `Zod` 인스턴스 경계에서도 안전한 스키마 이슈 추출(`instanceof` + 덕타이핑 이중 지원)**:
  - MFE 환경에서는 소비자 앱과 `remote-shared`가 별도 번들 컨텍스트를 가질 수 있어 `originalError instanceof ZodError`만으로는 이슈 추출이 실패할 수 있습니다. `ZodError` 인스턴스 검사와 `{ issues: [...] }` 구조적(덕타이핑) 검사를 함께 지원하여 이종 번들러(`Vite` ↔ `Rspack`) 경계에서도 `DEV` 진단 좌표를 100% 복원합니다.
- **`formatErrorReport`의 `isDev` Fail-Closed 기본값(`false`) 설계**:
  - `remote-shared`가 프로덕션 번들로 서빙되거나 호출 측이 `isDev`를 생략하더라도 내부 DB·스키마 경로가 실수로 운영 화면에 노출되지 않도록 `isDev` 기본값을 `false`(운영 안전 모드)로 고정합니다. 소비자 앱은 자신의 번들러 실행 환경인 `import.meta.env.DEV`를 명시 주입합니다.
- **단방향 의존성(`./utils` → `./theme` → `./ui`) 엄격 보존**:
  - 신규 유틸리티(`validators.ts`, `error.ts` 확장)는 최하단 계층인 `./utils` 내부에만 위치하며 `./theme`·`./ui`를 절대 참조하지 않습니다. `ThemeProvider`(`./theme`)가 `./utils`의 `createMfeEventSourceId`와 `isThemeMode`를 정방향으로만 소비합니다.

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**:
  - [Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)](../../../../../docs/features/20261027-phase1-service-contracts/01-plan-and-design.md)
  - [서비스 레지스트리 (`docs/service-registry.md`)](../../../../../docs/service-registry.md)
  - [`remote-shared` `sourceId` 발신자 식별 설계서 (`01-plan-and-design.md`)](../20261124-event-bus-source-id/01-plan-and-design.md)
  - [Study 04 — MFE 14대 실전 이슈 (`#07`, `#09`)](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md)
  - [Study 05 — 풀스택 16대 실전 이슈 (`#09`, `#10`, `#12`)](../../../../../docs/study/05-fullstack-service-real-world-issues.md)
- **참조 항목(섹션 제목)**:
  - `Phase 1 공통 연동 계약 § 5.2 전사 표준 커스텀 이벤트 버스(mfeEventBus) 계약` (`mfe:theme-changed`)
  - `Phase 1 공통 연동 계약 § 5.3.2 remote_shared/theme 실시간 테마 및 CSS 변수·z-index 토큰 계약`
  - `Phase 1 공통 연동 계약 § 5.3.3 remote_shared/utils 공통 유틸리티 및 sharedQueryClient 시그니처 계약`
  - `Phase 1 공통 연동 계약 § 5.4.2 ~ § 5.4.3 비인증(미로그인) 방어 규약` (`normalizeUserId` 임의 유저 폴백 금지)
  - `service-registry.md § 4.2 Module Federation 노출(exposes) 3대 서브패스 시그니처 요약`

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `Zod` (`^3.24.3` / Context7 `/colinhacks/zod`, 근접 인덱스 `v3.25.76` 조회)
- **핵심 스펙 및 주의사항**:
  1. **`schema.safeParse(data)`의 비예외 판별 유니온 반환**:
     - `.safeParse(value)`는 실패 시 예외를 던지지 않고 `{ success: false, error: ZodError }`를 반환하므로, `isThemeMode(value)` 및 `isSyncMode(value)` 타입 가드의 런타임 판별에 예외 비용 없이 안전하게 사용할 수 있습니다.
  2. **`ZodError.issues` 구조 (`code`, `path`, `message`)**:
     - `result.error.issues`의 각 항목은 `code: string`, `path: Array<string | number>`, `message: string`을 포함하며 루트 레벨 실패 시 `path`는 빈 배열 `[]`입니다.
     - 따라서 `path.length === 0`이면 `'(root)'`, 숫자 인덱스는 `[index]`, 문자열 필드는 첫 세그먼트 `field` / 후속 세그먼트 `.field`로 변환하면 `[0].price`, `items[2].name` 등 일관된 진단 좌표를 생성할 수 있습니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> 승인된 작업 스코프(`.agents/active-scope.json`: `shared` / `apps/remote-shared`) 내에서 생성·수정되는 파일 목록입니다.

| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 (서비스 루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `docs/features/20261128-theme-source-id-and-validators/01-plan-and-design.md` | 본 1단계 기획 및 상세 설계 문서 |
| `NEW` | `docs/features/20261128-theme-source-id-and-validators/02-tdd-spec.md` | 2단계 TDD 명세서 |
| `NEW` | `docs/features/20261128-theme-source-id-and-validators/03-code-review.md` | *(5단계-A 작성 예정)* PR 생성 전 심층 코드 리뷰 문서 |
| `MOD` | `docs/todo.md` | 진행 중 작업 등록 및 5단계-C 머지 직전 완료 이관 |
| `NEW` | `src/features/utils/model/validators.ts` | 공통 유효성 체크·정규화 유틸리티 3종(`normalizeUserId`, `isThemeMode`, `isSyncMode`) 구현 |
| `NEW` | `src/features/utils/model/validators.test.ts` | `normalizeUserId`, `isThemeMode`, `isSyncMode` 단위 테스트(`Co-location`) |
| `MOD` | `src/features/utils/model/error.ts` | `SchemaIssueDetail`, `ErrorReport` 인터페이스 및 `extractSchemaIssues`, `formatErrorReport` 추가 |
| `MOD` | `src/features/utils/model/error.test.ts` | `extractSchemaIssues`(ZodError·덕타이핑·최대 개수·루트 경로) 및 `formatErrorReport`(DEV/PROD·Fail-Closed 기본값) 단위 테스트 보강 |
| `MOD` | `src/exposed/utils.ts` | `normalizeUserId`, `isThemeMode`, `isSyncMode`, `extractSchemaIssues`, `formatErrorReport`, `SchemaIssueDetail`, `ErrorReport` 재노출 추가 |
| `MOD` | `src/features/theme/ui/ThemeProvider.tsx` | `THEME_EVENT_SOURCE_PREFIX` 기반 `useRef` 지연 `sourceId` 생성, `setTheme` 발행 시 `{ sourceId }` 첨부, `useMfeEvent` `{ ignoreSourceId }` 자기 에코 차단, `isThemeMode` 적용, `ThemeContext` 기본값 폴백 `sourceId` 및 검증 보강 |
| `MOD` | `src/features/theme/ui/ThemeProvider.test.tsx` | `setTheme` 발행 시 `meta.sourceId` 검증, 리렌더 시 동일 `sourceId` 유지, 자기 에코 차단(중복 동기화 0회), 외부/레거시 이벤트 정상 반영, 잘못된 테마 차단 및 `ThemeContext` 기본값 폴백 테스트 추가 |
| `MOD` | `src/App.tsx` | 단독 쇼케이스 `isThemeMode` 가드 적용(`as ThemeMode` 제거), 샘플 장바구니 이벤트 발행 시 `remote-shared-showcase:<uuid>` `sourceId` 첨부 및 수신 로그 `sourceId` 표기 |
| `MOD` | `src/__tests__/SharedShowcase.integration.test.tsx` | `dist/@mf-types` 내 신규 공개 심볼(`normalizeUserId`, `isThemeMode`, `isSyncMode`, `extractSchemaIssues`, `formatErrorReport`, `SchemaIssueDetail`, `ErrorReport`) 포함 검증 및 단독 쇼케이스 `sourceId` 발행 검증 추가 |
| `MOD` | `(루트) todo.md` & `docs/service-registry.md` | *(5단계-C 머지 직전 갱신)* `ThemeProvider` `sourceId` 적용 완료 및 `remote_shared/utils` 신규 노출 시그니처 반영 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`
> 모든 신규 인터페이스와 내부 속성에는 인텔리센스 한글 설명 주석(`/** ... */`)을 필수로 작성합니다.

### 5.1 공통 유효성 체크·정규화 유틸리티 (`src/features/utils/model/validators.ts`)
```ts
/**
 * Props 또는 이벤트로 전달받은 사용자 ID를 정규화합니다 ([SSOT § 5.4.2, § 5.4.3]).
 * null, undefined, 비문자열, 빈 문자열 또는 공백만 있는 문자열은 임의 유저로 폴백하지 않고 null(비로그인)을 반환합니다.
 *
 * @param rawUserId - Props 또는 이벤트로 전달된 원본 사용자 ID
 * @returns 양끝 공백이 제거된 유효 사용자 ID 문자열 또는 null(비로그인)
 */
export function normalizeUserId(rawUserId?: string | null): string | null;

/**
 * 알 수 없는 입력값이 표준 실시간 테마 모드('indigo' | 'emerald' | 'rose' | 'dark')인지 런타임 검증하는 타입 가드입니다.
 *
 * @param value - Select onChange 등 외부에서 전달된 미검증 입력값
 * @returns 유효한 ThemeMode이면 true
 */
export function isThemeMode(value: unknown): value is ThemeMode;

/**
 * 알 수 없는 입력값이 표준 상태 동기화 비교 모드('mode-a-event' | 'mode-b-query')인지 런타임 검증하는 타입 가드입니다.
 *
 * @param value - Select onChange 등 외부에서 전달된 미검증 입력값
 * @returns 유효한 SyncMode이면 true
 */
export function isSyncMode(value: unknown): value is SyncMode;
```

### 5.2 스키마 검증 실패 진단 및 DEV/PROD 에러 리포트 (`src/features/utils/model/error.ts`)
```ts
/**
 * @description Zod 스키마 검증 실패(RESPONSE_SCHEMA_INVALID) 시 개별 필드 불일치 좌표를 나타내는 인터페이스 ([Study 05 #10])
 */
export interface SchemaIssueDetail {
  /** 실패한 데이터 경로 문자열 (예: '[0].createdAt', 'category', '(root)') */
  path: string;

  /** Zod 이슈 코드 (예: 'invalid_type', 'too_big') */
  code: string;

  /** 상세 실패 사유 메시지 */
  message: string;
}

/**
 * @description 실행 환경(DEV vs PROD)별로 이원화된 표준 에러 표시 모델 인터페이스 ([Study 05 #10])
 */
export interface ErrorReport {
  /** 머신 판독용 표준 에러 코드 (예: 'RESPONSE_SCHEMA_INVALID', 'OUT_OF_STOCK') */
  code: string;

  /** 사용자에게 표시할 안내 문구 (운영 환경에서는 내부 스키마 구조를 숨긴 안전 문구) */
  userMessage: string;

  /** 개발 환경(DEV)에서만 노출되는 스키마 불일치 필드 목록 (운영 환경에서는 항상 빈 배열) */
  devDetails: SchemaIssueDetail[];
}

/**
 * 원본 예외(ZodError 인스턴스 또는 이종 번들러·직렬화 경계를 넘은 issues 배열 객체)에서 실패 필드 좌표 목록을 추출합니다.
 *
 * @param originalError - NormalizedError.originalError에 보존된 원본 예외 값
 * @param maxIssues - 추출할 최대 이슈 개수 (기본값: 5, 0 이하 또는 비유한 수 전달 시 빈 배열 반환)
 * @returns 구조화된 SchemaIssueDetail 배열
 */
export function extractSchemaIssues(
  originalError: unknown,
  maxIssues?: number,
): SchemaIssueDetail[];

/**
 * 정규화된 에러 객체를 실행 환경(DEV vs PROD)에 따라 이원화된 ErrorReport로 변환합니다 ([Study 05 #10]).
 * MFE 프로덕션 안전성(Fail-Closed)을 위해 isDev 기본값은 false이며, 소비자 앱은 자신의 import.meta.env.DEV를 명시 전달합니다.
 *
 * @param error - normalizeError로 표준화된 에러 객체
 * @param isDev - 호출 측 소비자 앱의 개발 환경 여부 (기본값: false)
 * @returns 환경별로 안전하게 분리된 ErrorReport 객체
 */
export function formatErrorReport(error: NormalizedError, isDev?: boolean): ErrorReport;
```

### 5.3 `ThemeProvider` `sourceId` 발신 및 자기 에코 차단 설계 (`src/features/theme/ui/ThemeProvider.tsx`)
1. **발신자 식별자 접두사 상수**:
   - `ThemeProvider` 마운트 인스턴스용: `'remote-shared-theme'` → `remote-shared-theme:<uuid>` (`useRef`로 마운트당 1회 지연 생성해 리렌더 간 불변 유지)
   - `ThemeContext` 기본값(Provider 외부 폴백)용: `'remote-shared-theme-fallback'` → 최초 호출 시 1회 지연 생성·캐시
2. **발행·구독 자기 에코 차단 흐름**:
   - `setTheme(nextTheme)` 호출 시 `isThemeMode(nextTheme)`로 먼저 유효성을 검증하고, 통과한 경우에만 상태·스토리지·`:root` CSS 변수를 갱신한 뒤 `mfeEventBus.emit(MFE_EVENTS.THEME_CHANGED, { theme: nextTheme, timestamp }, { sourceId: themeSourceId })`를 발행합니다.
   - `useMfeEvent(MFE_EVENTS.THEME_CHANGED, handler, { ignoreSourceId: themeSourceId })`로 구독하므로, 자신이 방금 발행한 이벤트는 이벤트 버스 경계에서 즉시 차단되고 외부 앱/패널/레거시 2인자 발행 이벤트만 수신해 동기화합니다.
   - `host-vite`의 `MfeInspector`는 `ignoreSourceId` 없이 구독하는 관찰자이므로 `source: remote-shared-theme:<uuid>`가 정상 기록되어 표준 4대 이벤트 전체에서 `anonymous` 0건을 달성합니다.

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`shared` 전용)
- **적용 여부**: `적용`
- **Module Federation 설정 (`exposes` / `remotes` / `shared`)**:
  - **노출 모듈 (`exposes`)**: 기존 3대 서브패스(`'./ui'`, `'./theme'`, `'./utils'`) 유지.
    - `'./theme'`: 공개 `ThemeProviderProps` / `ThemeContextValue` 변경 없음(100% 하위 호환).
    - `'./utils'`: `normalizeUserId`, `isThemeMode`, `isSyncMode`, `extractSchemaIssues`, `formatErrorReport`, `SchemaIssueDetail`, `ErrorReport` 추가 재노출.
  - **소비 모듈 (`remotes`)**: `N/A` (최하위 공통 공급자).
  - **공유 의존성 (`shared` & `singleton`)**: 기존 6종 싱글톤(`react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client`, `@tanstack/react-query`) 그대로 유지.
  - **원격 타입 생성 (`dts`)**: 4단계 `vite build`로 `dist/@mf-types.zip` 및 `dist/@mf-types/**/*.d.ts`를 재생성하여 신규 공개 심볼이 포함되고 `@ark-ui/react` 참조 및 폐기 심볼이 `0건`임을 검증합니다.
- **단독 실행(Standalone) 및 호스트 결합 마운트 처리**:
  - 단독 실행(`App.tsx`)에서도 `isThemeMode` 타입 가드와 `remote-shared-showcase:<uuid>` `sourceId`를 적용해 단독·호스트 결합 양쪽에서 `anonymous` 발행을 제거합니다.
- **마이크로 앱 간 통신 및 상태 공유 (`CustomEvent` / `sharedQueryClient`)**:
  - `./utils` → `./theme` → `./ui` 단방향 의존성 불변식을 100% 유지합니다.
  - 본 PR 머지 후 `remote-products`, `remote-cart`, `host-vite` 및 향후 `host-rspack`은 각 스코프에서 중복 구현된 `normalizeUserId`·`extract*SchemaIssues`·`format*ErrorReport` 및 `as ThemeMode`/`as SyncMode` 캐스팅을 `remote_shared/utils` 단일 정본으로 대체할 수 있습니다.
- **공통 UI 컴포넌트 (`Ark UI`) 및 스타일 격리 (CSS 변수 / 프리픽스)**:
  - 변경 없음 (기존 13종 컴포넌트 및 4종 시맨틱 테마 100% 유지).

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `N/A (해당 없음 — 최하위 프론트엔드 공통 모듈 스코프)`
