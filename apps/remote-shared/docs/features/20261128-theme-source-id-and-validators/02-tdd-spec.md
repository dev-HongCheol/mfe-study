# 🧪 [TDD 명세서] `remote-shared` `ThemeProvider` `sourceId` 자기 에코 차단 및 공통 유효성·에러 리포트 유틸리티 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `Vitest`, `CustomEvent`, `Zod`, `@mf-types` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `shared` (`apps/remote-shared`, `Port 3004`) |
| **테스트 러너 및 모킹 도구** | `Vitest` (`jsdom` 환경) + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom` |
| **단위 테스트 경로 (`Co-location`)** | `src/features/theme/ui/ThemeProvider.test.tsx`, `src/features/utils/model/validators.test.ts`, `src/features/utils/model/error.test.ts` |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/SharedShowcase.integration.test.tsx` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/remote-shared test` (루트 전체: `pnpm test`) |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 작성 전 먼저 실패하는 테스트(`Red`)로 구현할 목록입니다.

### TC-01: `ThemeProvider` `setTheme` 호출 시 `remote-shared-theme:<uuid>` `sourceId` 발행 및 리렌더 간 동일 ID 유지 (`ThemeProvider.test.tsx`)
- **사전 조건 (`Given`)**:
  - `MfeInspector` 역할의 관찰자 리스너가 `ignoreSourceId` 없이 `mfeEventBus.subscribe(MFE_EVENTS.THEME_CHANGED, inspectorSpy)`로 구독 중이다.
  - `ThemeProvider`가 마운트되어 있다.
- **실행 동작 (`When`)**:
  - 소비자 컴포넌트에서 `setTheme('dark')`를 호출하고 이어서 `setTheme('rose')`를 한 번 더 호출한다.
- **기대 결과 (`Then`)**:
  1. `inspectorSpy`가 총 2회 호출되며, 두 호출 모두 두 번째 인자 `meta.sourceId`가 `'remote-shared-theme:'`로 시작하는 비어 있지 않은 문자열이어야 한다(`anonymous` 0건).
  2. 동일 `ThemeProvider` 마운트 생명주기 동안 발생한 1회차와 2회차 `meta.sourceId`가 정확히 동일해야 한다.
  3. 서로 독립적으로 마운트된 두 개의 `ThemeProvider` 인스턴스는 서로 다른 고유 `sourceId`를 생성해야 한다.

### TC-02: `ThemeProvider` 자기 에코(Self-Echo) 차단 및 외부/레거시 `mfe:theme-changed` 정상 동기화 (`ThemeProvider.test.tsx`)
- **사전 조건 (`Given`)**:
  - `ThemeProvider`가 마운트되어 있고, `window.localStorage.setItem`을 스파이한다.
- **실행 동작 (`When`)**:
  1. `setTheme('dark')`를 호출한다.
  2. 이어서 외부 발신자(`{ sourceId: 'host-vite:peer-1' }`)로 `mfeEventBus.emit(MFE_EVENTS.THEME_CHANGED, { theme: 'emerald', timestamp })`를 발행한다.
  3. 이어서 구버전 레거시 2인자 호출(`sourceId` 미지정)로 `mfeEventBus.emit(MFE_EVENTS.THEME_CHANGED, { theme: 'rose', timestamp })`를 발행한다.
- **기대 결과 (`Then`)**:
  1. `setTheme('dark')` 호출 시 자신이 발행한 `mfe:theme-changed`가 `ignoreSourceId`로 차단되어 `localStorage.setItem('mfe:shared:theme', ...)`가 자기 에코로 중복 호출되지 않고 정확히 1회만 호출된다.
  2. 외부 `sourceId`로 발행된 `'emerald'` 이벤트는 정상 수신되어 화면 테마·`data-mfe-theme`·`localStorage`가 즉시 `'emerald'`로 동기화된다.
  3. 레거시 2인자 `'rose'` 이벤트 역시 하위 호환으로 정상 수신되어 `'rose'`로 동기화된다.

### TC-03: 공통 유효성 체크·정규화 유틸리티 3종 (`normalizeUserId`, `isThemeMode`, `isSyncMode`) (`validators.test.ts`)
- **사전 조건 (`Given`)**: `src/features/utils/model/validators.ts` 및 `src/exposed/utils.ts`가 준비된 상태
- **실행 동작 (`When`)**:
  1. `normalizeUserId`에 `'  user-1  '`, `'user-2'`, `''`, `'   '`, `null`, `undefined`를 각각 전달한다.
  2. `isThemeMode`에 4종 유효 테마(`'indigo'`, `'emerald'`, `'rose'`, `'dark'`)와 무효 값(`'blue'`, `''`, `null`, `123`)을 전달한다.
  3. `isSyncMode`에 2종 유효 모드(`'mode-a-event'`, `'mode-b-query'`)와 무효 값(`'mode-c'`, `''`, `undefined`, `{}`)을 전달한다.
- **기대 결과 (`Then`)**:
  1. `normalizeUserId`는 유효 문자열만 `trim()`해 반환하고, `null`·`undefined`·빈 문자열·공백 문자열은 모두 `null`을 반환한다(임의 유저 폴백 없음).
  2. `isThemeMode`와 `isSyncMode`는 정확히 표준 리터럴 값에만 `true`, 나머지 모든 값에 `false`를 반환한다.
  3. `exposed/utils.ts`에서 3개 함수가 모두 정상 재노출되어 있어야 한다.

### TC-04: 공통 스키마 이슈 추출(`extractSchemaIssues`) 및 DEV/PROD 에러 리포트(`formatErrorReport`) (`error.test.ts`)
- **사전 조건 (`Given`)**:
  - 배열 중첩 스키마(`z.array(z.object({ id, price, createdAt }))`)의 `safeParse` 실패로 생성된 실제 `ZodError`와, 이종 번들러·직렬화 경계를 모사한 평문 `{ issues: [...] }` 객체를 준비한다.
- **실행 동작 (`When`)**:
  1. `extractSchemaIssues(zodError)` 및 `extractSchemaIssues(serializedIssuesError)`를 호출한다.
  2. `RESPONSE_SCHEMA_INVALID` 코드를 가진 `NormalizedError`에 대해 `formatErrorReport(error, true)`(DEV)와 `formatErrorReport(error, false)`(PROD)를 호출한다.
  3. 일반 비즈니스 에러(`OUT_OF_STOCK`)에 대해 `formatErrorReport(businessError, true)`와 `formatErrorReport(businessError, false)`를 호출한다.
- **기대 결과 (`Then`)**:
  1. `extractSchemaIssues`는 `ZodError` 인스턴스와 직렬화된 평문 `{ issues }` 객체 모두에서 `path`(`[0].price`, `category`, `(root)` 등), `code`, `message`를 정확히 추출한다.
  2. `formatErrorReport(schemaError, true)`(DEV)는 `devDetails`에 실패 필드 좌표를 포함하고 원본 `userMessage`를 유지한다.
  3. `formatErrorReport(schemaError, false)`(PROD)는 `devDetails`가 빈 배열 `[]`이며 `userMessage`가 안전한 운영 안내 문구(`'일시적인 데이터 형식 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'`)로 치환된다.
  4. 일반 비즈니스 에러(`OUT_OF_STOCK`)는 DEV/PROD 모두 `devDetails: []`이며 기존 `error.message`를 그대로 보존한다.

### TC-05: 단독 쇼케이스 `sourceId` 발행 및 `dist/@mf-types` 신규 심볼 포함·무누출 검증 (`SharedShowcase.integration.test.tsx`)
- **사전 조건 (`Given`)**:
  - `App.tsx` 단독 쇼케이스 렌더링 상태 및 4단계 `vite build` 이후 생성된 `dist/@mf-types/**/*.d.ts`
- **실행 동작 (`When`)**:
  1. 쇼케이스의 `이벤트 버스 & 유틸리티` 탭에서 `샘플 장바구니 이벤트 발행` 버튼을 클릭하고 `mfe:cart-updated` 관찰자 리스너의 `meta.sourceId`를 확인한다.
  2. `dist/@mf-types/**/*.d.ts` 전체 파일을 검사한다.
- **기대 결과 (`Then`)**:
  1. 쇼케이스에서 발행된 샘플 장바구니 이벤트에 `remote-shared-showcase:`로 시작하는 `sourceId`가 첨부되어야 한다.
  2. `dist/@mf-types`에 `normalizeUserId`, `isThemeMode`, `isSyncMode`, `extractSchemaIssues`, `formatErrorReport`, `SchemaIssueDetail`, `ErrorReport`가 포함되고, `@ark-ui/react` 참조 및 폐기 심볼은 `0건`을 유지해야 한다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`

