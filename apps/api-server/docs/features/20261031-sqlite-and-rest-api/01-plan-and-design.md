# 📐 [기획 및 설계] 백엔드 API 서버 & 내장 SQLite 3종 SQL 구축 (`01-plan-and-design.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 기획 배경, 설계 의도, 아키텍처 흐름은 승인자가 읽기 편하도록 명확하고 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 라우팅, 이벤트 버스, 상태 공유, 시드 데이터 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `exposes`, `remotes`, `singleton`, `ErrorBoundary`, `Suspense`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261031-sqlite-and-rest-api` |
| **서비스 스코프 (`Scope ID`)** | `api` (`apps/api-server`, `Port 4000`) |
| **작업 브랜치** | `api/feat/sqlite-and-rest-api` (패턴 A) |
| **기술 스택 / 번들러** | `Node.js 22 (node:sqlite) + Express 5 + TypeScript 5.7 + Zod + Vitest + Supertest` |
| **작성일** | `2026-10-31` |
| **작업 규모 평가** | `적정 (단일 PR)` — 3종 SQL 세트(`01~03`)와 이를 소비하는 도메인별 REST API가 하나의 스키마 무결성 단위로 결합됨 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- 물리적으로 격리된 다중 호스트(`host-vite:3000`, `host-rspack:3001`)와 도메인 리모트(`remote-products:3002`, `remote-cart:3003`)가 동일한 영속 데이터를 주고받으며 상태 동기화(`Mode A` vs `Mode B`)와 호스트 출처(`addedFromHost`) 추적을 검증할 수 있도록 중앙 백엔드 API 서버(`Port 4000`)를 구축합니다.
- 외부 DB 서버 설치나 C++ 네이티브 컴파일(`node-gyp`) 없이 macOS와 Windows 어디서나 즉시 동작하도록 **Node.js 22 공식 내장 `node:sqlite`(`DatabaseSync`)**와 상시 세트로 검증되는 **3종 SQL 파일(`01-schema.sql`, `02-reset-seed.sql`, `03-drop-all.sql`)** 체계를 확립합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **무서버 메모리 테스트 분리 구조 (`app.ts` vs `server.ts`)**: Express 애플리케이션 조립(`src/app.ts`)과 실제 4000번 포트 리스닝(`src/server.ts`)을 분리하여, `Vitest + Supertest`에서 포트 충돌 없이 격리된 임시/인메모리 SQLite 인스턴스를 주입해 고속 TDD를 수행합니다.
- **SQLite 실전 함정 방어 ([Study 05](../../../../../docs/study/05-fullstack-service-real-world-issues.md) `#05 ~ #08` 적용)**:
  1. 커넥션 생성 시 `PRAGMA foreign_keys = ON` 및 `PRAGMA journal_mode = WAL` 강제 활성화 + `GET /api/health` 런타임 자가 점검
  2. SQLite의 `COMMENT` 문법 부재를 보완하는 인라인 SQL 주석 + `_schema_comments` 메타 테이블 이중 코멘트 아키텍처
  3. 장바구니 수량 추가 시 동시성 경합(`TOCTOU`)을 막는 복합 `UNIQUE(user_id, product_id)` 기반 원자적 `UPSERT` 및 트랜잭션 래퍼 적용
  4. `cart_items`와 `products`의 단일 `INNER JOIN` 조회 및 외래키 인덱스를 통한 `N+1 쿼리` 원천 차단

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**: [Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)](../../../../../docs/features/20261027-phase1-service-contracts/01-plan-and-design.md)
- **참조 항목(섹션 제목)**:
  - `§ 5.1.1 표준 API 응답 엔벨로프 계약 (ApiResponse<T> & ApiErrorPayload)`
  - `§ 5.1.2 데이터베이스 4대 테이블(_schema_comments, users, products, cart_items) 및 도메인 엔티티 계약`
  - `§ 5.1.3 REST API 7대 엔드포인트 요청·응답 상세 명세 (Port 4000)` *(표 내 정의된 1~8번 전체 엔드포인트 구현)*
  - `§ 5.5 Module Federation 2.0 공통 공유 의존성(shared singleton) 및 포트·CORS 계약` *(백엔드 Port `4000` 및 다중 포트 `CORS` 허용)*

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `Node.js v22 (node:sqlite)` (`/websites/nodejs_latest-v22_x_api`), `Express v5` (`/websites/expressjs`), `Zod v3`, `Supertest v7`
- **핵심 스펙 및 주의사항 (4대 체크포인트)**:
  1. **트랜잭션 라이프사이클 함수 직접 구현 (`runInTransaction`)**:
     - 여러 쿼리를 한 묶음으로 처리할 때는 `BEGIN IMMEDIATE`(시작 및 쓰기 잠금 선점) → 쿼리 실행 → 성공 시 `COMMIT`(확정) / 에러 시 `ROLLBACK`(취소) 과정을 거쳐야 합니다.
     - 외부 라이브러리(`better-sqlite3`)와 달리 Node.js 22 내장 `node:sqlite`(`DatabaseSync`)에는 이를 자동으로 감싸주는 `.transaction()` 편의 함수가 없으므로, `src/db/client.ts`에 `runInTransaction` 도우미 함수를 직접 만들어 사용합니다.
  2. **`.run()` 쓰기 쿼리 실행 후 반환되는 키값(`lastInsertRowid`) 숫자 변환**:
     - `INSERT`나 `UPDATE` 쿼리를 `.run()`으로 실행하면 `{ changes, lastInsertRowid }`가 반환되는데, 생성된 행의 ID(`lastInsertRowid`)가 일반 숫자(`number: 1`)가 아닌 거대 정수(`bigint: 1n`)로 올 수 있습니다.
     - `bigint`가 그대로 섞이면 JSON 응답 생성 시 에러가 발생하므로 항상 `Number(...)`로 감싸 안전한 일반 숫자로 변환합니다.
  3. **인메모리 DB(`:memory:`)와 실제 파일 DB(`mfe_study.db`)의 저널 모드 응답 호환 처리**:
     - 동시성 성능을 위해 `PRAGMA journal_mode = WAL` 명령을 실행할 때, 실제 파일 DB는 `'wal'`을 반환하지만 테스트용 인메모리 DB(`:memory:`)는 파일이 없어 `'memory'`를 반환합니다.
     - 두 환경 모두에서 호환되도록 `GET /api/health`는 실제 DB가 응답한 모드 값(`'wal'` 또는 `'memory'`)을 그대로 반환하며, 통합 테스트에서는 임시 파일 DB(`'wal'` 확인)와 인메모리 DB를 모두 검증합니다.
  4. **Express 5 (`express@^5.1.0`) 내장 비동기 에러 포착**:
     - 예전 Express 4에서는 `async` 함수 안에서 `throw`로 에러를 던지면 프레임워크가 잡지 못해 매번 `try / catch`와 `next(err)`를 수동으로 작성해야 했습니다.
     - Express 5부터는 라우터 자체가 Promise 래퍼로 감싸져 있어, 핸들러 안에서 그냥 `throw new AppError(...)`만 던져도 자동으로 최하단 전역 에러 미들웨어로 전달됩니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
