# 🧪 [TDD 명세서] 백엔드 API 서버 & 내장 SQLite 3종 SQL 구축 (`02-tdd-spec.md`)

> **✍️ 문서 작성 및 한국어 가독성 원칙 (필수 준수)**
> 1. **승인자 중심의 읽기 쉬운 한국어 서술**: 모든 테스트 시나리오(사전 조건, 실행 동작, 기대 결과)는 승인자가 직관적으로 검증 의도를 파악할 수 있도록 자연스러운 한국어 문장으로 작성합니다.
> 2. **문맥에 맞는 한글 표기 우선**: 한글 문장 안에서 한국어로 쓰는 것이 자연스러운 용어(예: 호스트, 리모트, 컴포넌트, 서비스, 모킹, 픽스처, 시드 데이터, 폴백 등)는 억지로 영어를 섞지 않고 한글로 표기합니다.
> 3. **범용 영문 약어 및 코드 키워드 유지**: `PR`, `TDD`, `MFE`, `API`, `DB`, `SQL` 같은 약어나 `Vitest`, `ErrorBoundary`, `Suspense`, `CustomEvent`, `Ark UI`, `TanStack Query` 등 고유 명칭·코드 식별자는 그대로 영어로 표기합니다.

---

## 1. 테스트 환경 및 실행 정보 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **서비스 스코프 (`Scope ID`)** | `api` (`apps/api-server`, `Port 4000`) |
| **테스트 러너 및 모킹 도구** | `Vitest` + `Supertest` (실제 포트 바인딩 없는 메모리 HTTP 호출) + `node:sqlite` (`:memory:` 및 임시 파일 DB) |
| **단위 테스트 경로 (`Co-location`)** | `src/db/client.test.ts`, `src/middlewares/error-handler.test.ts`, `src/modules/{system,auth,products,cart}/*.test.ts` |
| **통합 테스트 경로 (`Integration`)** | `src/__tests__/api-and-sql.integration.test.ts` |
| **테스트 실행 명령어** | `pnpm --filter @mfe-study/api-server test` (루트 통합: `pnpm test`) |

---

## 2. 핵심 기능 테스트 시나리오 — `[공통 필수]`
> `Red -> Green -> Refactor` 사이클을 위해 본 코드 작성 전 먼저 실패하는 테스트(`Red`)로 구현할 목록입니다.

### TC-01: SQLite 커넥션 초기화(`PRAGMA`) 및 `runInTransaction` 트랜잭션 확정(`COMMIT`) 검증 (`src/db/client.test.ts`)
- **사전 조건 (`Given`)**: 임시 파일 DB(`test.db`)와 인메모리 DB(`:memory:`)로 각각 `createDatabaseClient`를 호출하여 초기 스키마(`01-schema.sql`)와 시드 데이터(`02-reset-seed.sql`)를 로드한 상태
- **실행 동작 (`When`)**:
  1. 두 DB 커넥션에서 `PRAGMA foreign_keys`와 `PRAGMA journal_mode` 상태를 조회한다.
  2. `runInTransaction(db, () => ...)` 내부에서 장바구니 데이터를 추가하고 정상 완료한다.
- **기대 결과 (`Then`)**:
  1. 두 커넥션 모두 `foreign_keys`가 `1`(`true`)로 켜져 있어야 하며, 저널 모드는 파일 DB에서 `'wal'`, 인메모리 DB에서 `'memory'`를 반환해야 한다.
  2. 트랜잭션 블록이 에러 없이 끝나면 `COMMIT`이 수행되어 변경된 데이터가 DB에 영구 반영되어야 한다.

