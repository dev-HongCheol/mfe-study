# 🔍 [코드 리뷰 및 품질·보안 검증서] `remote-shared` React 서브패스 3종 명시 공유 통일 및 미사용 이벤트 계약 정리 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어(호스트, 리모트, 컴포넌트, 이벤트 버스, 폴백 등)와 범용 영문 키워드(`PR`, `TDD`, `MFE`, `Zod`, `@mf-types` 등)로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 라인 수 (`+ / -`) | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `apps/remote-shared/vite.config.ts` | `federation.shared`에 `'react/jsx-runtime'`, `'react/jsx-dev-runtime'`, `'react-dom/client'` (`singleton: true`, `requiredVersion: '^19.1.0'`) 명시 추가 | `MOD` | `+13 / -0` | `일치` (`dist/mf-manifest.json` 6개 공유 엔트리 실물 검증 완료) |
| `apps/remote-shared/src/features/utils/model/contracts.ts` | 미사용 `CSS_ISOLATION_CHANGED`, `CssIsolationChangedEventPayload`, `cssIsolationChangedEventSchema` 제거 및 표준 4종 정리 | `MOD` | `+1 / -25` | `일치` |
| `apps/remote-shared/src/exposed/utils.ts` | 폐기된 `CssIsolationChangedEventPayload`, `cssIsolationChangedEventSchema` 재노출 제거 | `MOD` | `+0 / -2` | `일치` |
| `apps/remote-shared/src/features/utils/model/event-bus.ts` | 미등록/폐기 이벤트 이름으로 런타임 `emit`/`subscribe` 호출 시 `TypeError` 크래시 차단 가드 추가 | `MOD` | `+13 / -0` | `일치` (구버전 독립 배포 리모트 호환성 방어) |
| `apps/remote-shared/src/features/utils/model/event-bus.test.ts` | 표준 4종 계약 정합성, `CSS_ISOLATION_CHANGED` 미포함, `exposed/utils` 공개 심볼 및 폐기 이벤트 런타임 방어 단위 테스트 추가 | `MOD` | `+40 / -1` | `일치` |
| `apps/remote-shared/src/__tests__/SharedShowcase.integration.test.tsx` | `vite.config.ts` React 서브패스 3종 명시 공유 정적 회귀 검증 및 `dist/@mf-types/**/*.d.ts` 내 폐기 이벤트 심볼 `0건` 검증 추가 | `MOD` | `+30 / -2` | `일치` |
| `docs/features/20261027-phase1-service-contracts/01-plan-and-design.md` | `§ 5.2.1`(`CSS_ISOLATION_CHANGED`), `§ 5.4.3`(`cssIsolated`) 정리 및 `§ 5.5` React 서브패스 3종 공유 규약 동기화 | `MOD` | `+6 / -6` | `보완` (`§ 5.4.3` `CartWidgetProps`에 현행 `delayMs?: number`도 함께 정합화) |
| `apps/remote-shared/docs/todo.md` & `docs/features/20261123-cleanup-subpaths-and-unused-events/*` | 진행 중 등록 및 `01-plan-and-design.md`, `02-tdd-spec.md`, `03-code-review.md` 작성 | `NEW/MOD` | `문서 4종` | `일치` |
| `.agents/active-scope.json` | 활성 스코프 `shared` 및 브랜치·단계 동기화 | `MOD` | `+5 / -5` | `일치` |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`Config` / `Event Bus`)**:
  - `vite.config.ts`는 `react`, `react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom`, `react-dom/client`, `@tanstack/react-query` 6개 공유 엔트리를 싱글톤으로 선언합니다.
  - `mfeEventBus.emit` / `subscribe`는 표준 4종 이벤트(`CART_UPDATED`, `AUTH_CHANGED`, `THEME_CHANGED`, `SYNC_MODE_CHANGED`)를 정적 타입으로 수신하며, 런타임 비정상/폐기 이벤트 이름 입력도 수신 경계에서 안전하게 검사합니다.
- **내부 핵심 처리 로직**:
  - `mfeEventBus`는 `MFE_EVENT_SCHEMAS[eventName]` 조회 직후 `!schema` 가드로 미등록/폐기 이벤트를 조기 차단하고, 등록된 4종 이벤트에 대해서는 기존과 동일하게 `schema.safeParse` 검증을 통과한 데이터만 전달합니다.
