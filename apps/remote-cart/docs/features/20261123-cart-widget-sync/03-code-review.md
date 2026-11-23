# 🔍 [코드 리뷰 및 품질·보안 검증서] 장바구니 원격 앱(`./CartWidget`, `Rspack`) 및 `Mode A vs Mode B` 동기화 구축 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)과 이종 번들러(`Rspack` ↔ `Vite`) 실증 빌드·무-Shim 타입 검사 통과 직후, 5단계 PR 생성 승인을 요청하기 전에 작성했습니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 모든 파일을 일일이 열지 않고도 구현 일치도, 이종 번들러 검증 증거, 보안·MFE 14대·풀스택 16대 방어 점검 결과를 한눈에 파악할 수 있도록 정리했습니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 | 설계서(`01-plan`) 계획 | 실제 구현 상태 | 일치 여부 및 비고 |
| :--- | :--- | :---: | :--- |
| `apps/remote-cart/docs/todo.md`, `01-plan`, `02-tdd`, `03-code-review` | `cart` 스코프 문서 4종 | `NEW` | `일치` |
| `apps/remote-cart/package.json`, `tsconfig.json`, `rsbuild.config.ts`, `vitest.config.ts` | 최초 `Rsbuild(Rspack)` + MF 2.0 + `Vitest` 설정 | `NEW` | `보완` — `@module-federation/rsbuild-plugin`을 Rsbuild 1.7.6 호환 최신 안정판(`^2.9.3`)으로 정합성 보정 |
| `apps/remote-cart/src/rsbuild-env.d.ts`, `main.ts`, `bootstrap.tsx`, `App.tsx` | 무-Shim 환경 타입, 2단 부트스트랩, 단독 실행 쇼케이스 | `NEW` | `일치` (`@ark-ui/react` 임시 Shim `0줄`) |
| `apps/remote-cart/src/exposed/CartWidget.tsx` | `./CartWidget` 공개 진입 컴포넌트 (`Mode A`/`Mode B` `QueryClient` 선택) | `NEW` | `일치` (`Mode B` 시 `createMfeQueryClient` `0회`) |
| `apps/remote-cart/src/features/cart/model/cart-schema.ts`, `use-cart-queries.ts` | `Zod` 스키마, 파생 합계, 지연 스토리지, `DEV`/`PROD` 리포트, 조회·수정·삭제 훅 | `NEW` | `일치` (`createdAt` 실사용 포함) |
| `apps/remote-cart/src/features/cart/api/cart-api.ts` | `GET/POST/DELETE /api/cart` API 호출 및 `AbortSignal` 지연 유틸 | `NEW` | `일치` |
| `apps/remote-cart/src/features/cart/ui/` (7개 컴포넌트 + `cart.css`) | `CartHeaderBar`, `CartItemRow`, `CartSummaryCard`, `CartSkeleton`, `CartErrorBanner`, `CartContent`, `CartWidgetView` + `.cart-*` 격리 스타일 | `NEW` | `일치` (`1 컴포넌트 = 1 파일`, `PascalCase`) |
| `apps/remote-cart/src/testing/**` + 단위·통합 테스트 8개 파일 | `msw/node` + 로컬 스텁 + `TC-01~06`, `EC-01~04` | `NEW` | `일치` |
| `(루트) vitest.config.ts`, `pnpm-lock.yaml`, `docs/study/08-*.md` | 루트 통합 테스트 등록, 의존성 잠금, `Study 08` 심화 Q&A (`Part 3`) 추가 | `MOD` | `일치` (`docs/` 전역 허용) |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`Props` / `Event Payload` / `API`)**:
  - `CartWidgetProps`: `userId`, `hostType`, `syncMode`, `simulateDelay`, `delayMs`, `cssIsolated`, `apiBaseUrl` (생략 시 `mfe:auth-changed`, `mfe:sync-mode-changed`, `mfe:css-isolation-changed` 이벤트 구독, 단 `userId` 미전달·`null` 시 임의 유저 폴백 금지)
  - 백엔드 API 응답: `GET /api/cart?userId=...`, `POST /api/cart`, `DELETE /api/cart/:id?userId=...` (`ApiResponse<T>` + `Zod` 검증)
