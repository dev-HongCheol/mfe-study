# 🗂️ MFE Study 서비스 레지스트리 및 명령어·API·노출 모듈 정본 (`docs/service-registry.md`)

> **문서 목적**: 새로운 대화 세션을 시작하거나 다른 마이크로 앱을 개발할 때, 전체 프로젝트 폴더나 각 앱의 `package.json`을 일일이 탐색하지 않고도 **현재까지 구현 완료된 서비스의 실행·테스트·DB 명령어, REST API 엔드포인트, Module Federation 노출(`exposes`) 현황**을 즉시 파악하기 위한 **단일 운영 정본(Living Service Registry)**입니다.
> - **작업 시작 시(1단계)**: [`todo.md`](../todo.md)와 함께 이 문서를 확인하여 이미 구축된 백엔드 API·공통 모듈·명령어를 파악합니다.
> - **머지 직전(5단계-B)**: 새로운 서비스나 API·노출 모듈·명령어가 추가되면 [`todo.md`](../todo.md)와 함께 이 문서의 현황을 최신으로 업데이트합니다.
> - **상세 타입·스키마 계약 정본(SSOT)**: 세부 TypeScript 인터페이스 및 `Zod` 스키마 코드는 [Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)](./features/20261027-phase1-service-contracts/01-plan-and-design.md)의 해당 섹션(`§ 5.1 ~ § 5.5`)을 참조합니다.

---

## 1. 전체 서비스 구축 현황 및 포트·패키지 맵

| 스코프 ID | 워크스페이스 패키지명 | 경로 | 포트 | 기술 스택 / 번들러 | 구축 상태 |
| :---: | :--- | :--- | :---: | :--- | :---: |
| **`root`** | `mfe-study-root` | `.` | - | `Turborepo`, `Biome`, `Vitest`, `Node.js 22` | ✅ 완료 (`Phase 0`) |
| **`api`** | `@mfe-study/api-server` | `apps/api-server` | `4000` | `Express 5`, `node:sqlite`, `Zod`, `Supertest` | ✅ 구현 완료 (`Step 1.1`) |
| **`shared`** | `@mfe-study/remote-shared` | `apps/remote-shared` | `3004` | `Vite 7`, `React 19`, `@ark-ui/react v5`, `clsx` | ✅ 구현 완료 (`Step 1.2` · UI Props 캡슐화 완료) |
| **`products`** | `@mfe-study/remote-products` | `apps/remote-products` | `3002` | `Vite 7`, `React 19`, `TanStack Query`, `ky` | ✅ 구현 완료 (`Step 1.3` · 무-Shim 검증 완료) |
| **`cart`** | `@mfe-study/remote-cart` | `apps/remote-cart` | `3003` | `Rsbuild (Rspack 1.7)`, `React 19`, `TanStack Query`, `ky` | ✅ 구현 완료 (`Step 1.4` · 최초 Rspack/무-Shim 검증 완료) |
| **`host-vite`** | `@mfe-study/host-vite` | `apps/host-vite` | `3000` | `Vite`, `React 19`, `@module-federation/vite` | ⏳ 대기 (`Step 1.5`) |
| **`host-rspack`** | `@mfe-study/host-rspack` | `apps/host-rspack` | `3001` | `Rspack (Rsbuild)`, `React 19`, `@module-federation/rsbuild-plugin` | ⏳ 대기 (`Step 1.5`) |

---

## 2. 루트 워크스페이스 공통 명령어 (`Scope: root`)