> `apps/api-server/**` 스코프 파일 및 루트 테스트 러너 연결(`vitest.config.ts`, `pnpm-lock.yaml` — 전역 허용 목록) 대상입니다.

| 구분 (`NEW` / `MOD` / `DEL`) | 파일 경로 (루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `apps/api-server/docs/todo.md` | `api` 서비스 스코프 전용 작업 현황 및 백로그 관리 문서 |
| `NEW` | `apps/api-server/docs/features/20261031-sqlite-and-rest-api/01-plan-and-design.md` | 본 기획 및 상세 설계 문서 |
| `NEW` | `apps/api-server/package.json` | `@mfe-study/api-server` 패키지 매니페스트 (`express`, `cors`, `zod: catalog:`, `tsx`, `supertest`, `vitest: catalog:`, DB 관리 스크립트) |
| `NEW` | `apps/api-server/tsconfig.json` | 루트 `tsconfig.base.json`을 상속하는 백엔드 TypeScript 설정 |
| `NEW` | `apps/api-server/vitest.config.ts` | 백엔드 단위(`Co-location`) 및 통합(`src/__tests__/`) 테스트 설정 |
| `NEW` | `apps/api-server/sql/01-schema.sql` | `_schema_comments`, `users`, `products`, `cart_items` 테이블, 인덱스, 인라인 주석 및 한글 코멘트 메타데이터 생성 쿼리 |
| `NEW` | `apps/api-server/sql/02-reset-seed.sql` | 기존 데이터 초기화 및 초기 시드 데이터(테스트 사용자, 상품 카탈로그, 초기 장바구니 샘플) 투입 쿼리 |
| `NEW` | `apps/api-server/sql/03-drop-all.sql` | 외래키 역순(`cart_items -> products -> users -> _schema_comments`) 인덱스·테이블 전체 삭제 쿼리 |
| `NEW` | `apps/api-server/sql/.sql-hashes.json` | `node scripts/verify-sql-sync.mjs --update`로 생성되는 3종 SQL SHA-256 해시 기록 파일 |
| `NEW` | `apps/api-server/src/types/contracts.ts` | 루트 SSOT `§ 5.1` 도메인 계약 타입(`ApiResponse`, `UserEntity`, `ProductEntity`, `CartItemView` 등) 로컬 선언 (6대 주석 준수) |
| `NEW` | `apps/api-server/src/db/client.ts` | `node:sqlite` 연결 초기화(`PRAGMA foreign_keys = ON`, `WAL`), 3종 SQL 로더/실행기, `runInTransaction` 헬퍼 (`+ client.test.ts`) |
| `NEW` | `apps/api-server/src/db/cli.ts` | `pnpm --filter @mfe-study/api-server db:schema / db:reset / db:drop / db:setup` CLI 실행 스크립트 |
| `NEW` | `apps/api-server/src/middlewares/response.ts` | 표준 성공 응답(`sendSuccess`) 헬퍼 및 `AppError` 커스텀 비즈니스 예외 클래스 |
| `NEW` | `apps/api-server/src/middlewares/error-handler.ts` | 미등록 경로 `404` 핸들러, `normalizeBackendError`, 전역 에러 핸들러 미들웨어 (`+ error-handler.test.ts`) |
| `NEW` | `apps/api-server/src/modules/system/system.router.ts` | `GET /api/health` (`PRAGMA` 자가 점검) 및 `GET /api/schema-comments` 라우터 (`+ system.test.ts`) |
| `NEW` | `apps/api-server/src/modules/auth/auth.schema.ts` | 로그인 요청(`POST /api/auth/login`) `Zod` 검증 스키마 |
| `NEW` | `apps/api-server/src/modules/auth/auth.service.ts` | 사용자 전체 조회 및 `userId` 기반 로그인 검증 서비스 |
| `NEW` | `apps/api-server/src/modules/auth/auth.router.ts` | `GET /api/users`, `POST /api/auth/login` 라우터 (`+ auth.test.ts`) |
| `NEW` | `apps/api-server/src/modules/products/products.schema.ts` | 상품 필터링 쿼리(`category`, `search`) `Zod` 검증 스키마 |
| `NEW` | `apps/api-server/src/modules/products/products.service.ts` | 카테고리·검색어 바인딩 파라미터 조회 서비스 |
| `NEW` | `apps/api-server/src/modules/products/products.router.ts` | `GET /api/products` 라우터 (`+ products.test.ts`) |
| `NEW` | `apps/api-server/src/modules/cart/cart.schema.ts` | 장바구니 조회·추가·삭제(`:id` 또는 `'all'`) `Zod` 검증 스키마 |
| `NEW` | `apps/api-server/src/modules/cart/cart.service.ts` | `INNER JOIN` 단일 조회, 재고 검증 + 원자적 `UPSERT`, 단건/전체 삭제 서비스 |
| `NEW` | `apps/api-server/src/modules/cart/cart.router.ts` | `GET /api/cart`, `POST /api/cart`, `DELETE /api/cart/:id` 라우터 (`+ cart.test.ts`) |
| `NEW` | `apps/api-server/src/app.ts` | CORS, JSON 파서, 도메인 라우터, 404/전역 에러 미들웨어를 조립하는 `createApp(db)` 팩토리 |
| `NEW` | `apps/api-server/src/server.ts` | `mfe_study.db` 초기화(최초 부트 시 스키마·시드 자동 보장) 및 `Port 4000` 리스닝 진입점 |
| `NEW` | `apps/api-server/src/__tests__/api-and-sql.integration.test.ts` | 3종 SQL 생명주기(`01 -> 02 -> 03 -> 01`) 멱등성·외래키·코멘트 검증 및 전체 REST API `Supertest` 통합 시나리오 테스트 |
| `MOD` | `vitest.config.ts` | 루트 `pnpm test`(Stop Gate 및 Lefthook) 실행 시 `scripts/__tests__`와 `apps/*/src/**/*.test.ts(x)`가 함께 검증되도록 워크스페이스 프로젝트 연결 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마) — `[공통 필수]`
> 공통 API 엔벨로프 및 도메인 엔티티는 **§ 2.3에 명시된 루트 정본(`§ 5.1.1 ~ § 5.1.3`)을 그대로 따르며**(본문 중복 기재 생략), 아래에는 백엔드 내부 DB 연결·에러 처리·SQLite 스네이크 케이스 매핑 및 `Zod` 입력 검증 계약을 정의합니다.