### TC-02: 시스템 헬스체크(`GET /api/health`) 및 스키마 한글 코멘트(`GET /api/schema-comments`) 조회 (`src/modules/system/system.test.ts`)
- **사전 조건 (`Given`)**: 초기화된 DB가 주입된 Express 앱(`createApp(db)`)이 준비된 상태
- **실행 동작 (`When`)**: `Origin: http://localhost:3000` 헤더와 함께 `GET /api/health` 및 `GET /api/schema-comments`를 `Supertest`로 호출한다.
- **기대 결과 (`Then`)**:
  1. 두 응답 모두 HTTP `200`, `Access-Control-Allow-Origin` CORS 헤더, 그리고 표준 응답 봉투(`{ success: true, data: ... }`)를 포함해야 한다.
  2. `/api/health`의 `data`는 `{ status: 'ok', dbMode: 'memory' | 'wal', foreignKeys: true }`를 반환해야 한다.
  3. `/api/schema-comments`의 `data`는 `_schema_comments` 테이블에 등록된 4대 테이블(`_schema_comments`, `users`, `products`, `cart_items`)과 각 컬럼의 한글 설명 배열(`SchemaCommentRecord[]`, 카멜 케이스 `tableName`, `columnName`, `comment`)을 누락 없이 반환해야 한다.

### TC-03: 사용자 목록 조회(`GET /api/users`) 및 계정 전환 로그인(`POST /api/auth/login`) (`src/modules/auth/auth.test.ts`)
- **사전 조건 (`Given`)**: 시드 데이터로 `user-1`(`홍길동 (VIP)`, `admin`)과 `user-2`(`이순신 (일반)`, `member`)가 등록된 상태
- **실행 동작 (`When`)**:
  1. `GET /api/users`를 호출한다.
  2. `POST /api/auth/login`에 `{ userId: 'user-1' }`을 전송한다.
- **기대 결과 (`Then`)**:
  1. `GET /api/users`는 시드 등록된 2명의 `UserEntity[]` 목록을 반환해야 한다.
  2. `POST /api/auth/login`은 HTTP `200`과 함께 `user-1`의 사용자 정보 및 인증 토큰(`token`)을 표준 봉투(`data`)에 담아 반환해야 한다.

### TC-04: 상품 카탈로그 전체 조회 및 카테고리·검색어 필터링 (`GET /api/products`) (`src/modules/products/products.test.ts`)
- **사전 조건 (`Given`)**: `electronics`, `office`, `accessories` 카테고리의 시드 상품 6종이 등록된 상태
- **실행 동작 (`When`)**:
  1. 쿼리 파라미터 없이 `GET /api/products`를 호출한다.
  2. `GET /api/products?category=electronics&search=키보드`로 필터링 요청을 보낸다.
- **기대 결과 (`Then`)**:
  1. 전체 조회 시 6종의 상품 목록(`ProductEntity[]`, 원화 정수 `price` 포함)이 반환되어야 한다.
  2. 필터링 조회 시 카테고리가 `'electronics'`이면서 상품명 또는 설명에 `'키보드'`가 포함된 상품만 정확히 반환되어야 한다.

### TC-05: 장바구니 `INNER JOIN` 조회, 원자적 `UPSERT` 수량 누적 및 삭제 (`GET / POST / DELETE /api/cart`) (`src/modules/cart/cart.test.ts`)
- **사전 조건 (`Given`)**: `user-1` 계정과 재고가 충분한 상품(`productId: 2`, 초기 장바구니 미포함)이 존재하는 상태
- **실행 동작 (`When`)**:
  1. `POST /api/cart`로 `{ userId: 'user-1', productId: 2, quantity: 1, addedFromHost: 'vite' }`를 첫 번째 전송한다.
  2. 동일한 `(userId: 'user-1', productId: 2)` 조합으로 `{ userId: 'user-1', productId: 2, quantity: 2, addedFromHost: 'rspack' }`을 두 번째 전송한다.
  3. `GET /api/cart?userId=user-1`로 장바구니 목록을 조회한다.
  4. `DELETE /api/cart/:id?userId=user-1`로 단건 삭제 후, `DELETE /api/cart/all?userId=user-1`로 전체 비우기를 실행한다.