| 목적 | 실행 명령어 | 동작 설명 |
| :--- | :--- | :--- |
| **대화형 개발 서버 기동** | `pnpm dev` (또는 `pnpm dev:menu`) | `scripts/dev-menu.mjs` 대화형 메뉴로 번호 선택 후 `turbo run dev --filter`를 TUI 모드로 기동 (탭 전환 지원) |
| **상품 리모트 개발 세트 기동** | `pnpm dev:products` | `api-server(4000)` + `remote-shared(3004)` + `remote-products(3002)`를 즉시 TUI 모드로 동시 기동 |
| **장바구니 리모트 개발 세트 기동** | `pnpm dev:cart` | `api-server(4000)` + `remote-shared(3004)` + `remote-cart(3003)`를 즉시 TUI 모드로 동시 기동 |
| **전체 개발 서버 일괄 기동** | `pnpm dev:all` | `turbo run dev`로 모든 마이크로 앱 및 백엔드 서버 동시 기동 |
| **전체 TDD 테스트** | `pnpm test` | 루트 하네스 테스트(`scripts/__tests__`) 및 모든 앱 단위·통합 테스트 일괄 실행 |
| **포맷팅·린트 검사** | `pnpm check` | `Biome` 포맷팅·린트·`LF` 줄바꿈 검사 (자동 수정: `pnpm check:write`) |
| **3종 SQL 해시 갱신** | `pnpm sql:update` | `apps/api-server/sql/` 내 3종 SQL의 SHA-256 해시를 `.sql-hashes.json`에 기록 |
| **3종 SQL 무결성 검증** | `pnpm sql:verify` | 3종 SQL 해시 일치 여부 및 인메모리(`01 -> 02 -> 03 -> 01 -> 02`) 멱등성 검증 |
| **런타임 스모크 검증** | `pnpm smoke:phase1` | 6개 서버 실제 기동 상태에서 Health·CORS·`mf-manifest.json` 연결 검증 |

---

## 3. 백엔드 API 서버 및 내장 SQLite DB 정본 (`Scope: api` | `Port 4000`)

### 3.1 `api-server` 전용 실행·테스트·DB 관리 명령어
| 목적 | 실행 명령어 (루트에서 실행 기준) | 동작 설명 |
| :--- | :--- | :--- |
| **개발 서버 기동 (Watch)** | `pnpm --filter @mfe-study/api-server dev` | `tsx watch src/server.ts`로 `http://localhost:4000` 서버 기동 (최초 부트 시 DB 자동 초기화) |
| **단독 TDD 테스트** | `pnpm --filter @mfe-study/api-server test` | `Supertest` + 인메모리/임시 SQLite 기반 단위·통합 테스트 14건 실행 |
| **타입 검사 / 빌드** | `pnpm --filter @mfe-study/api-server typecheck`<br>`pnpm --filter @mfe-study/api-server build` | `tsc --noEmit` 정적 타입 검사 및 `dist/` 컴파일 |
| **DB 클린 재설치 (`03->01->02`)** | `pnpm --filter @mfe-study/api-server db:setup` | `mfe_study.db`의 모든 테이블 삭제 후 스키마 재생성 및 초기 시드 데이터 투입 |
| **DB 시드 데이터 리셋 (`01+02`)** | `pnpm --filter @mfe-study/api-server db:reset` | 테이블 구조는 유지하고 기존 데이터를 지운 뒤 초기 시드 데이터로 복원 |
| **DB 스키마만 적용 (`01`)** | `pnpm --filter @mfe-study/api-server db:schema` | `01-schema.sql` 및 `_schema_comments` 한글 코멘트 사전 갱신 |
| **DB 전체 삭제 (`03`)** | `pnpm --filter @mfe-study/api-server db:drop` | `03-drop-all.sql`을 실행해 모든 인덱스·테이블 삭제 |

### 3.2 구현 완료된 8대 REST API 엔드포인트 명세 (`http://localhost:4000/api`)
> 모든 응답은 표준 응답 봉투(`{ success: boolean, data?: T, error?: { code, message, details? } }`)로 반환되며, 상세 인터페이스는 [루트 계약 정본 `§ 5.1`](./features/20261027-phase1-service-contracts/01-plan-and-design.md)을 참조합니다.