### 5.1 DB 클라이언트·트랜잭션 및 헬스체크 내부 인터페이스 (`src/db/client.ts`)
```ts
import type { DatabaseSync } from 'node:sqlite';

/**
 * @description SQLite 데이터베이스 연결 생성 옵션 인터페이스
 */
export interface DatabaseClientOptions {
  /** 데이터베이스 파일 경로 (기본값: 'apps/api-server/mfe_study.db', 테스트 시 ':memory:' 또는 임시 파일 경로) */
  dbPath?: string;

  /** 연결 직후 테이블이 비어 있을 때 01-schema.sql과 02-reset-seed.sql을 자동 실행할지 여부 (기본값: true) */
  autoInitialize?: boolean;
}

/**
 * @description GET /api/health 엔드포인트가 반환하는 DB 엔진 및 서버 상태 페이로드 인터페이스
 */
export interface HealthStatusPayload {
  /** API 서버 프로세스 정상 가동 상태 ('ok') */
  status: 'ok';

  /** 현재 SQLite 커넥션에 적용된 저널 모드 조회값 (파일 DB: 'wal', 인메모리 DB: 'memory') */
  dbMode: string;

  /** PRAGMA foreign_keys 마스터 스위치가 실제로 켜져(1) 있는지 여부 */
  foreignKeys: boolean;
}

/**
 * @description [Table: products] SQLite products 테이블 1:1 원본 행(Row) 인터페이스
 */
export interface ProductRow {
  /** 상품 고유 번호 (products.id, PK) */
  id: number;

  /** 상품명 (products.name) */
  name: string;

  /** 상품 단가 (products.price, 원화 정수) */
  price: number;

  /** 상품 카테고리 구분 (products.category) */
  category: 'electronics' | 'office' | 'accessories';

  /** 현재 재고 수량 (products.stock) */
  stock: number;

  /** 상품 요약 설명 (products.description) */
  description: string;
}

/**
 * @description [Table: cart_items] SQLite cart_items 테이블 1:1 원본 행(Row) 인터페이스
 */
export interface CartItemRow {
  /** 장바구니 항목 고유 번호 (cart_items.id, PK) */
  id: number;

  /** 소유 사용자 ID (cart_items.user_id) */
  user_id: string;

  /** 상품 고유 번호 (cart_items.product_id) */
  product_id: number;

  /** 담긴 상품 수량 (cart_items.quantity) */
  quantity: number;

  /** 상품을 담은 호스트 출처 (cart_items.added_from_host) */
  added_from_host: 'vite' | 'rspack' | 'standalone';

  /** 등록 또는 갱신 일시 문자열 (cart_items.created_at) */
  created_at: string;
}

/**
 * @description [Table: cart_items + products INNER JOIN]
 * CartItemRow 원본과 ProductRow(중복·미사용 컬럼 Omit)를 합성한 조인 행 인터페이스
 */
export interface CartItemJoinedRow
  extends CartItemRow,
    Omit<ProductRow, 'id' | 'name' | 'stock' | 'description'> {
  /** JOIN 조회 시 p.name AS product_name 별칭으로 매핑된 상품명 */
  product_name: ProductRow['name'];
}

/**
 * @description node:sqlite DatabaseSync에서 원자적 트랜잭션(BEGIN IMMEDIATE ~ COMMIT/ROLLBACK)을 보장하는 함수 시그니처
 */
export type TransactionRunner = <T>(db: DatabaseSync, work: () => T) => T;
```