- **출력 데이터 (`Build Artifacts` / `@mf-types`)**:
  - `vite build` 결과물 `dist/mf-manifest.json`의 `shared` 배열에 3개 React 서브패스 프리빌드 청크가 `singleton: true, requiredVersion: "^19.1.0"`으로 정확히 기록됩니다.
  - 재생성된 `dist/@mf-types.zip` 및 `dist/@mf-types/**/*.d.ts` (28개 파일) 전수 검사에서 `@ark-ui/react` 참조 `0건` 및 폐기 이벤트 심볼 `0건`이 확인됩니다.

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **실행 명령어**: `pnpm --filter @mfe-study/remote-shared test` 및 루트 전체 `pnpm test` (`vitest run`)
- **통과 현황**:
  - **3단계 `Red` 확인**: `18개 파일 / 38건` 중 신규·강화 4건 의도된 실패 확인 (`TC-01`, `TC-02`, `TC-03`, `EC-01`)
  - **4단계 `Green` (`remote-shared` 단독)**: **`18`개 파일 / `38`건 전원 통과** (`0`건 실패, 소요 시간: `7.05s`)
  - **워크스페이스 전체 회귀 검증 (`pnpm test`)**: **`42`개 파일 / `127`건 전원 통과** (`0`건 실패, 소요 시간: `15.55s` — `remote-shared`, `remote-products`, `remote-cart`, `api-server`, `root-harness` 전수 통과)
- **주요 검증 시나리오 요약**:
  - `[TC-01]` `MFE_EVENTS` 4종 및 `MFE_EVENT_SCHEMAS` 1:1 정합성, `CSS_ISOLATION_CHANGED` 미포함 및 `exposed/utils.ts` 내 `cssIsolationChangedEventSchema` 미노출 통과
  - `[TC-02]` `vite.config.ts` `federation.shared` 내 `'react/jsx-runtime'`, `'react/jsx-dev-runtime'`, `'react-dom/client'` 3종 `singleton: true` + `^19.1.0` 정적 회귀 통과
  - `[TC-03]` 재생성된 `dist/@mf-types/**/*.d.ts` 전 파일(28개) 내 `@ark-ui/react` 참조 `0건` 및 폐기 이벤트 심볼 `0건` 실물 검증 통과
  - `[EC-01]` 폐기된 `'mfe:css-isolation-changed'` 이름으로 런타임 `emit`·`subscribe` 호출 시 예외 없이 `console.warn` 출력 후 `false` / 안전한 빈 해제 함수 반환 통과

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` (`Checked 165 files in 39ms. No fixes applied.`)
- **타입 검사 (`tsc --noEmit`)**: `통과` (`apps/remote-shared/tsconfig.json` 에러 `0`건)
- **프로덕션 빌드 (`vite build`)**: `통과` (`dist/remoteEntry.js`, `dist/mf-manifest.json`, `dist/@mf-types.zip`, `dist/@mf-types/` 28개 `.d.ts` 정상 생성)
- **작업 스코프 격리 (`verify-scope.mjs`)**: `shared` (`apps/remote-shared`) 및 전역 허용 루트 문서(`docs/features/20261027-phase1-service-contracts/01-plan-and-design.md`, `.agents/active-scope.json`) 외 타 서비스 폴더 수정 `0건` 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `N/A (해당 없음 — api 스코프 SQL 미변경)`

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`