| 번호 | HTTP 메서드 및 경로 | 요청 Query / Body (`Zod` 검증) | 성공 응답 `data` 요약 | 주요 에러 코드 (`statusCode`) |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `GET /api/health` | 없음 | `{ status: 'ok', dbMode: 'wal' \| 'memory', foreignKeys: true }` | - |
| **2** | `GET /api/schema-comments` | 없음 | `SchemaCommentRecord[]` (`tableName`, `columnName`, `comment`) | - |
| **3** | `GET /api/users` | 없음 | `UserEntity[]` (`id`, `username`, `role`, `token`) | - |
| **4** | `POST /api/auth/login` | Body: `{ userId: string }` | `UserEntity` | `400 VALIDATION_ERROR`<br>`404 NOT_FOUND` |
| **5** | `GET /api/products` | Query: `?category=electronics\|office\|accessories&search=키워드` (선택) | `ProductEntity[]` (`id`, `name`, `price`, `category`, `stock`, `description`) | `400 VALIDATION_ERROR` |
| **6** | `GET /api/cart` | Query: `?userId=user-1` (필수) | `CartItemView[]` (`products`와 `INNER JOIN`된 `productName`, `price`, `category` 포함) | `400 VALIDATION_ERROR` |
| **7** | `POST /api/cart` | Body: `{ userId: string, productId: number, quantity: number(1~99), addedFromHost: 'vite'\|'rspack'\|'standalone' }` | `CartItemView` (`BEGIN IMMEDIATE` 트랜잭션 + `UNIQUE(user_id, product_id)` 원자적 `UPSERT` 누적) | `400 VALIDATION_ERROR`<br>`400 OUT_OF_STOCK`<br>`404 NOT_FOUND` |
| **8** | `DELETE /api/cart/:id` | Param: `:id` (장바구니 항목 ID 또는 `'all'`), Query: `?userId=user-1` (필수) | `{ deletedId: number \| 'all', deletedCount: number }` | `400 VALIDATION_ERROR`<br>`404 NOT_FOUND` |

### 3.3 SQLite 4대 테이블 및 기본 시드 데이터 요약 (`apps/api-server/sql/`)
- **사용자 시드 (`users`)**:
  - `user-1`: `홍길동 (VIP)` (`role: 'admin'`, 초기 장바구니에 상품 1번 1개·상품 5번 2개 보유)
  - `user-2`: `이순신 (일반)` (`role: 'member'`, 초기 장바구니 비어 있음)
- **상품 시드 (`products`, 원화 정수 `price`)**:
  - `id: 1` 기계식 무선 키보드 Pro (`129,000원`, `electronics`, `stock: 15`)
  - `id: 2` 초경량 버티컬 마우스 Air (`68,000원`, `electronics`, `stock: 20`)
  - `id: 3` 4K UHD 데스크 모니터 27인치 (`389,000원`, `electronics`, `stock: 8`)
  - `id: 4` 모션 데스크 스탠딩 책상 (`450,000원`, `office`, `stock: 5`)
  - `id: 5` 알루미늄 노트북 거치대 Stand (`42,000원`, `accessories`, `stock: 30`)
  - `id: 6` 한정판 코딩 장패드 XL (품절) (`25,000원`, `accessories`, `stock: 0` — `OUT_OF_STOCK` 테스트용)

---

## 4. 원격 공통 모듈 정본 (`Scope: shared` | `Port 3004` | `name: 'remote_shared'`)

### 4.1 `remote-shared` 전용 실행·테스트·빌드 명령어
| 목적 | 실행 명령어 (루트에서 실행 기준) | 동작 설명 |
| :--- | :--- | :--- |
| **개발 서버 기동** | `pnpm --filter @mfe-study/remote-shared dev` | `vite --port 3004 --strictPort`로 `http://localhost:3004` 단독 쇼케이스, MF 컨테이너 및 `@mf-types.zip` 실시간 서빙 기동 (`dev.disableDynamicRemoteTypeHints: true` 적용) |
| **단독 TDD 테스트** | `pnpm --filter @mfe-study/remote-shared test` | `Vitest` (`jsdom` + `node`) 기반 단위·통합 테스트 `18`개 파일 / `35`건 실행 |
| **타입 검사 / 빌드** | `pnpm --filter @mfe-study/remote-shared typecheck`<br>`pnpm --filter @mfe-study/remote-shared build` | `tsc --noEmit` 검사 및 `dist/remoteEntry.js` · `dist/mf-manifest.json` · `dist/@mf-types.zip` (`dist/@mf-types/index.d.ts`, `@ark-ui/react` 참조 `0건`) 프로덕션 번들링 |
| **프로덕션 프리뷰** | `pnpm --filter @mfe-study/remote-shared preview` | 빌드된 `dist/` 산출물을 `Port 3004`에서 서빙 |