### 5.2 비즈니스 예외 및 표준 에러 코드 설계 (`src/middlewares/response.ts`)
```ts
/**
 * @description 백엔드 전역에서 일관된 HTTP 상태 코드와 에러 엔벨로프를 생성하기 위한 표준 에러 코드 유니온 타입
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'OUT_OF_STOCK'
  | 'CONFLICT_ERROR'
  | 'INTERNAL_ERROR';

/**
 * @description AppError 생성자에 전달하는 에러 구성 옵션 인터페이스
 */
export interface AppErrorOptions {
  /** HTTP 응답 상태 코드 (예: 400, 404, 409, 500) */
  statusCode: number;

  /** 머신 판독용 표준 에러 코드 */
  code: ApiErrorCode;

  /** 클라이언트에게 전달할 한글 에러 설명 메시지 */
  message: string;

  /** Zod 검증 이슈 목록 등 선택적 디버깅 세부 정보 */
  details?: unknown;
}
```

### 5.3 외부 요청 경계 `Zod` 런타임 검증 스키마 (`src/modules/*/*.schema.ts`)
```ts
import { z } from 'zod';

/** 요청 출처 호스트 구분 Zod 스키마 */
export const hostOriginSchema = z.enum(['vite', 'rspack', 'standalone']);

/** [POST /api/auth/login] 로그인 요청 Body 검증 스키마 */
export const loginBodySchema = z.object({
  userId: z.string().trim().min(1, '사용자 ID(userId)는 필수입니다.'),
});

/** [GET /api/products] 상품 목록 필터링 Query 검증 스키마 */
export const productsQuerySchema = z.object({
  category: z.enum(['electronics', 'office', 'accessories']).optional(),
  search: z.string().trim().max(100).optional(),
});

/** [GET /api/cart] 장바구니 목록 조회 Query 검증 스키마 */
export const getCartQuerySchema = z.object({
  userId: z.string().trim().min(1, '조회할 사용자 ID(userId)는 필수입니다.'),
});

/** [POST /api/cart] 장바구니 상품 추가 요청 Body 검증 스키마 */
export const addToCartBodySchema = z.object({
  userId: z.string().trim().min(1, '사용자 ID(userId)는 필수입니다.'),
  productId: z.number().int().positive('상품 ID(productId)는 양의 정수여야 합니다.'),
  quantity: z.number().int().min(1, '수량(quantity)은 1 이상이어야 합니다.').max(99),
  addedFromHost: hostOriginSchema,
});

/** [DELETE /api/cart/:id] 장바구니 삭제 Path Param 검증 스키마 (양의 정수 문자열 또는 'all') */
export const deleteCartParamsSchema = z.object({
  id: z.union([z.literal('all'), z.string().regex(/^[1-9]\d*$/, '유효한 장바구니 ID 또는 all이어야 합니다.')]),
});

/** [DELETE /api/cart/:id] 장바구니 삭제 시 소유자 확인을 위한 Query 검증 스키마 */
export const deleteCartQuerySchema = z.object({
  userId: z.string().trim().min(1, '사용자 ID(userId) 쿼리 파라미터는 필수입니다.'),
});
```

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계 (`shared`, `products`, `cart`, `host-*` 전용)
- **적용 여부**: `N/A (해당 없음 — 순수 백엔드 API 및 SQLite DB 구축 스코프)`

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계 (`api` 전용)
- **적용 여부**: `적용`
- **REST API 엔드포인트 명세** (상세 입출력 타입은 루트 정본 `§ 5.1.3` 참조):
  - `GET /api/health`: SQLite `PRAGMA journal_mode` 및 `PRAGMA foreign_keys` 실시간 조회 결과와 함께 `{ status: 'ok', dbMode, foreignKeys }` 반환 (`CORS` 헤더 포함, `verify-mfe-smoke.mjs` 호환)
  - `GET /api/schema-comments`: `_schema_comments` 테이블의 `table_name`, `column_name`, `comment`를 카멜 케이스(`SchemaCommentRecord[]`)로 매핑하여 전체 반환
  - `GET /api/users`: 시드 등록된 테스트 사용자(`UserEntity[]`) 전체 목록 반환
  - `POST /api/auth/login`: `loginBodySchema` 검증 후 해당 `userId`가 존재하면 `UserEntity` 반환, 미존재 시 `404` (`NOT_FOUND`) 반환
  - `GET /api/products`: `productsQuerySchema` 검증 후 `category` 일치 조건 및 `search`(`name` / `description` `LIKE ?`) 바인딩 파라미터로 필터링된 `ProductEntity[]` 반환
  - `GET /api/cart`: `getCartQuerySchema` 검증 후 `cart_items`와 `products`를 `INNER JOIN`한 단일 쿼리로 해당 사용자의 `CartItemView[]` 반환 (`N+1 쿼리` 방지)
  - `POST /api/cart`: `addToCartBodySchema` 검증 후 `runInTransaction` 내부에서 ① 사용자 존재 확인(`404`), ② 상품 존재 및 재고(`stock >= 기존 담긴 수량 + 추가 수량`) 검증(부족 시 `400 OUT_OF_STOCK`), ③ `ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + excluded.quantity, added_from_host = excluded.added_from_host, created_at = datetime('now', 'localtime')` 원자적 `UPSERT` 실행 후 갱신된 `CartItemView`(`201` 또는 `200`) 반환
  - `DELETE /api/cart/:id`: `deleteCartParamsSchema` 및 `deleteCartQuerySchema` 검증 후 `:id === 'all'`이면 해당 `userId`의 전체 항목을 삭제하여 `{ deletedId: 'all', deletedCount }` 반환, 숫자 ID이면 `id = ? AND user_id = ?` 조건으로 삭제(대상 없을 시 `404 NOT_FOUND`) 후 `{ deletedId: Number(id), deletedCount: 1 }` 반환
