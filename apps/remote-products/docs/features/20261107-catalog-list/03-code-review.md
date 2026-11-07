# 🔍 [코드 리뷰 및 품질·보안 검증서] 상품 목록 원격 앱(`remote-products`) 구축 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어(호스트, 리모트, 컴포넌트, 모킹 등)와 범용 영문 키워드(`PR`, `TDD`, `API`, `SQL`, `XSS`, `CORS` 등)로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 라인 수 (`+ / -`) | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `package.json` | `@ark-ui/react`, `clsx` 미설치 및 MF 2.0·RHF·Zod·TanStack Query 설정 | `NEW` | `+52 / -0` | `일치` |
| `tsconfig.json` | `@mf-types/*` 경로 매핑 및 `strict: true` 설정 | `NEW` | `+30 / -0` | `일치` |
| `vite.config.ts` | Port `3002`, `strictPort: true`, `cors: true`, `./ProductList` 노출 및 `dts` 설정 | `NEW` | `+55 / -0` | `일치` |
| `vitest.config.ts` | `jsdom` 환경 및 `remote_shared/*` 로컬 테스트 스텁 Alias 매핑 | `NEW` | `+35 / -0` | `일치` |
| `index.html` | 단독 실행(Standalone) HTML 엔트리 | `NEW` | `+16 / -0` | `일치` |
| `src/vite-env.d.ts` | Vite 환경 타입 및 `@mf-types/remote_shared` 내 `HTMLArkProps`·`Ark*.RootProps` 호환 선언 | `NEW` | `+91 / -0` | `보완 (@ark-ui/react 미설치 상태에서 @mf-types 정적 타입 검사 100% 통과 지원)` |
| `src/main.ts` | `import('./bootstrap.js')` 비동기 동적 임포트 (`Study 04 #01`) | `NEW` | `+8 / -0` | `일치` |
| `src/bootstrap.tsx` | `ThemeProvider` 래핑 및 `App` 마운트 | `NEW` | `+25 / -0` | `일치` |
| `src/App.tsx` | 단독 실행(Port 3002) 쇼케이스 (유저/모드/테마/지연 전환 및 이벤트 로그 모니터) | `NEW` | `+152 / -0` | `일치` |
| `src/exposed/ProductList.tsx` | MF 노출 진입점 (`./ProductList`) — `Mode A` vs `Mode B` `QueryClientProvider` 분기 및 `RemoteErrorBoundary` 래핑 | `NEW` | `+116 / -0` | `일치` |
| `src/features/catalog/model/catalog-schema.ts` | Zod 스키마(`productFilterSchema`, `productEntitySchema`), 카테고리 상수, `mfe:products` 로컬 스토리지 영속화 | `NEW` | `+170 / -0` | `일치` |
| `src/features/catalog/api/catalog-api.ts` | `createApiClient` 기반 `fetchProducts`(`AbortSignal` + 지연 시뮬레이션), `postCartItem` | `NEW` | `+149 / -0` | `일치` |
| `src/features/catalog/model/use-catalog-queries.ts` | `useProductsQuery` 및 `useAddToCartMutation` (`Mode A` 이벤트 발행 vs `Mode B` `cancelQueries` + `invalidateQueries`) | `NEW` | `+159 / -0` | `일치` |
| `src/features/catalog/ui/ProductFilterBar.tsx` | `remote_shared/ui` `Select`·`Button` + `React Hook Form` + `Zod` 검색/카테고리 필터 바 | `NEW` | `+152 / -0` | `일치` |
| `src/features/catalog/ui/ProductGridSkeleton.tsx` | 실제 카드 높이(`min-height: 240px`)와 1:1 매칭된 6-카드 스켈레톤 (`Study 05 #13`) | `NEW` | `+51 / -0` | `일치` |
| `src/features/catalog/ui/ProductCard.tsx` | 개별 상품 카드 (`formatCurrency`, 품절 배지, `isLoading` 중복 클릭 잠금) | `NEW` | `+91 / -0` | `일치` |
| `src/features/catalog/ui/ProductCatalogView.tsx` | 필터 바 + 스켈레톤/에러/빈 상태/3열 카드 그리드 통합 뷰 | `NEW` | `+232 / -0` | `일치` |
| `src/features/catalog/ui/catalog.css` | `.prod-*` 네임스페이스 및 시맨틱 CSS 변수 토큰 기반 스타일 (`Study 04 #05`, `Study 05 #13~#16`) | `NEW` | `+164 / -0` | `일치` |
| `src/testing/**` & `src/**/*.test.*` | 로컬 스텁 3종, MSW 핸들러/서버, 단위 테스트 4종 + 통합 테스트 1종 (총 20케이스) | `NEW` | `+1,069 / -0` | `일치` |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`Props` / `Request` / `Storage`)**:
  - 호스트(또는 단독 쇼케이스)로부터 `ProductListProps` (`userId`, `hostType`, `syncMode`, `simulateDelay`, `apiBaseUrl`, `onCartAdded`)를 수신하고 기본값을 안전하게 폴백 처리합니다.
  - 마운트 시 `createScopedStorage('products')`를 통해 `mfe:products:catalog-filter` 키에서 저장된 필터를 읽어 `productFilterSchema.safeParse()`로 검증·복원합니다.