### 4.2 Module Federation 노출(`exposes`) 3대 서브패스 시그니처 요약
> 내부 의존성은 무조건 **`./utils` (최하단) → `./theme` (중간) → `./ui` (최상단)** 단방향으로만 흐르며, 모든 노출 UI 컴포넌트는 내부 구현에만 `@ark-ui/react`를 캡슐화하고 외부 `Props` 계약은 순수 `React.ComponentPropsWithoutRef` 기반으로 노출하여 `@mf-types` 타입 누출을 차단합니다([`Study 09`](./study/09-mfe-shared-types-and-design-system-encapsulation.md)). 상세 타입은 [루트 계약 정본 `§ 5.3`](./features/20261027-phase1-service-contracts/01-plan-and-design.md) 및 [`apps/remote-shared` 캡슐화 설계서 `§ 5`](../apps/remote-shared/docs/features/20261119-ui-prop-encapsulation/01-plan-and-design.md)를 참조합니다.

| 노출 경로 (`import`) | 실제 진입 파일 | 노출 심볼 및 핵심 시그니처 요약 |
| :--- | :--- | :--- |
| **`remote_shared/ui`** | `src/exposed/ui.ts` | - **기본 컴포넌트 5종 (`ComponentPropsWithoutRef<*>` 기반 캡슐화)**:<br>  - `Button` (`variant`, `size`, `isLoading`, `fullWidth`)<br>  - `Heading` (`level?: 1\|2\|3\|4\|5`)<br>  - `Select` (`options`, `value: string`, `onChange: (val: string) => void`, `ariaLabel`, `placeholder?`, `label?`, `name?`, `disabled?`, `readOnly?`, `required?`, `invalid?`, `closeOnSelect?`, `lazyMount?`, `unmountOnExit?`)<br>  - `Skeleton` (`variant?: 'card'\|'text'\|'rect'`, `width`, `height`, `count`)<br>  - `Badge` (`tone?: 'brand'\|'success'\|'warning'\|'danger'\|'neutral'`)<br>- **인터랙티브 레이아웃 3종 (`Omit<ComponentPropsWithoutRef<'div'>, ...>` + 명시 허용 속성 캡슐화)**:<br>  - `Splitter` (`panels: Array<{ id, content, minSize?, maxSize?, collapsible?, collapsedSize? }>`, `defaultSize?`, `size?`, `orientation?`, `onResize?: (size: number[]) => void`)<br>  - `Tabs` (`items: Array<{ value, label, content, disabled? }>`, `value?`, `defaultValue?`, `onChange?: (val: string) => void`, `orientation?`, `lazyMount?`, `unmountOnExit?`)<br>  - `Collapsible` (`title`, `children`, `open?`, `defaultOpen?`, `disabled?`, `lazyMount?`, `unmountOnExit?`, `onOpenChange?: (open: boolean) => void`)<br>- **정적 레이아웃 5종 (`ComponentPropsWithoutRef<'div'>` 기반 캡슐화)**:<br>  - `Container` (`maxWidth`), `Grid` (`columns`, `gap`), `Flex` (`direction`, `align`, `justify`, `gap`, `wrap`), `Stack` (`gap`), `Card` (`padding`, `elevated`)<br>- **스타일 결합 유틸 재노출**: `clsx` |
| **`remote_shared/theme`** | `src/exposed/theme.ts` | - `ThemeProvider` (`defaultTheme?: ThemeMode`, `children`), `useTheme()` (`{ theme, setTheme, availableThemes }`), `ThemeContext`<br>- `Z_INDEX_TOKENS` (`{ header: 100, dropdown: 200, drawer: 300, modal: 400, toast: 500 }`)<br>- `AVAILABLE_THEMES`, `applyThemeTokensToDocument(theme)`, `type ThemeMode` (`'indigo' \| 'emerald' \| 'rose' \| 'dark'`) |
| **`remote_shared/utils`** | `src/exposed/utils.ts` | - **이벤트 버스**: `MFE_EVENTS`, `mfeEventBus` (`emit`, `subscribe`), `useMfeEvent(eventName, handler)`, `MFE_EVENT_SCHEMAS` 및 5대 이벤트 `Zod` 스키마·타입<br>- **스토리지**: `createScopedStorage(scopeId)` (`getItem`, `setItem`, `removeItem`, `clearScope`, `buildKey`)<br>- **통신 & 에러**: `httpClient`, `createApiClient(baseUrl)`, `unwrapApiResponse(promise, schema?)`, `DEFAULT_API_BASE_URL`, `normalizeError(err)`<br>- **쿼리 & 포맷터**: `sharedQueryClient`, `createMfeQueryClient()`, `CART_QUERY_KEY` (`['cart']`), `PRODUCTS_QUERY_KEY` (`['products']`), `formatCurrency(amount)`, `formatDate(dateStr, pattern?)`, `formatRelativeTime(dateStr, baseDate?)` |