### EC-01: `ThemeProvider` 잘못된 테마 무시 및 `ThemeContext` 기본값(Provider 외부) 폴백 `sourceId` 방어 (`ThemeProvider.test.tsx`)
- **사전 조건 (`Given`)**: `mfeEventBus.subscribe(MFE_EVENTS.THEME_CHANGED, inspectorSpy)`로 구독 중
- **실행 동작 (`When`)**:
  1. `ThemeProvider` 내부에서 잘못된 테마 문자열(`'neon' as ThemeMode`)로 `setTheme`을 호출한다.
  2. `ThemeProvider`로 감싸지 않은 컴포넌트에서 `useTheme().setTheme('emerald')` 및 `useTheme().setTheme('invalid' as ThemeMode)`를 호출한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. 잘못된 테마 문자열 호출 시 상태·DOM·`localStorage`가 변경되지 않고 `mfe:theme-changed` 이벤트도 발행되지 않는다(`0회`).
  2. `ThemeProvider` 외부 기본 컨텍스트 `setTheme('emerald')` 호출 시에도 `meta.sourceId`가 `'remote-shared-theme-fallback:'`로 시작하는 유효한 문자열로 발행되며, 잘못된 테마는 발행이 차단된다.

### EC-02: `normalizeUserId` 런타임 비문자열 방어 (`validators.test.ts`)
- **사전 조건 (`Given`)**: 외부 JS/이벤트에서 타입이 깨진 값이 런타임으로 유입된 상황
- **실행 동작 (`When`)**: `normalizeUserId(123 as unknown as string)`, `normalizeUserId({} as unknown as string)`, `normalizeUserId('\t\n  ')`를 호출한다.
- **기대 결과 및 폴백 동작 (`Then`)**: 예외를 던지지 않고 모두 안전하게 `null`을 반환한다.