- [x] **[SEC-01] SQL 인젝션 방어 및 입력 스키마 검증**: 이벤트 버스 수신·발행 경계에서 등록된 4종 이벤트의 `Zod` 런타임 스키마 검증을 유지하고, 미등록/폐기 이벤트 입력에 대한 `!schema` 조기 차단 가드를 추가해 런타임 예외 유발을 원천 방지했습니다. (`통과`)
- [x] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: `dangerouslySetInnerHTML`, `innerHTML`, `eval` 사용이 전무하며 DOM 직접 조작이 추가되지 않았습니다. (`통과`)
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: 미등록 이벤트 경고 로그(`console.warn`)에는 이벤트 이름만 출력하며 페이로드 원문·토큰·스택 트레이스 등 민감 정보를 노출하지 않습니다. (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: Port `3004`, `strictPort: true`, `cors: true`, `dev.disableDynamicRemoteTypeHints: true` 기존 정책이 그대로 유지됩니다. (`통과`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)

- **적용 여부**: `적용`
- [x] **초기화·경로 (#01~#04)**: `main.ts` + `bootstrap.tsx` 2단 분리(#01), `cors: true` & `strictPort: true`(#03), `@mf-types.zip` 정상 재생성·`@ark-ui/react` 누출 `0건` 및 폐기 심볼 `0건`(#04), **이종 번들러(`Vite` ↔ `Rspack`) React 서브패스 3종 명시 공유 통일**을 모두 완료했습니다.
- [x] **DOM·스타일 격리 (#05~#06)**: 기존 `.mfe-ui-*` 프리픽스 및 `--mfe-z-*` 계층 토큰이 회귀 없이 유지됩니다.
- [x] **상태·라우팅·메모리·스토리지 (#07~#10)**: `useMfeEvent` 자동 리스너 해제(#09), `createScopedStorage` 격리(#10), 싱글톤 `sharedQueryClient`(#07) 모두 기존 단위·통합 테스트를 100% 통과합니다.
- [x] **단독 테스트·장애 복구 (#11~#14)**: 타 서버 기동 없이 `remote-shared` 단독 `38건` 및 워크스페이스 전체 `127건`이 전원 통과합니다.

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../../../../../docs/study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`shared`)
- [x] **비동기 경합 및 폭포수 방지 (#01~#02)**: 기존 `Button` 로딩 잠금 및 `httpClient` `AbortSignal` 동작 회귀 없음.
- [x] **렌더링 및 금액·시간 정확성 (#03~#04)**: 기존 `formatCurrency`, `formatDate`, `formatRelativeTime` 회귀 없음.
- [x] **레이아웃·테마·접근성 (#13~#16)**: 기존 13종 UI 컴포넌트 및 4종 시맨틱 테마 회귀 없음.

### 4.2 백엔드 API & SQLite DB 점검 (`api` 해당 시)
- [x] **백엔드 스코프 해당 없음 (`N/A`)**

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: `./utils` → `./theme` → `./ui` 단방향 의존성(`0건` 역참조)이 정적 테스트로 지속 보장되며, `mfeEventBus`의 미등록/폐기 이벤트 호출에도 예외 없이 안전하게 격리됩니다(#10, #12).
- [x] **6대 주석 원칙 ([`Study 02` §3](../../../../../docs/study/02-polyrepo-and-architecture-decisions.md) 및 [`GEMINI.md`](../../../../../GEMINI.md) 기준)**: 수정된 `vite.config.ts`, `contracts.ts`, `event-bus.ts`, 테스트 2종의 파일 최상단 헤더, 인터페이스 내부 속성 주석, 상수 주석, `// [분기 설명]` 의도 주석을 모두 최신 상태로 동기화했습니다.

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 및 TDD 과정에서 발견·즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **폐기 이벤트 이름(`'mfe:css-isolation-changed'`)의 런타임 유입 시 `TypeError` 크래시 가능성 사전 포착 및 방어**:
   - `MFE_EVENT_SCHEMAS`에서 `CSS_ISOLATION_CHANGED`를 제거한 뒤 구버전 리모트나 외부 코드가 해당 이벤트 이름으로 `mfeEventBus.emit` 또는 `subscribe`를 호출하면 `MFE_EVENT_SCHEMAS[eventName]`이 `undefined`가 되어 `schema.safeParse(...)`에서 `TypeError`가 발생할 수 있음을 설계·리뷰 단계에서 식별했습니다.
   - `event-bus.ts`의 `emit`·`subscribe` 양쪽에 `!schema` 조기 차단 가드를 추가하고 `EC-01` 단위 테스트로 검증 완료했습니다.
2. **루트 SSOT(`§ 5.4.3 CartWidgetProps`) 내 `delayMs` 및 `§ 5.5` React 서브패스 3종 규약 동시 정합화**:
   - `docs/features/20261027-phase1-service-contracts/01-plan-and-design.md`의 `CSS_ISOLATION_CHANGED` 및 `cssIsolated`를 정리하면서, 이미 `Step 1.4`에서 구현된 `CartWidgetProps.delayMs?: number`와 `§ 5.5` React 서브패스 3종 공유 규약도 함께 정합화해 정본 문서와 구현 간 괴리를 완전히 없앴습니다.

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **타 서비스(`remote-products`, `remote-cart`) 테스트 스텁 및 `remote-products/vite.config.ts` 후속 분리**:
   - 물리적 멀티레포 격리(`verify-scope.mjs`) 원칙에 따라 타 서비스 폴더는 본 `shared` PR에서 수정하지 않았습니다.
   - 두 앱의 본 코드와 테스트는 `CSS_ISOLATION_CHANGED`를 미사용 중이어서 루트 전체 `42개 파일 / 127건` 테스트가 100% 통과하며, 각 앱의 테스트 스텁(`remote-shared-utils.ts`) 및 `remote-products/vite.config.ts` 서브패스 통일은 해당 스코프 후속 브랜치에서 정리하면 깔끔합니다.
2. **5단계-A PR 초안 보고 및 PR 생성 승인 요청**:
   - 본 코드 리뷰서와 아래 PR 초안·커밋 메시지를 확인해 주시고, **커밋·푸시 및 PR 생성(`gh pr create`) 진행 여부**를 승인해 주시면 **PR 생성까지만 수행하고 즉시 멈추어** GitHub PR 확인 및 별도 머지 결정을 대기하겠습니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: 이상 없으므로 [`pull-request.template.md`](../../../../../docs/templates/pull-request.template.md) 기반 PR 초안 및 순수 텍스트 커밋 메시지 보고 진행