### 4.3 타 서비스(`products`, `cart`, `host-vite`, `host-rspack`) 필수 소비 규칙 6대 원칙
1. **`@ark-ui/react` 및 `clsx` 직접 설치 금지 (무-Shim 소비 보장)**: 도메인 리모트와 호스트 앱의 `package.json`에는 `@ark-ui/react`나 `clsx`를 설치하지 않고, 반드시 `import { Button, Flex, clsx } from 'remote_shared/ui'`로 가져다 씁니다. `remote_shared/ui`의 모든 노출 `Props`가 `ComponentPropsWithoutRef` 기반으로 경계 캡슐화(`@ark-ui/react` 참조 `0건`)되어 있으므로, 소비자 앱은 별도 `@ark-ui/react/*` 타입 Shim 없이 순수 `@mf-types`만으로 정적 타입 검사를 통과할 수 있습니다. *(단, 호스트의 `RemoteErrorBoundary` 폴백 UI만 `remote-shared` 서버 장애 시에도 동작하도록 순수 내장 스타일로 작성)*
2. **수동 `remotes.d.ts` 작성 금지 (`@mf-types` 자동 동기화 사용)**: 소비자 앱은 `dts: { consumeTypes: true }` 및 `tsconfig.json`의 `paths: { "*": ["./@mf-types/*"] }`를 설정하여 `http://localhost:3004/@mf-types.zip`의 원격 타입을 자동 다운로드해 사용합니다. (`Vitest` 단위·통합 테스트 시에만 `src/testing/stubs/` 로컬 스텁 매핑 사용)
3. **수동 `window.addEventListener` 금지**: 마이크로 앱 간 커스텀 이벤트 수신 시 좀비 리스너 누수를 막기 위해 반드시 `remote_shared/utils`의 `useMfeEvent(MFE_EVENTS.*, handler)`를 사용합니다.
4. **직접 `window.localStorage` 접근 금지**: 동일 Origin 내 키 충돌 및 JSON 오염을 방지하기 위해 반드시 `createScopedStorage('<scopeId>')`와 `Zod` 스키마를 사용합니다.
5. **색상 `#hex` 및 임의 `z-index` 하드코딩 금지**: 모든 컴포넌트 스타일은 `var(--mfe-*)` 시맨틱 CSS 변수와 `Z_INDEX_TOKENS`(`var(--mfe-z-*)`) 계층만 사용합니다.
6. **상태 동기화 비교 학습 모드(`Mode A` vs `Mode B`) 준수**:
   - `Mode A ('mode-a-event')`: 각 앱이 `createMfeQueryClient()`로 생성한 독립 `QueryClient` 사용 + `mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, ...)` 신호로 재조회
   - `Mode B ('mode-b-query')`: `remote_shared/utils`의 싱글톤 `sharedQueryClient` 공유 + `sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })` 직접 무효화

