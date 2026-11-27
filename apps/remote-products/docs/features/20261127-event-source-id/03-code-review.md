# 🔍 [코드 리뷰 및 품질·보안 검증서] `remote-products` 이벤트 발신자 식별(`sourceId`) 적용 및 이종 번들러·캐시 정합화 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어(호스트, 리모트, 컴포넌트, 모킹 등)와 범용 영문 키워드(`PR`, `TDD`, `API`, `XSS`, `CORS` 등)로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 (서비스 루트 기준) | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 라인 수 (`+ / -`) | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `docs/features/20261127-event-source-id/01-plan-and-design.md` | 1단계 기획·설계서 작성 | `NEW` | 신규 | `일치` |
| `docs/features/20261127-event-source-id/02-tdd-spec.md` | 2단계 TDD 명세서 작성 | `NEW` | 신규 | `일치` |
| `docs/features/20261127-event-source-id/03-code-review.md` | 5단계-A 심층 코드 리뷰서 작성 | `NEW` | 신규 | `일치` |
| `docs/todo.md` | 진행 중 작업 등록 | `MOD` | `+1 / -1` | `일치` (5단계-C 머지 직전 완료 이관 예정) |
| `src/exposed/ProductList.tsx` | `useRef` 지연 초기화 `createMfeEventSourceId('remote-products')` + `<QueryClientProvider key={effectiveSyncMode}>` | `MOD` | `+12 / -1` | `일치` |
| `src/features/catalog/ui/ProductCatalogView.tsx` | 필수 `eventSourceId: string` prop 추가 및 뮤테이션 훅 전달 | `MOD` | `+5 / -0` | `일치` |
| `src/features/catalog/model/use-catalog-queries.ts` | `PRODUCTS_EVENT_SOURCE_PREFIX`, 필수 `eventSourceId: string` 옵션 및 `Mode A` `{ sourceId: eventSourceId }` 첨부 | `MOD` | `+17 / -4` | `일치` |
| `src/App.tsx` | 단독 쇼케이스 실시간 로그에 `meta?.sourceId` 기록·표시 | `MOD` | `+21 / -9` | `일치` |
| `src/testing/stubs/remote-shared-utils.ts` | 최신 `remote-shared/utils` 정본(`sourceId`, `ignoreSourceId`, `createMfeEventSourceId`, 표준 4대 이벤트) 1:1 동기화 | `MOD` | `+239 / -31` | `일치` (폐기된 `CSS_ISOLATION_CHANGED` 제거 포함) |
| `vite.config.ts` | React 서브패스 3종(`jsx-runtime`, `jsx-dev-runtime`, `react-dom/client`) 추가해 6종 싱글톤 통일 | `MOD` | `+13 / -0` | `일치` |
| `src/__tests__/ProductList.integration.test.tsx` | `TC-01~TC-04`, `EC-01~EC-02` 통합·정적 회귀 테스트 5건 추가 및 `TC-01` `sourceId` 검증 강화 | `MOD` | `+161 / -11` | `일치` |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`Props` / `Event`)**: 기존 `ProductListProps` 공개 계약은 100% 무변경 유지. 내부적으로 `ProductList`가 최초 렌더 시 `createMfeEventSourceId('remote-products')`로 인스턴스당 1회 고유 `sourceId`를 생성해 `ProductCatalogView` → `useAddToCartMutation`으로 필수 주입.
- **내부 핵심 처리 로직**:
  - `Mode A ('mode-a-event')`: `POST /api/cart` 성공 시 `ProductList`에서 주입받은 `eventSourceId`를 `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, eventPayload, { sourceId: eventSourceId })` 3번째 인자로 전달.
  - `Mode B ('mode-b-query')`: 이벤트 발행 `0회` 유지, `sharedQueryClient.cancelQueries` + `invalidateQueries({ queryKey: ['cart'] })`만 수행. `<QueryClientProvider key={effectiveSyncMode}>` 리마운트로 모드 전환 시 `QueryObserver` 바인딩 일관성 유지.
