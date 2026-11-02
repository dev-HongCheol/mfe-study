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
| **`shared`** | `@mfe-study/remote-shared` | `apps/remote-shared` | `3004` | `Vite`, `React 19`, `@ark-ui/react`, `clsx` | ⏳ 대기 (`Step 1.2`) |
| **`products`** | `@mfe-study/remote-products` | `apps/remote-products` | `3002` | `Vite`, `React 19`, `TanStack Query`, `ky` | ⏳ 대기 (`Step 1.3`) |
| **`cart`** | `@mfe-study/remote-cart` | `apps/remote-cart` | `3003` | `Rspack (Rsbuild)`, `React 19`, `TanStack Query` | ⏳ 대기 (`Step 1.4`) |
| **`host-vite`** | `@mfe-study/host-vite` | `apps/host-vite` | `3000` | `Vite`, `React 19`, `@module-federation/vite` | ⏳ 대기 (`Step 1.5`) |
| **`host-rspack`** | `@mfe-study/host-rspack` | `apps/host-rspack` | `3001` | `Rspack (Rsbuild)`, `React 19`, `@module-federation/rsbuild-plugin` | ⏳ 대기 (`Step 1.5`) |

---

## 2. 루트 워크스페이스 공통 명령어 (`Scope: root`)

| 목적 | 실행 명령어 | 동작 설명 |
| :--- | :--- | :--- |
| **전체 개발 서버 기동** | `pnpm dev` | `turbo run dev`로 모든 마이크로 앱 및 백엔드 서버 동시 기동 |
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

## 4. 프론트엔드 원격 모듈(`Remotes`) 및 호스트(`Hosts`) 현황 *(Step 1.2 ~ 1.5 진행 시 누적 기록)*

- **`remote-shared` (`Scope: shared` | `Port 3004`)**: *Step 1.2에서 `./ui`, `./theme`, `./utils` 노출 시그니처 및 명령어 등록 예정* ([계약 정본 `§ 5.3`](./features/20261027-phase1-service-contracts/01-plan-and-design.md))
- **`remote-products` (`Scope: products` | `Port 3002`)**: *Step 1.3에서 `./ProductList` 노출 시그니처 및 명령어 등록 예정* ([계약 정본 `§ 5.4.2`](./features/20261027-phase1-service-contracts/01-plan-and-design.md))
- **`remote-cart` (`Scope: cart` | `Port 3003`)**: *Step 1.4에서 `./CartWidget` 노출 시그니처 및 명령어 등록 예정* ([계약 정본 `§ 5.4.3`](./features/20261027-phase1-service-contracts/01-plan-and-design.md))
- **`host-vite` (`Port 3000`) & `host-rspack` (`Port 3001`)**: *Step 1.5에서 대시보드 및 `MfeInspector` 명령어 등록 예정*