---

## 5. 상품 목록 원격 앱 정본 (`Scope: products` | `Port 3002` | `name: 'remote_products'`)

### 5.1 `remote-products` 전용 실행·테스트·빌드 명령어
| 목적 | 실행 명령어 (루트에서 실행 기준) | 동작 설명 |
| :--- | :--- | :--- |
| **개발 서버 기동** | `pnpm --filter @mfe-study/remote-products dev` | `vite --port 3002 --strictPort`로 `http://localhost:3002` 단독 쇼케이스, MF 컨테이너 및 `@mf-types.zip` 실시간 서빙 기동 *(사전에 `api-server:4000` 및 `remote-shared:3004` 기동 권장 — 루트 `pnpm dev:products`로 일괄 기동 가능)* |
| **단독 TDD 테스트** | `pnpm --filter @mfe-study/remote-products test` | `Vitest` (`jsdom` + `MSW` + 로컬 `remote_shared/*` 스텁) 기반 단위·통합 테스트 `7`개 파일 / `33`건 실행 (무-Shim 및 `@mf-types` 누출 `0건` 정적 검증 포함) |
| **타입 검사 / 빌드** | `pnpm --filter @mfe-study/remote-products typecheck`<br>`pnpm --filter @mfe-study/remote-products build` | `tsc --noEmit` 검사 및 `dist/remoteEntry.js` · `dist/mf-manifest.json` · `dist/@mf-types.zip` (`dist/@mf-types/index.d.ts`) 프로덕션 번들링 |
| **프로덕션 프리뷰** | `pnpm --filter @mfe-study/remote-products preview` | 빌드된 `dist/` 산출물을 `Port 3002`에서 서빙 |

### 5.2 Module Federation 노출(`exposes`) 및 소비(`remotes`) 시그니처 요약
> 상세 계약은 [루트 계약 정본 `§ 5.4.2`](./features/20261027-phase1-service-contracts/01-plan-and-design.md) 및 [`apps/remote-products` 설계서 `§ 5 ~ § 6`](../apps/remote-products/docs/features/20261107-catalog-list/01-plan-and-design.md)를 참조합니다.

| 구분 | 경로 / 매니페스트 | 핵심 시그니처 및 동작 요약 |
| :--- | :--- | :--- |
| **노출 (`exposes`)** | **`remote_products/ProductList`**<br>(`src/exposed/ProductList.tsx`) | - **Export**: `ProductList` (named + default), `type ProductListProps`<br>- **`ProductListProps`**:<br>  - `userId?: string \| null` — 현재 로그인 사용자 ID (미지정·`null`·빈 문자열·공백 시 임의 유저 폴백 없이 비로그인 읽기 전용 모드 적용, 생략 시 `mfe:auth-changed` 이벤트 구독으로 전환 가능)<br>  - `hostType?: 'vite' \| 'rspack' \| 'standalone'` (기본값: `'standalone'`)<br>  - `syncMode?: 'mode-a-event' \| 'mode-b-query'` (미지정 시 `mfe:sync-mode-changed` 구독, 초기값 `'mode-a-event'`)<br>  - `simulateDelay?: boolean` (기본값: `false`), `delayMs?: number` (기본값: `1500`)<br>  - `apiBaseUrl?: string` (기본값: `http://localhost:4000/api`)<br>  - `onCartAdded?: (payload: CartUpdatedEventPayload) => void` |
| **소비 (`remotes`)** | `remote_shared`<br>(`http://localhost:3004/mf-manifest.json`) | `remote_shared/ui`, `remote_shared/theme`, `remote_shared/utils` 런타임 소비 (`@ark-ui/react`, `clsx` 직접 설치 0%, `src/vite-env.d.ts` `@ark-ui/react` 임시 Shim `0줄` 무-Shim 소비 실증, `src/main.ts` `Promise.all` 선행 프리로드 및 `dts.consumeTypes` + `dev.disableDynamicRemoteTypeHints: true` 적용) |
| **API 소비** | `api-server`<br>(`http://localhost:4000/api`) | `GET /api/products` (카테고리·검색어 쿼리 + `AbortSignal` 연동), `POST /api/cart` (비인증 3중 차단 가드 적용) |