### EC-03: `extractSchemaIssues` 최대 개수 제한·빈/오염 입력 방어 및 `formatErrorReport` Fail-Closed 기본값 (`error.test.ts`)
- **사전 조건 (`Given`)**: 이슈가 8개 들어 있는 `ZodError`, 빈 `path: []`를 가진 루트 이슈, 비정상 입력(`null`, `undefined`, 일반 `Error`, `issues`가 배열이 아닌 객체)
- **실행 동작 (`When`)**:
  1. `extractSchemaIssues(manyIssuesError)`(기본값 `5`), `extractSchemaIssues(manyIssuesError, 2)`, `extractSchemaIssues(manyIssuesError, 0)`, `extractSchemaIssues(manyIssuesError, -1)`을 호출한다.
  2. `extractSchemaIssues(rootIssueError)`, `extractSchemaIssues(null)`, `extractSchemaIssues(new Error('boom'))`을 호출한다.
  3. `formatErrorReport(schemaError)`를 **두 번째 인자 `isDev` 생략** 상태로 호출한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. 기본값은 최대 `5`건, `maxIssues=2`는 `2`건, `0` 이하 또는 `NaN`은 빈 배열 `[]`을 반환한다.
  2. 빈 `path: []`는 `'(root)'`로 포맷되며, `null`·일반 `Error`·깨진 객체는 예외 없이 `[]`을 반환한다.
  3. `isDev`를 생략한 `formatErrorReport(schemaError)`는 **Fail-Closed 원칙**에 따라 운영 안전 모드(`devDetails: []`, 안전한 사용자 안내 문구)로 동작한다.

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**: `N/A` (`remote-shared`는 최하위 공통 공급자)
- **네트워크 / 브라우저 API 모킹 (`src/testing/setup.ts`)**: `jsdom` 환경의 실제 `window.dispatchEvent`, `window.localStorage`, `document.documentElement` 및 `vi.spyOn`을 사용하여 DOM 토큰 주입, `localStorage` 쓰기 횟수(자기 에코 0회 검증), `mfeEventBus` 메타 전파를 실제 경로로 검증합니다.
- **테스트 픽스처**: 실제 `Zod` 스키마(`z.array(z.object(...))`)의 `.safeParse()`로 생성한 실제 `ZodError`와 이종 번들러 직렬화 상황을 재현하는 평문 `{ issues: [...] }` 더미 객체를 함께 사용합니다.

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`shared` 전용)
- **적용 여부**: `적용`
- [x] **단독 실행(Standalone) 렌더링 검증**: `App.tsx` 단독 쇼케이스에서 테마 선택 및 샘플 장바구니 이벤트 발행(`sourceId` 포함)이 정상 동작하는가?
- [x] **단방향 의존성 검증**: `./utils` → `./theme` → `./ui` 역방향 참조가 `0건`인가?
- [x] **이벤트 버스 및 자기 에코 차단 검증**: `ThemeProvider`가 `remote-shared-theme:<uuid>`로 발행하고 자기 에코를 차단하며 외부/레거시 이벤트는 정상 수신하는가?
- [x] **원격 타입 산출물 검증**: `vite build`로 생성된 `dist/@mf-types/**/*.d.ts`에 신규 공개 심볼이 모두 포함되고 `@ark-ui/react` 참조 및 폐기 심볼이 `0건`인가?

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
- **적용 여부**: `N/A (해당 없음)`

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [x] 모든 단위 및 통합 테스트(`Vitest`, 단독 + 루트 전체)가 통과(`Green`)했는가?
- [x] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 등)을 준수했는가?
- [x] `Biome` 포맷팅·린트 검사(`LF` 줄바꿈 포함), `tsc --noEmit`, `vite build` (`dist/@mf-types.zip` 재생성)를 통과했는가?
- [ ] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md`, `apps/remote-shared/docs/todo.md`, 그리고 [`docs/service-registry.md`](../../../../../docs/service-registry.md)를 최신 상태로 업데이트했는가?