- **기대 결과 (`Then`)**:
  1. 첫 번째 추가 시 새 장바구니 행이 생성(`quantity: 1`, `addedFromHost: 'vite'`)되어야 한다.
  2. 두 번째 추가 시 중복 행이 생성되지 않고 **복합 고유키(`UNIQUE(user_id, product_id)`) 기반 원자적 `UPSERT`**가 동작하여 기존 행의 수량이 `1 + 2 = 3`으로 누적되고 `addedFromHost`가 `'rspack'`으로 갱신되어야 한다.
  3. `GET /api/cart` 응답은 `products` 테이블과 `INNER JOIN`되어 `productName`, `price`, `category`가 카멜 케이스(`CartItemView`)로 함께 반환되어야 한다.
  4. 단건 삭제 시 해당 항목만 삭제(`deletedCount: 1`)되고, `'all'` 삭제 시 `user-1`의 남은 장바구니 항목이 모두 비워져야 한다.

---

## 3. 예외 및 경계값 테스트 시나리오 — `[공통 필수]`
> 네트워크 실패, 잘못된 입력값, 빈 데이터, 리모트 모듈 로드 실패 등 비정상 상황을 검증합니다.

### EC-01: 트랜잭션 도중 예외 발생 시 자동 `ROLLBACK` 보장 검증 (`src/db/client.test.ts`)
- **사전 조건 (`Given`)**: `runInTransaction` 내부에서 첫 번째 `INSERT` 쿼리는 성공하고, 이어서 의도적인 에러(`throw new Error('강제 중단')`)가 발생하는 상황
- **실행 동작 (`When`)**: `runInTransaction`을 실행하고 예외를 포착한다.
- **기대 결과 및 폴백 동작 (`Then`)**: `ROLLBACK`이 자동 실행되어 첫 번째 `INSERT`로 넣었던 데이터까지 완전히 취소(원상복구)되어야 하며 DB에 잔여 데이터가 남지 않아야 한다.

### EC-02: `Zod` 스키마 검증 실패 시 표준 `400 VALIDATION_ERROR` 봉투 반환 (`auth / products / cart`)
- **사전 조건 (`Given`)**:
  - `POST /api/auth/login`에 빈 `{ userId: '' }` 전송
  - `GET /api/products?category=invalid-cat` 전송
  - `POST /api/cart`에 음수 수량(`quantity: 0`) 또는 허용되지 않은 호스트(`addedFromHost: 'webpack'`) 전송
- **실행 동작 (`When`)**: 각 잘못된 입력으로 API를 호출한다.
- **기대 결과 및 폴백 동작 (`Then`)**: 서버 크래시 없이 HTTP `400` 상태 코드와 `{ success: false, error: { code: 'VALIDATION_ERROR', message: ..., details: [...] } }` 표준 에러 봉투를 반환해야 한다.

### EC-03: 품절/재고 초과 상품 장바구니 추가 시 `400 OUT_OF_STOCK` 차단 (`src/modules/cart/cart.test.ts`)
- **사전 조건 (`Given`)**: 남은 재고(`stock`)가 `0`인 품절 시드 상품(또는 현재 재고보다 많은 수량 요청)이 있는 상태
- **실행 동작 (`When`)**: `POST /api/cart`로 재고 수량을 초과하는 담기 요청을 전송한다.
- **기대 결과 및 폴백 동작 (`Then`)**: 트랜잭션 내에서 즉시 차단되어 HTTP `400` 및 `{ success: false, error: { code: 'OUT_OF_STOCK', message: ... } }`를 반환하고, 장바구니 테이블에는 어떤 변경도 일어나지 않아야 한다.

### EC-04: 존재하지 않는 리소스 요청(`404 NOT_FOUND`) 및 비표준 예외(`500 INTERNAL_ERROR`) 방어 (`src/middlewares/error-handler.test.ts`)
- **사전 조건 (`Given`)**: 미등록 유저(`user-999`)로 로그인/장바구니 추가 시도, 미등록 URL(`GET /api/unknown-route`) 호출, 또는 라우터 내부에서 `throw '문자열 예외'`가 발생한 상황
- **실행 동작 (`When`)**: 각 요청을 실행한다.
- **기대 결과 및 폴백 동작 (`Then`)**:
  1. 미등록 유저/경로 요청은 HTTP `404`와 `code: 'NOT_FOUND'` 표준 에러 봉투를 반환해야 한다.
  2. `Error` 인스턴스가 아닌 문자열 예외가 던져져도 `normalizeBackendError`와 전역 에러 미들웨어가 안전하게 포착하여 HTTP `500` 및 `code: 'INTERNAL_ERROR'` 봉투를 반환하고 서버 프로세스는 정상 유지되어야 한다.