### 5.3 상위 호스트(`host-vite`, `host-rspack`) 필수 소비 규칙
1. **원격 타입 자동 동기화 소비**: 호스트의 MF 설정에서 `remote_products` 엔트리로 `http://localhost:3002/mf-manifest.json`을 등록하고 `dts: { consumeTypes: true }`를 사용해 `remote_products/ProductList` 타입을 자동 수신합니다.
2. **비인증(`userId: null`) 및 상태 동기화 모드 전달**: 로그인 전에는 `userId={null}`(또는 미전달)로 마운트하면 읽기 전용 조회만 허용되고 담기 요청이 3중 차단됩니다. `syncMode="mode-a-event"`에서는 `mfe:cart-updated` 이벤트만 발행하며, `syncMode="mode-b-query"`에서는 독립 `QueryClient`를 생성하지 않고 싱글톤 `sharedQueryClient`의 `['cart']` 캐시만 `cancelQueries` + `invalidateQueries` 처리합니다.
3. **장애 격리 래핑**: 호스트 마운트 시 반드시 `<RemoteErrorBoundary>`와 `<Suspense>`로 감싸 `remote-products(3002)` 서버 장애가 전체 대시보드로 전파되지 않도록 격리합니다.

---

## 6. 장바구니 원격 앱 정본 (`Scope: cart` | `Port 3003` | `name: 'remote_cart'`)

### 6.1 `remote-cart` 전용 실행·테스트·빌드 명령어
| 목적 | 실행 명령어 (루트에서 실행 기준) | 동작 설명 |
| :--- | :--- | :--- |
| **개발 서버 기동** | `pnpm --filter @mfe-study/remote-cart dev` | `rsbuild dev` (`Port 3003`, `strictPort: true`, `cors: { origin: '*' }`)로 `http://localhost:3003` 단독 쇼케이스, MF 컨테이너 및 `@mf-types.zip` 실시간 서빙 기동 *(사전에 `api-server:4000` 및 `remote-shared:3004` 기동 권장 — 루트 `pnpm dev:cart`로 일괄 기동 가능)* |
| **단독 TDD 테스트** | `pnpm --filter @mfe-study/remote-cart test` | `Vitest` (`jsdom` + `MSW` + 로컬 `remote_shared/*` 스텁) 기반 단위·통합 테스트 `8`개 파일 / `26`건 실행 (무-Shim, 전역 CSS 금지 및 React 서브패스 공유 정적 회귀 검증 포함) |
| **타입 검사 / 빌드** | `pnpm --filter @mfe-study/remote-cart typecheck`<br>`pnpm --filter @mfe-study/remote-cart build` | `tsc --noEmit` 무-Shim 검사 및 `dist/remoteEntry.js` · `dist/mf-manifest.json` · `dist/@mf-types.zip` (`Rsbuild v1.7.6` + `@module-federation/rsbuild-plugin@^2.9.3`) 프로덕션 번들링 |
| **프로덕션 프리뷰** | `pnpm --filter @mfe-study/remote-cart preview` | 빌드된 `dist/` 산출물을 `Port 3003`에서 서빙 |

### 6.2 Module Federation 노출(`exposes`) 및 소비(`remotes`) 시그니처 요약
> 상세 계약은 [루트 계약 정본 `§ 5.4.3`](./features/20261027-phase1-service-contracts/01-plan-and-design.md) 및 [`apps/remote-cart` 설계서 `§ 5 ~ § 6`](../apps/remote-cart/docs/features/20261123-cart-widget-sync/01-plan-and-design.md)를 참조합니다.