- **내부 핵심 처리 로직**:
  - `useProductsQuery`: `GET /api/products?category=...&search=...`를 호출하며 TanStack Query의 `signal`(`AbortSignal`)을 `ky`에 전달합니다. `simulateDelay: true`일 때는 취소 가능한 지연 타이머(`1500ms`)를 수행합니다.
  - `useAddToCartMutation`: `POST /api/cart` 요청을 수행하며, **`Mode A ('mode-a-event')`**에서는 컴포넌트 스코프 독립 `localQueryClient`를 사용하고 성공 시 `mfeEventBus.emit('mfe:cart-updated', payload)`를 발행합니다. **`Mode B ('mode-b-query')`**에서는 `onMutate` 시점에 `sharedQueryClient.cancelQueries({ queryKey: ['cart'] })`로 구버전 장바구니 조회를 취소하고, `onSuccess` 시점에 `sharedQueryClient.invalidateQueries({ queryKey: ['cart'] })`를 호출합니다.
- **출력 데이터 (`Render` / `Event` / `Cache`)**:
  - `remote_shared/ui`의 `Grid`, `Card`, `Badge`, `Button`, `Select`, `Skeleton`을 조합하여 3열 상품 카탈로그 그리드를 렌더링합니다.
  - 장바구니 추가 완료 시 선택된 `syncMode`에 따라 `CustomEvent('mfe:cart-updated')` 발행 또는 `sharedQueryClient`의 `['cart']` 쿼리 무효화 및 `onCartAdded(payload)` 콜백을 전달합니다.

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **실행 명령어**: `pnpm --filter @mfe-study/remote-products test` (및 루트 `pnpm test`)
- **통과 현황**: `remote-products` 총 `20`건 중 `20`건 통과 (`0`건 실패, 루트 전체 31개 테스트 파일 / 66개 테스트 전원 통과)
- **주요 검증 시나리오 요약**:
  - `[TC-SCHEMA-01~04]` 검색어 `trim` 및 50자 초과 차단, 카테고리 enum 검증, 손상된 로컬 스토리지 데이터 기본값 폴백 검증 통과
  - `[TC-API-01~03]` `GET /api/products` 쿼리 파라미터 직렬화, `POST /api/cart` 201 응답 파싱, 이미 중단된 `AbortSignal` 전달 시 즉시 취소 검증 통과
  - `[TC-UI-FILTER-01~03]` 51자 초과 검색어 인라인 에러 표시, 카테고리 `Select` 변경 및 `[필터 초기화]` 동작 검증 통과
  - `[TC-UI-CARD-01~03]` `formatCurrency` 원화 정수 포맷팅, `isAdding=true`일 때 `disabled` + `aria-busy="true"` 잠금, `stock=0` 품절 비활성화 검증 통과
  - `[TC-INT-01~07]` 8개 상품 렌더링 및 카테고리/키워드 필터링, **`Mode A` 이벤트 발행(캐시 미접근)** vs **`Mode B` `cancelQueries` + `invalidateQueries`(이벤트 미발행)** 격리 검증, `simulateDelay` 스켈레톤 노출, 500 에러 시 `[다시 시도]` 복구 검증 통과

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` (`Checked 126 files. No fixes applied.`)
- **타입 검사 (`tsc --noEmit`)**: `통과` (`pnpm --filter @mfe-study/remote-products typecheck` 에러 0건)
- **프로덕션 빌드 (`vite build`)**: `통과` (`dist/remoteEntry.js`, `dist/mf-manifest.json`, `dist/@mf-types/` 정상 생성)
- **작업 스코프 격리 (`verify-scope.mjs`)**: `products` (`apps/remote-products` 및 루트 `vitest.config.ts`) 범위 외 타 서비스 수정 0건 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `통과` (`3종 SQL 파일 해시 및 순차 실행 무결성 검증 통과`)

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`