- **출력 데이터 (`Event Meta` / `Render`)**:
  - `host-vite`의 `MfeInspector` 이벤트 스트림과 `remote-products` 단독 쇼케이스(`App.tsx`)에서 `source: remote-products:<uuid>`(`source=remote-products:<uuid>`)로 발신자가 정확히 표시되며, 수신 페이로드 객체에는 예약 메타 키(`__mfeSourceId`)가 `Zod strip`으로 누출되지 않음.

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **단독 테스트 실행 명령어**: `pnpm --filter @mfe-study/remote-products test`
- **단독 통과 현황**: `7`개 파일 / 총 `38`건 중 `38`건 통과 (`0`건 실패)
- **전체 워크스페이스 테스트 실행 명령어**: `pnpm test`
- **전체 통과 현황**: `51`개 파일 / 총 `179`건 중 `179`건 통과 (`0`건 실패)
- **주요 검증 시나리오 요약**:
  - `[TC-01]` `Mode A` 장바구니 담기 시 `mfeEventBus.emit` 3번째 인자 `{ sourceId: /^remote-products:.+/ }` 호출, 외부 구독자 `meta.sourceId` 수신 및 페이로드 내 `__mfeSourceId` 미누출 검증 통과.
  - `[TC-02]` 동일 `ProductList` 인스턴스의 리렌더 간 동일 `sourceId` 유지 및 재마운트 새 인스턴스의 고유 `sourceId` 발급 검증 통과.
  - `[TC-03]` 단독 쇼케이스(`App.tsx`) 로그인 전환·장바구니 담기 후 실시간 로그에 `source=remote-products:` 표시 검증 통과.
  - `[TC-04]` `vite.config.ts` 6종 싱글톤 선언 및 로컬 스텁의 표준 4대 이벤트(`CSS_ISOLATION_CHANGED` 미존재)·`createMfeEventSourceId` 정합성 검증 통과.
  - `[EC-01]` `ProductList`가 `Mode A → Mode B → Mode A` 왕복 전환(`QueryClientProvider` 리마운트) 이후에도 동일 인스턴스의 `sourceId`가 일관 유지됨을 검증 통과.
  - `[EC-02]` `Mode A → Mode B` 전환(`rerender`) 후 `<QueryClientProvider key={effectiveSyncMode}>` 리마운트, 상품 조회 및 `Mode B` 캐시 무효화(`emit` 0회) 검증 통과.

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` (`pnpm check` — `Checked 209 files in 46ms. No fixes applied.`)
- **타입 검사 (`tsc --noEmit`)**: `통과` (`pnpm --filter @mfe-study/remote-products typecheck` — 최신 `remote-shared` `@mf-types` 무-Shim 기준 0 errors)
- **프로덕션 빌드 (`vite build`)**: `통과` (`dist/remoteEntry.js`, `dist/mf-manifest.json`, `dist/@mf-types.zip` 생성 및 React 서브패스 3종 prebuild 청크 생성 확인)
- **작업 스코프 격리 (`verify-scope.mjs`)**: `products` (`apps/remote-products`) 범위 외 타 서비스 코드 수정 0건 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `N/A (해당 없음)`

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`
- [x] **[SEC-01] SQL 인젝션 방어 및 입력 스키마 검증**: `remote-shared-utils` 스텁 및 정본 이벤트 버스에서 모든 4대 표준 이벤트 페이로드를 `Zod` 스키마(`safeParse`)로 검증하며, 예약 메타 키(`__mfeSourceId`)는 파싱 단계에서 자동 제거(`strip`)됨. (`통과`)
- [x] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: `App.tsx`의 `source={log.sourceId}` 출력은 React 기본 텍스트 이스케이프를 사용하며 `dangerouslySetInnerHTML`/`eval` 등 위험 API 사용 0건. (`통과`)
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: 기존 `userId` 비인증 3중 차단 가드(`SSOT § 5.4.2`)가 그대로 유지되며, `sourceId`에는 사용자 토큰·개인정보가 전혀 포함되지 않고 `remote-products:<uuid>`만 기록됨. (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: `Port 3002` 고정(`strictPort: true`), `cors: true`, 기존 API 엔드포인트 경계 유지. (`통과`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)
- **적용 여부**: `적용`
- [x] **초기화·경로 (#01~#04)**: `main.ts` + `bootstrap.tsx` 2단 분리 유지, `createMfeEventSourceId`를 모듈 최상단이 아닌 컴포넌트·훅 내부 `useRef` 지연 초기화로 호출해 `DeferredRemoteProxy` 동기 평가 경합 원천 차단, `@mf-types` 양방향 무-Shim 소비·생성 검증 통과.
- [x] **DOM·스타일 격리 (#05~#06)**: 전역 CSS Reset 미사용 및 `.prod-*` / `var(--mfe-*)` 스타일 격리 100% 유지.
- [x] **상태·라우팅·메모리·스토리지 (#07~#10)**: `useMfeEvent` 자동 해제 유지, `createScopedStorage('products')` 유지, `vite.config.ts` 6종 싱글톤 통일로 이종 번들러(`Rspack` ↔ `Vite`) 공유 경합 사전 차단, `<QueryClientProvider key={effectiveSyncMode}>` 리마운트로 `Mode A ↔ Mode B` 전환 시 `QueryObserver` Split-Brain 방지.
- [x] **단독 테스트·장애 복구 (#11~#14)**: `src/testing/stubs/remote-shared-utils.ts`를 최신 `remote-shared/utils` 정본과 1:1 동기화하여 타 서버 기동 없이 단독 테스트 38건 통과.

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../../../../docs/study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`products`)
- [x] **비동기 경합 및 폭포수 방지 (#01~#02)**: 기존 `addingProductId` 잠금 및 `Mode B` `cancelQueries` 방어 유지.
- [x] **렌더링 및 금액·시간 정확성 (#03~#04)**: `sourceId`를 `useRef`에 보관해 불필요한 리렌더·ID 재발급 차단.
- [x] **레이아웃·테마·접근성 (#13~#16)**: 기존 `.prod-*`, `var(--mfe-*)`, `tabular-nums`, `role="alert"` 100% 유지.

### 4.2 백엔드 API & SQLite DB 점검 (`api`)
- **적용 여부**: `N/A (해당 없음 — 프론트엔드 원격 앱 스코프)`

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: 순환 참조 없이 `ProductList` → `ProductCatalogView` → `use-catalog-queries` 단방향 흐름 유지.
- [x] **6대 주석 원칙 (`GEMINI.md` 기준)**: 수정·추가된 모든 인터페이스(`ProductCatalogViewProps`, `UseAddToCartMutationOptions`, `StandaloneCartEventLog`, 스텁 인터페이스 3종)의 내부 속성마다 `/** ... */` 한글 주석, 상수·Ref·분기문 의도(Why) 주석 및 파일 헤더 동기화 완료.

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 중 발견 및 즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **동일 파일 다중 `edit_file` 호출 시 포맷터 훅과 import 추가가 경합한 현상** -> `ProductList.tsx`와 `use-catalog-queries.ts`의 import를 재점검·복원하고, 테스트·`typecheck`·`vite build`·`Biome`·전체 179건 테스트로 최종 무결성을 검증 완료. (해결 완료)
2. **Red 단계 테스트 작성 시 임시 타입 캐스팅(`as unknown as`) 잔존** -> 스텁을 정본 2인자 시그니처(`handler(payload, meta?)`)로 동기화한 직후 테스트의 불필요한 `as unknown as` 캐스팅을 제거해 타입 안전성을 확보. (해결 완료)
3. **[승인자 리뷰 반영] `use-catalog-queries.ts` 내 불필요한 `fallbackSourceIdRef` 방어 분기(YAGNI) 제거** -> `ProductCatalogView`와 `useAddToCartMutation`은 모두 `@exposed false` 내부 모듈이고 호출처가 `ProductList` 단일 경로뿐이므로 `eventSourceId: string`을 필수 인자로 승격해 `sourceId` 생성 책임을 `ProductList.tsx` 단일 지점으로 응집하고, `EC-01` 테스트를 `Mode A → Mode B → Mode A` 왕복 전환 시 동일 `sourceId` 유지 검증으로 전환 완료. (해결 완료)

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **`ProductList` 단일 생성 지점 및 필수 타입 주입**: `ProductListProps` 공개 계약은 유지한 채 내부 `ProductList`에서 `remote-products:<uuid>`를 1회 발급하고 하위 `ProductCatalogView` · `useAddToCartMutation`에 필수(`string`)로 전달해 `host-vite`의 `App.tsx → useHostAuth(hostSourceId: string)` 패턴과 일관화했습니다.
2. **선행 호환성 정비 포함**: 다음 작업인 `host-rspack`(`Rsbuild/Rspack`) 연동 시 이종 번들러 충돌을 예방하기 위해 `vite.config.ts`에 React 서브패스 3종(`react/jsx-runtime`, `react/jsx-dev-runtime`, `react-dom/client`)을 포함해 전사 6종 싱글톤을 통일했고, `ProductList.tsx`에 `<QueryClientProvider key={effectiveSyncMode}>` 리마운트를 함께 반영했습니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: 이상 없으므로 PR 초안 및 커밋 메시지를 보고하고 **PR 생성 승인만 요청**합니다. (머지 승인은 PR 생성 후 별도 진행)