| 구분 | 경로 / 매니페스트 | 핵심 시그니처 및 동작 요약 |
| :--- | :--- | :--- |
| **노출 (`exposes`)** | **`remote_cart/CartWidget`**<br>(`src/exposed/CartWidget.tsx`) | - **Export**: `CartWidget` (named + default), `type CartWidgetProps`<br>- **`CartWidgetProps`**:<br>  - `userId?: string \| null` — 현재 로그인 사용자 ID (미지정·`null`·공백 시 임의 유저 폴백 없이 `GET /api/cart` 호출 `0회` 차단 + 로그인 안내 렌더링, 생략 시 `mfe:auth-changed` 구독)<br>  - `hostType?: 'vite' \| 'rspack' \| 'standalone'` (기본값: `'standalone'`)<br>  - `syncMode?: 'mode-a-event' \| 'mode-b-query'` (미지정 시 `mfe:sync-mode-changed` 구독, 초기값 `'mode-a-event'`)<br>  - `simulateDelay?: boolean` (기본값: `false`), `delayMs?: number` (기본값: `1500`)<br>  - `apiBaseUrl?: string` (기본값: `http://localhost:4000/api`) |
| **소비 (`remotes`)** | `remote_shared`<br>(`http://localhost:3004/mf-manifest.json`) | `Vite 7` 공급자(`remote_shared/ui`, `./theme`, `./utils`)를 `Rsbuild(Rspack)`에서 이종 번들러 런타임 소비 (`@ark-ui/react`·`clsx` 미설치, `src/rsbuild-env.d.ts` 임시 Shim `0줄`, `shared`에 `'react/jsx-runtime'`·`'react/jsx-dev-runtime'`·`'react-dom/client'` 명시 공유, `watchOptions.ignored`에 `@mf-types` 제외, `dev.disableDynamicRemoteTypeHints: true` 적용) |
| **API 소비** | `api-server`<br>(`http://localhost:4000/api`) | `GET /api/cart` (비인증 시 `enabled: false` 차단 + `AbortSignal` 연동), `POST /api/cart` (수량 `+1` UPSERT), `DELETE /api/cart/:id` (단건 삭제 및 `'all'` 전체 비우기) |

### 6.3 상위 호스트(`host-vite`, `host-rspack`) 필수 소비 규칙
1. **원격 타입 자동 동기화 및 React 서브패스 3종 명시 공유**: 호스트의 MF 설정에서 `remote_cart` 엔트리로 `http://localhost:3003/mf-manifest.json`을 등록하고, `Vite` ↔ `Rspack` 이종 번들러 간 `jsxDEV` 경합 방지를 위해 `shared`에 `'react'`, `'react/jsx-runtime'`, `'react/jsx-dev-runtime'`, `'react-dom'`, `'react-dom/client'`, `'@tanstack/react-query'`를 싱글톤으로 통일합니다.
2. **비인증(`userId: null`) 및 상태 동기화 모드 전달**: `syncMode="mode-a-event"`에서는 `mfe:cart-updated` 이벤트 수신 시 독립 `QueryClient`를 재조회하며, `syncMode="mode-b-query"`에서는 이벤트 리스너에 의존하지 않고 싱글톤 `sharedQueryClient`의 `['cart']` 캐시 무효화를 자동 감지합니다.
3. **장애 격리 래핑**: 호스트 마운트 시 반드시 `<RemoteErrorBoundary>`와 `<Suspense>`로 감싸 `remote-cart(3003)` 서버 장애가 전체 대시보드로 전파되지 않도록 격리합니다.

---

## 7. 호스트(`host-vite`, `host-rspack`) 현황 *(Step 1.5 진행 시 누적 기록)*

- **`host-vite` (`Port 3000`) & `host-rspack` (`Port 3001`)**: *Step 1.5에서 대시보드 및 `MfeInspector` 명령어 등록 예정*