- **DB 스키마 변경 및 3종 SQL 파일 동기화 계획 (`apps/api-server/sql/`)**:
  1. `01-schema.sql`:
     - `_schema_comments` (`PRIMARY KEY (table_name, column_name)` 대신 `NULL` 허용 테이블 코멘트 중복 방지를 위해 `COALESCE(column_name, '')` 표현식 유니크 인덱스 `idx_schema_comments_unique` 적용)
     - `users` (`id TEXT PRIMARY KEY`, `username`, `role CHECK(role IN ('admin', 'member'))`, `token`)
     - `products` (`id INTEGER PRIMARY KEY AUTOINCREMENT`, `name`, `price CHECK(price >= 0)`, `category CHECK(category IN ('electronics', 'office', 'accessories'))`, `stock CHECK(stock >= 0)`, `description`) + `idx_products_category` 인덱스
     - `cart_items` (`id INTEGER PRIMARY KEY AUTOINCREMENT`, `user_id`, `product_id`, `quantity CHECK(quantity >= 1)`, `added_from_host CHECK(added_from_host IN ('vite', 'rspack', 'standalone'))`, `created_at`, `UNIQUE(user_id, product_id)`, `FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE`, `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`) + `idx_cart_items_user_id` 인덱스
     - 모든 `CREATE TABLE` 내 인라인 `-- 한글 주석` 작성 및 `_schema_comments`에 4개 테이블·모든 컬럼 한글 설명 전수 `INSERT`
  2. `02-reset-seed.sql`:
     - 외래키 순서에 맞춰 `DELETE FROM cart_items; DELETE FROM products; DELETE FROM users;` 및 `sqlite_sequence` 시퀀스 초기화 수행
     - 기본 사용자 2명(`user-1: 홍길동 (VIP) / admin`, `user-2: 이순신 (일반) / member`), 카테고리별(`electronics`, `office`, `accessories`) 상품 카탈로그 6종(재고 0인 품절 테스트용 상품 1종 포함), 초기 장바구니 샘플 항목 시드 데이터 투입
  3. `03-drop-all.sql`:
     - `DROP INDEX IF EXISTS` 및 외래키 자식 → 부모 순서(`cart_items -> products -> users -> _schema_comments`)로 `DROP TABLE IF EXISTS` 실행
- **해시 동기화 검증**: 4단계 SQL 구현 직후 `node scripts/verify-sql-sync.mjs --update` (`pnpm sql:update`) 실행 예정 (`Yes`)