- [x] **[SEC-01] SQL 인젝션 방어 및 입력 스키마 검증**: 사용자 검색어·카테고리 입력(`productFilterSchema`), 로컬 스토리지 복원 데이터, 백엔드 응답 엔벨로프(`productEntitySchema`, `cartItemResponseSchema`), 장바구니 추가 요청(`addToCartRequestSchema`)을 모두 `zod` 스키마로 런타임 검증했습니다. (`통과`)
- [x] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: `dangerouslySetInnerHTML`, `innerHTML`, `eval` 사용이 전무하며 모든 상품명·검색어·에러 메시지는 React JSX 텍스트 노드로 안전하게 이스케이프됩니다. (`통과`)
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: API 에러 발생 시 내부 스택 트레이스를 노출하지 않고 `normalizeError`를 통해 정제된 `{ code, message }`만 사용자 배너에 표시합니다. (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: `vite.config.ts`에 `port: 3002`, `strictPort: true`, `cors: true`를 설정하고 `createApiClient`를 통해 표준 엔벨로프 통신 및 에러 정규화를 적용했습니다. (`통과`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)

- **적용 여부**: `적용`
- [x] **초기화·경로 (#01~#04)**: `src/main.ts` + `src/bootstrap.tsx` 2단 비동기 엔트리 분리(#01), `base: 'http://localhost:3002/'` 고정(#02), 개발/프리뷰 서버 `cors: true` & `strictPort: true`(#03), Module Federation 2.0 `dts` 플러그인을 통한 `@mf-types` 생성·소비(#04)를 모두 적용했습니다.
- [x] **DOM·스타일 격리 (#05~#06)**: `catalog.css`에서 전역 태그 선택자(`body`, `button`, `*`)를 일절 사용하지 않고 `.prod-*` 클래스 프리픽스만 사용했으며(#05), 드롭다운 포털은 `remote_shared/ui`의 `Select`(`--z-dropdown` 토큰 내장)를 소비하여 `z-index` 충돌을 원천 차단했습니다(#06).
- [x] **상태·라우팅·메모리·스토리지 (#07~#10)**: `remote_shared/theme`의 단일 `ThemeProvider`/`useTheme` Context를 공유하고(#07), `App.tsx`의 이벤트 모니터는 `useMfeEvent`로 언마운트 시 리스너를 자동 해제하며(#09), 필터 영속화는 `createScopedStorage('products')`(`mfe:products:catalog-filter`)로 격리했습니다(#10).
- [x] **단독 테스트·장애 복구 (#11~#14)**: `vitest.config.ts`의 로컬 스텁 Alias로 타 서버 기동 없이 20개 테스트가 단독 통과하며(#11), `ProductList.tsx` 최외곽을 `RemoteErrorBoundary`로 감싸고 API 실패 시 `[다시 시도]` 인라인 복구를 지원합니다(#13).

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../../../../docs/study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`products`)
- [x] **비동기 경합 및 폭포수 방지 (#01~#02)**: 장바구니 담기 진행 중 해당 카드의 `Button`에 `isLoading={true}`(`disabled` + `aria-busy="true"`)를 적용해 연타를 차단하고, `Mode B` 뮤테이션 `onMutate`에서 `sharedQueryClient.cancelQueries({ queryKey: ['cart'] })`를 호출해 구버전 조회 응답 역전을 방지했습니다.
- [x] **렌더링 및 금액·시간 정확성 (#03~#04)**: 상품 그리드 렌더링 시 DB 고유 식별자인 `product.id`를 `key`로 사용하고, 모든 가격 표시는 `remote_shared/utils`의 `formatCurrency(product.price)`를 사용했습니다.
- [x] **레이아웃·테마·접근성 (#13~#16)**: 실제 카드와 스켈레톤 카드의 최소 높이(`min-height: 240px`) 및 3열 그리드 규격을 1:1로 매칭해 `CLS`를 방지하고(#13), 하드코딩 색상 없이 `var(--mfe-*)` 시맨틱 토큰만 사용했으며(#14), `:focus-visible` 포커스 링(#15), 플렉스 자식 `min-width: 0` 말줄임 및 가격·재고 숫자 `font-variant-numeric: tabular-nums`(#16)를 모두 적용했습니다.

### 4.2 백엔드 API & SQLite DB 점검 (`api` 해당 시)
- [x] **백엔드 스코프 해당 없음 (`N/A`)**: 본 작업은 `products` 프론트엔드 리모트 스코프이며, 기구축된 `api-server`(`GET /api/products`, `POST /api/cart`) 계약을 소비합니다.

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: 불필요한 배럴 파일(`index.ts`) 없이 명시적 모듈 경로를 사용하고, 모든 에러를 `normalizeError`로 안전하게 정규화했습니다.
- [x] **6대 주석 원칙 ([`Study 02` §3](../../../../docs/study/02-polyrepo-and-architecture-decisions.md) 및 `GEMINI.md` 기준)**: 파일 최상단 역할 헤더(`@file`, `@app`, `@exposed`, `@description`), 모든 인터페이스 내부 속성의 `/** ... */` 한글 주석, 함수/컴포넌트 JSDoc, 주요 상수·상태 주석, 분기문(`if/else`) 의도 주석을 전수 작성했습니다.

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 중 발견 및 즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **`jsdom` v26 + Node 22(`undici`) 간 `AbortSignal` 인스턴스 호환성 이슈**:
   - `jsdom` 환경이 전역 `AbortController`를 자체 구현체로 덮어써서 `ky`가 `new Request(url, { signal })` 호출 시 Node 22 내장 `undici`에서 `TypeError`가 발생하던 현상을 발견하여, `src/testing/setup.ts`에서 `JsdomCompatibleRequest` 어댑터로 사전 중단 신호(`signal.aborted`) 검사와 `undici` 호환 처리를 동시에 해결했습니다. (해결 완료)
2. **`@mf-types/remote_shared` 정적 타입 검사(`tsc --noEmit`) 시 `FlexProps.wrap` 타입 및 `HTMLArkProps` 해석 보완**:
   - `remote_shared/ui`의 `FlexProps.wrap`은 `boolean`이 아닌 `'nowrap' | 'wrap'` 유니온 타입임을 `@mf-types` 타입체크 과정에서 확인하여 `wrap="wrap"`으로 전수 수정했습니다.
   - 또한 소비자 앱(`remote-products`)이 `@ark-ui/react`를 직접 설치하지 않는 캡슐화 원칙을 유지하면서도 `@mf-types` 내부의 `HTMLArkProps`·`Ark*.RootProps` 상속 속성(`children`, `className`, `onClick` 등)을 `tsc`가 완벽히 추론하도록 `src/vite-env.d.ts`에 타입 호환 매핑을 추가하여 `pnpm --filter @mfe-study/remote-products typecheck`가 에러 0건으로 통과하도록 조치했습니다. (해결 완료)

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **`Mode A` vs `Mode B` 상태 동기화 실험 설계 (`src/exposed/ProductList.tsx` & `src/features/catalog/model/use-catalog-queries.ts`)**:
   - `syncMode === 'mode-a-event'`일 때는 컴포넌트 내부 `localQueryClient`를 주입하고 `mfeEventBus.emit('mfe:cart-updated', payload)`만 발행하며, `syncMode === 'mode-b-query'`일 때는 `remote_shared/utils`의 싱글톤 `sharedQueryClient`를 주입하고 `cancelQueries` + `invalidateQueries({ queryKey: ['cart'] })`만 호출하도록 엄격히 분리했습니다.
2. **5단계-B (PR 생성 및 커밋) 진행 승인 요청**:
   - 코드 리뷰 문서(`03-code-review.md`)와 아래 PR 초안 및 커밋 메시지를 확인해 주시고, **커밋·PR 생성 및 머지 진행 여부**를 승인해 주시면 감사하겠습니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: 이상 없으므로 [`pull-request.template.md`](../../../../docs/templates/pull-request.template.md) 기반 PR 초안 및 커밋 메시지 보고 진행