- **내부 핵심 처리 로직**:
  - **`Mode A ('mode-a-event')`**: 조건부 지연 생성한 독립 `QueryClient` 사용 + `useMfeEvent(MFE_EVENTS.CART_UPDATED)` 수신 시 자체 캐시 재조회 + 내부 `[+1]`/`[삭제]`/`[비우기]` 성공 시 `mfe:cart-updated` 이벤트 발행 (`sharedQueryClient` 미접근)
  - **`Mode B ('mode-b-query')`**: `remote_shared/utils`의 싱글톤 `sharedQueryClient` 공유 + 이벤트 수신 의존 `0%` + `sharedQueryClient.invalidateQueries(['cart'])` 자동 감지 + `onMutate` `cancelQueries` 응답 역전 방지
  - **파생 합계 & CSS 격리 실험**: `calculateCartTotals`로 렌더링 본문에서 정수 합계 즉시 계산, `cssIsolated={false}` 시 `data-css-isolated="false"` 시각적 오염 시뮬레이션 표시
- **출력 데이터 (`Render` / `Bundle` / `@mf-types`)**:
  - `./CartWidget` UI 렌더링 (`dist/remoteEntry.js`, `dist/mf-manifest.json`, `dist/@mf-types.zip` — `Rsbuild v1.7.6` `3.15s` 빌드 완료)

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **실행 명령어**: `pnpm --filter @mfe-study/remote-cart test` / `pnpm test`
- **통과 현황**:
  - `remote-cart` 단독: **8개 파일 / 28건 전원 통과 (`0`건 실패)**
  - 루트 전체 통합: **42개 파일 / 126건 전원 통과 (`0`건 실패, 소요 시간: `12.00s`)**