---

## 4. 모킹 및 테스트 픽스처 전략 — `[공통 필수]`
- **원격 모듈 스텁 (`src/testing/stubs/`)**:
  - `N/A (백엔드 단독 서버 스코프이므로 프론트엔드 원격 모듈 스텁 불필요)`
- **네트워크 / API / DB 모킹 (`src/testing/msw/` 또는 인메모리 SQLite + `Supertest`)**:
  - 단위 테스트에서는 각 테스트 케이스마다 완전히 격리된 `new DatabaseSync(':memory:')` 인스턴스를 생성해 `createApp(db)`에 주입하고 `Supertest`로 메모리 상에서 호출합니다.
  - 파일 기반 `WAL` 모드 검증 및 3종 SQL 해시 검증은 `os.tmpdir()` 임시 폴더(`mkdtempSync`)와 실제 `apps/api-server/sql/` 파일을 대상으로 수행하여 로컬 `mfe_study.db` 오염을 방지합니다.
- **테스트 픽스처 (시드 / 더미 데이터)**:
  - `apps/api-server/sql/02-reset-seed.sql`에 정의된 표준 시드 데이터(사용자 2명, 카테고리별 상품 6종 — 품절 상품 1종 포함, 초기 장바구니 샘플)를 공통 픽스처로 사용합니다.

---

## 5. [조건부 A] 프론트엔드 및 MFE 통합 검증 (`shared`, `products`, `cart`, `host-*` 전용)
- **적용 여부**: `N/A (해당 없음)`

---

## 6. [조건부 B] 백엔드 API 및 3종 SQL 무결성 검증 (`api` 전용)
- **적용 여부**: `적용`
- [ ] **3종 SQL 순차 실행 멱등성 검증**: 인메모리/임시 SQLite에서 `01-schema.sql` -> `02-reset-seed.sql` -> `03-drop-all.sql` -> `01-schema.sql` -> `02-reset-seed.sql` 순서로 반복 실행 시 에러 없이 초기 시드 상태가 100% 동일하게 재현되는가?
- [ ] **외래키(`FOREIGN KEY`) 및 `ON DELETE CASCADE` 무결성 검증**: 존재하지 않는 `user_id`/`product_id`를 `cart_items`에 직접 `INSERT`할 때 SQLite 외래키 에러로 차단되며, 부모 상품/유저 삭제 시 장바구니 항목도 자동 연쇄 삭제되는가?
- [ ] **스키마 주석 메타 테이블 검증**: `_schema_comments` 테이블에 4개 테이블 및 모든 컬럼의 한글 설명이 누락 없이 등록되어 `GET /api/schema-comments`로 조회되는가?
- [ ] **SQL 해시 동기화 검증**: `node scripts/verify-sql-sync.mjs` 실행 시 3개 파일의 SHA-256 해시(`.sql-hashes.json`)가 일치하고 검증을 통과하는가?

---

## 7. 최종 완료 및 머지 전 체크리스트 — `[공통 필수]`
- [ ] 모든 단위 및 통합 테스트(`Vitest`)가 통과(`Green`)했는가?
- [ ] 6대 주석 원칙(인터페이스 내부 속성 `/** */` 인텔리센스 주석, 함수 헤더, 분기문 의도 주석 등)을 준수했는가?
- [ ] `Biome` 포맷팅 및 린트 검사(`LF` 줄바꿈 포함)를 통과했는가?
- [ ] **(머지 승인 시)** 실제 머지 직전에 루트 `todo.md` 및 해당 앱의 `docs/todo.md`(`../../todo.md`)를 최신 상태로 업데이트했는가?