- **주요 검증 시나리오 요약**:
  - `[TC-01 ~ TC-04]` `Zod` 스키마·파생 합계·지연 스토리지, API/`AbortSignal` 취소, `CartItemRow`/`CartSummaryCard` 중복 클릭 잠금, `CartHeaderBar`/`CartErrorBanner`/`CartContent` 5대 상태 분기 검증 통과
  - `[TC-05 ~ TC-06]` `Mode A` vs `Mode B` 대칭 동기화, 지연 스켈레톤, `cssIsolated` 토글, 단독 쇼케이스 및 5대 아키텍처 무결성 정적 검증 통과
  - `[EC-01 ~ EC-04]` 비로그인 `GET /api/cart` `0회` 차단 + `mfe:auth-changed` 전환, `OUT_OF_STOCK` 에러 복구, 빈 상태/`500` 재시도/`DEV`·`PROD` 리포트 이원화, 언마운트 좀비 리스너 `0회` 차단 검증 통과

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` (`165 files checked`, 에러 `0건`, `LF` 준수)
- **이종 번들러 프로덕션 빌드 (`rsbuild build`)**: `통과` (`remote-shared:3004` 연동 `@mf-types.zip` 자동 수신 + `dist/remoteEntry.js` · `dist/mf-manifest.json` · `dist/@mf-types.zip` 생성, `3.15s`)
- **무-Shim 타입 검사 (`tsc --noEmit`)**: `통과` (`@ark-ui/react` 임시 Shim `0줄`, `dist/@mf-types/**/*.d.ts` 내 `@ark-ui/react` 참조 `0건`)
- **작업 스코프 격리 (`verify-scope.mjs`)**: `cart` 스코프 및 전역 허용 경로(`vitest.config.ts`, `pnpm-lock.yaml`, `docs/`) 외 타 앱 수정 `0건` 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `N/A (해당 없음)`

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`
- [x] **[SEC-01] 입력·응답 스키마 검증**: 외부 경계(`GET/POST/DELETE /api/cart` 응답, `localStorage` 환경 설정, `mfeEventBus` 페이로드) 모두 `Zod` 런타임 스키마로 검증함 (`통과`)
- [x] **[SEC-02] XSS 및 DOM 보안**: `dangerouslySetInnerHTML`, `innerHTML`, `eval` 미사용, 모든 텍스트는 React JSX 자동 이스케이프로 렌더링 (`통과`)
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: 비로그인(`userId` 미전달/`null`/공백) 시 `useCartQuery` `enabled: false` + 뮤테이션 가드 + 로그인 안내 UI 3중 차단 적용, `PROD` 환경에서는 `CartErrorReport.devDetails`를 빈 배열로 격리해 내부 스키마 필드명 노출 차단 (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: `rsbuild.config.ts`에 `port: 3003`, `strictPort: true`, `cors: { origin: '*' }` 및 `ky` 10초 타임아웃·`AbortSignal` 취소 연동 적용 (`통과`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)
- **적용 여부**: `적용`
- [x] **초기화·경로 (#01~#04)**: `src/main.ts` + `src/bootstrap.tsx` 2단 분리, `getCartScopedStorage()` 지연 초기화, `output.assetPrefix: 'auto'`, `strictPort: true` & `cors`, `@mf-types` 양방향 동기화 + `disableDynamicRemoteTypeHints: true` + `watchOptions.ignored` 적용 완료
- [x] **DOM·스타일 격리 (#05~#06)**: 전역 `CSS Reset` 및 태그 선택자 미사용(`.cart-*` 프리픽스 격리), `cssIsolated=false` 비교 실험도 `.cart-widget-root[data-css-isolated='false']` 범위 내로 안전 격리 완료
- [x] **상태·라우팅·메모리·스토리지 (#07~#10)**: `remote_shared/theme` 단일 Context 참조, 라우터 미포함(`No-Router` 패턴), `useMfeEvent` 자동 클린업(언마운트 후 추가 호출 `0회` 테스트 입증), `mfe:cart:preferences` 스코프 프리픽스 적용 완료
- [x] **단독 테스트·장애 복구 (#11~#14)**: `vitest.config.ts` 로컬 스텁 Alias + `msw/node`로 타 서버 없이 단독 `28건` 통과, 조회/뮤테이션 에러 인라인 복구 지원 완료

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../../../../../docs/study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`cart` 적용)
- [x] **비동기 경합 및 폭포수 방지 (#01~#02)**: `[+1]`/`[삭제]`/`[비우기]` 진행 중 버튼 비활성화(`disabled` + `aria-busy`) 및 `onMutate` `cancelQueries` 적용 완료
- [x] **렌더링 및 금액·시간 정확성 (#03~#04)**: `CartItemRow`에 DB 고유 `item.id` `key` 부여, `useEffect` 없이 `calculateCartTotals` 파생 상태 계산, 정수 연산 + `formatCurrency` + `formatDate(item.createdAt)` 적용 완료
- [x] **레이아웃·테마·접근성 (#13~#16)**: `CartSkeleton`(`min-height: 92px`) 1:1 매칭으로 CLS 방지, `#hex` 하드코딩 `0건`(`var(--mfe-*)` 전용), `aria-busy` · `role="alert"` 적용, `.cart-item-main` `min-width: 0` 말줄임 + `tabular-nums` 적용 완료

### 4.2 백엔드 API & SQLite DB 점검
- `N/A (Step 1.1에서 구현 완료된 api-server 소비)`

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: 단방향 계층(`model` → `api` → `ui` → `exposed`) 유지 및 `normalizeError`로 안전 변환 완료
- [x] **6대 주석 원칙**: 모든 파일 최상단 헤더, 모든 인터페이스 내부 속성의 `/** */` 한글 설명 주석, 함수·컴포넌트 JSDoc, 상태·상수 주석 및 분기문 의도 주석 100% 반영 완료

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 중 발견 및 즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **구버전 `@module-federation/rsbuild-plugin@0.18.4`와 `Rsbuild v1.7.6` 간 `mf-manifest.json` 중복 출력 충돌 및 `@mf-types.zip` 다운로드 실패** → 최신 호환 버전인 `@module-federation/rsbuild-plugin@^2.9.3`으로 업그레이드하여 `rsbuild build`(`3.15s`) + `@mf-types.zip` 양방향 동기화 + 무-Shim `tsc --noEmit` 100% 통과 확인 (해결 완료)
2. **`CartWidget.integration.test.tsx` 내 Biome `noNonNullAssertion` 경고 3건 및 `CartHeaderBar.test.tsx` 중복 텍스트 매칭 2건** → 구조 분해 + 존재 검증(`expect(...).toBeDefined()`) 및 정확한 배지 텍스트 매칭으로 정리하여 `Biome` 에러 `0건` 및 `Vitest` `42개 파일 / 126건` 전원 통과 확인 (해결 완료)
3. **`Vite dev`(`remote-shared:3004`) ↔ `Rsbuild dev`(`remote-cart:3003`) 새로고침 시 `jsxDEV is not a function` 흰 화면 경합** → `rsbuild.config.ts`의 `shared`에 `'react/jsx-runtime'`, `'react/jsx-dev-runtime'`, `'react-dom/client'` 3개 서브패스를 싱글톤으로 명시 추가(`shareStrategy` 기본값 유지, `eager: true` 미사용)하고 정적 회귀 테스트 보강 완료 (해결 완료)
4. **`use-cart-queries.ts` 내 중복 모드 분기·불필요한 `onSuccess` `if (!validUserId)` 가드 및 단독 쇼케이스 빈 장바구니 재테스트 불편** → `activeQueryClient` 기반 공통 헬퍼 `syncCartAfterMutation` 추출 및 `updatedItem.userId`/확정 `userId` 사용으로 중복 제거, 단독 쇼케이스(`App.tsx`)에 `[샘플 상품 담기 (POST /api/cart)]` 버튼과 통합 테스트 추가 완료 (해결 완료)
5. **불필요한 `cssIsolated` 시각 연출 토글 제거 및 `Study 04 #05` 현업 스타일 도구별 가이드 보강** → `remote-cart`는 이미 `.cart-*` 프리픽스 및 정적 회귀 테스트(`body|html|button|h1~h5|*` 금지)로 CSS 격리를 준수하므로, `CartWidget`/`CartWidgetView`/`CartHeaderBar`/`cart.css`/`App`/`cart-schema`에서 `cssIsolated` 토글·연출 코드를 일괄 제거하고 `Study 04 #05`에 Tailwind CSS(Preflight/prefix)·CSS Modules·Zero-runtime CSS-in-JS·Shadow DOM 비교 가이드를 보강 완료 (`remote-cart 8개 파일 / 26건`, 루트 전체 `42개 파일 / 124건` 통과 — `remote-shared` 미사용 `CSS_ISOLATION_CHANGED` 정리는 추후 `shared` 스코프 백로그로 분리)

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **프로젝트 최초 `Rspack (Rsbuild)` ↔ `Vite` 이종 번들러 MF 2.0 연동 실증**: `Vite 7`로 빌드된 `remote-shared(3004)`의 `mf-manifest.json`과 `@mf-types.zip`을 `Rsbuild(Rspack)` 앱(`remote-cart:3003`)이 임시 타입 Shim `0줄` 상태로 자동 수신·빌드·타입체크하는 전체 파이프라인을 검증했습니다.
2. **현재 브랜치에 함께 포함된 `Study 08` 보강분**: 논의 중 요청하신 [docs/study/08-abort-signal-and-async-cancellation.md](../../../../../docs/study/08-abort-signal-and-async-cancellation.md) `Part 3. 실무 심화 Q&A` (`Q1 ~ Q6`) 업데이트도 전역 허용 경로(`docs/`)로 본 PR에 함께 포함되어 있습니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: PR 초안 및 순수 텍스트 커밋 메시지 보고 후, 승인자(사용자)의 **PR 생성 승인**을 대기합니다 (`5단계-A` 완료 — 머지는 PR 확인 후 별도 승인 시 `5단계-C`에서 진행).
