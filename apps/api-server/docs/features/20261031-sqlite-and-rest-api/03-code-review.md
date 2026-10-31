# 🔍 [코드 리뷰 및 품질·보안 검증서] 백엔드 API 서버 & 내장 SQLite 3종 SQL 구축 (`03-code-review.md`)

> **✍️ 문서 목적 및 한국어 가독성 원칙 (필수 준수)**
> 1. **작성 시점**: 4단계 본 코드 및 TDD 구현(`Green`)이 끝난 직후, **5단계 PR 초안을 생성하기 전에** 구현된 코드가 설계·보안·MFE 14대 이슈·서비스 16대 이슈 기준을 모두 통과했는지 검증하고 승인자(사용자)에게 투명한 리뷰 데이터를 제공하기 위해 작성합니다.
> 2. **승인자 중심의 읽기 쉬운 한국어 서술**: 승인자가 전체 소스 코드를 일일이 다 열지 않고도 이 문서 하나만으로 **"무엇이 어떻게 구현되었고, 어떤 잠재 이슈가 방어되었는지"** 명쾌하게 판단할 수 있도록 자연스러운 한국어(호스트, 리모트, 컴포넌트, 모킹 등)와 범용 영문 키워드(`PR`, `TDD`, `API`, `SQL`, `XSS`, `CORS` 등)로 작성합니다.

---

## 1. 리뷰 핵심 입력 데이터 요약 (Review Context & Data Exchange) — `[공통 필수]`
> 승인자가 빠르고 정확하게 리뷰할 수 있도록 정리한 **5대 핵심 검증 데이터**입니다.

### 1.1 설계 대비 실제 구현 일치도 (`Plan vs Actual Diff`)
| 파일 경로 | 설계서(`01-plan`) 계획 | 실제 구현 상태 (`git status`) | 변경 라인 수 (`+ / -`) | 일치 여부 및 변경 사유 |
| :--- | :--- | :---: | :---: | :--- |
| `apps/api-server/package.json` | `@mfe-study/api-server` 패키지 및 DB 스크립트 | `NEW` | `+33 / -0` | `일치` |
| `apps/api-server/tsconfig.json`, `vitest.config.ts` | 백엔드 TS 및 Vitest 설정 | `NEW` | `+23 / -0` | `일치` |
| `apps/api-server/sql/01-schema.sql` | 4대 테이블·인덱스·`_schema_comments` 스키마 | `NEW` | `+68 / -0` | `일치` |
| `apps/api-server/sql/02-reset-seed.sql` | 사용자 2명·상품 6종·장바구니 샘플 시드 | `NEW` | `+24 / -0` | `일치` |
| `apps/api-server/sql/03-drop-all.sql`, `.sql-hashes.json` | 외래키 역순 삭제 및 SHA-256 해시 기록 | `NEW` | `+19 / -0` | `일치` |
| `apps/api-server/src/types/contracts.ts` | 루트 SSOT 계약 및 `Omit` 합성 DB 행 타입 | `NEW` | `+153 / -0` | `일치` (`CartItemRow` + `Omit<ProductRow>` 합성 적용) |
| `apps/api-server/src/db/client.ts`, `cli.ts`, `client.test.ts` | `node:sqlite` 연결, `PRAGMA`, `runInTransaction` | `NEW` | `+288 / -0` | `보완` (멀티레포 격리를 위한 `verifyLocalSqlHashes` 및 `ROLLBACK` 2차 예외 가드 추가) |
| `apps/api-server/src/middlewares/response.ts`, `error-handler.ts` (+ `test`) | 표준 응답 봉투(`ApiResponse`) 및 전역 에러 미들웨어 | `NEW` | `+245 / -0` | `보완` (깨진 JSON `400` 분류 및 `500` 내부 원문 마스킹 추가) |
| `apps/api-server/src/modules/system/*` | `GET /api/health`, `GET /api/schema-comments` (+ `test`) | `NEW` | `+90 / -0` | `일치` |
| `apps/api-server/src/modules/auth/*` | `GET /api/users`, `POST /api/auth/login` (+ `test`) | `NEW` | `+152 / -0` | `일치` |
| `apps/api-server/src/modules/products/*` | `GET /api/products` 필터링 (+ `test`) | `NEW` | `+165 / -0` | `보완` (`LIKE` 검색 와일드카드 `%`, `_`, `\` 이스케이프 추가) |
| `apps/api-server/src/modules/cart/*` | `GET / POST / DELETE /api/cart` (+ `test`) | `NEW` | `+388 / -0` | `일치` (`INNER JOIN` + `BEGIN IMMEDIATE` + 원자적 `UPSERT`) |
| `apps/api-server/src/app.ts`, `server.ts` | Express 5 조립 팩토리 및 Port 4000 서버 | `NEW` | `+73 / -0` | `보완` (`express.json({ limit: '100kb' })` 추가) |
| `apps/api-server/src/__tests__/api-and-sql.integration.test.ts` | 3종 SQL 멱등성·외래키 및 E2E API 통합 테스트 | `NEW` | `+65 / -0` | `일치` |
| `docs/service-registry.md`, `GEMINI.md`, `scripts/inject-context.mjs`, `docs/study/05,06` | 새 세션 명령어·API 운영 정본 신설 및 학습 문서 보강 | `NEW` / `MOD` | `+215 / -12` | `보완` (승인자 요청으로 서비스 레지스트리 정본 및 라이프사이클 학습 가이드 추가) |

### 1.2 핵심 데이터 흐름 및 입출력 요약 (`Data Flow & Contracts`)
- **입력 데이터 (`Request`)**:
  - 다중 포트 프론트엔드(`3000 ~ 3004`)로부터 들어오는 REST 요청(`req.body`, `req.query`, `req.params`)을 도메인별 `Zod` 스키마(`safeParse`)로 최전선에서 검증합니다.
- **내부 핵심 처리 로직**:
  - **조회**: `GET /api/products`는 바인딩 파라미터(`?`)와 `ESCAPE '\'`로 안전하게 필터링하며, `GET /api/cart`는 `cart_items`와 `products`를 단일 `INNER JOIN`하여 `N+1 쿼리` 없이 조회한 뒤 스네이크 케이스(`CartItemJoinedRow`)를 카멜 케이스(`CartItemView`)로 변환합니다.
  - **쓰기**: `POST /api/cart`는 `runInTransaction(db, ...)`(`BEGIN IMMEDIATE`)으로 즉시 쓰기 잠금을 선점한 상태에서 유저·상품·재고(`stock`)를 검증하고, `UNIQUE(user_id, product_id)` 기반 `ON CONFLICT DO UPDATE` 원자적 `UPSERT`로 수량 증발(`TOCTOU`) 없이 누적합니다.
- **출력 데이터 (`Response`)**:
  - 성공 시 `sendSuccess`를 통해 `{ success: true, data: T }` 봉투로 응답하며, 실패 시 `globalErrorHandler`를 통해 `{ success: false, error: { code, message, details? } }` 표준 에러 봉투로 일관되게 반환합니다.

### 1.3 TDD 테스트 실행 증거 (`Test Execution Evidence`)
- **실행 명령어**: `pnpm --filter @mfe-study/api-server test` (루트 통합: `pnpm test`)
- **통과 현황**: `api-server` 단독 **총 `14`건 중 `14`건 통과** (`0`건 실패, 소요 시간: `708ms`) / 루트 통합 **총 `20`건 중 `20`건 통과** (`707ms`)
- **주요 검증 시나리오 요약**:
  - `[TC-01 / EC-01]` 파일 DB(`wal`) 및 인메모리 DB(`memory`) `PRAGMA` 활성화, `runInTransaction` 성공 시 `COMMIT` 및 예외 시 `ROLLBACK` 원상복구 통과
  - `[TC-02]` `GET /api/health` (`CORS` 헤더 포함) 및 `GET /api/schema-comments` (4대 테이블 한글 설명 카멜 케이스 반환) 통과
  - `[TC-03 / TC-04]` 사용자 목록·로그인 검증 및 상품 카테고리·검색어(`%` 와일드카드 이스케이프 포함) 필터링 통과
  - `[TC-05 / EC-03]` 동일 `(userId, productId)` 연속 추가 시 중복 행 없이 원자적 `UPSERT` 수량 누적(`1 + 2 = 3`), 재고 초과 시 `400 OUT_OF_STOCK` 차단 통과
  - `[EC-02 / EC-04]` `Zod` 검증 실패(`400`), 깨진 JSON 본문(`400`), 미등록 경로(`404`), 비표준 문자열 예외(`500` 외부 메시지 마스킹) 통과
  - `[SQL-01 / INT-01]` `.sql-hashes.json` 해시 일치, `01 -> 02 -> 03 -> 01 -> 02` 반복 실행 멱등성, 외래키 제약 및 `ON DELETE CASCADE` 연쇄 삭제 통과

### 1.4 정적 분석 및 하네스 게이트 통과 결과 (`Quality Gates`)
- **포맷팅 및 린트 (`Biome`)**: `통과` (`Checked 44 files in 7ms. No fixes applied.`)
- **타입 검사 (`tsc --noEmit`)**: `통과` (`pnpm --filter @mfe-study/api-server typecheck` 에러 0건)
- **작업 스코프 격리 (`verify-scope.mjs`)**: `api` (`apps/api-server`) 및 전역 허용 루트 설정/문서 외 타 마이크로 앱 수정 `0`건 확인
- **DB 3종 SQL 해시 동기화 (`verify-sql-sync.mjs`)**: `통과` (`✅ 3종 SQL 해시 및 인메모리 멱등성 검증 통과!`)

---

## 2. [보안 점검] 애플리케이션 및 API 보안 체크리스트 (`Security`) — `[공통 필수]`
- [x] **[SEC-01] SQL 인젝션 방어 및 입력 스키마 검증**: 모든 SQLite 쿼리에 문자열 결합 없이 100% `db.prepare()` 바인딩 파라미터(`?`)를 적용하고 검색어 `LIKE` 와일드카드(`%`, `_`, `\`)까지 `ESCAPE '\'`로 이스케이프했으며, 모든 입력(`body`, `query`, `params`)을 `Zod` `safeParse`로 검증함 (`통과`)
- [x] **[SEC-02] XSS(스크립트 삽입) 및 DOM 보안**: 백엔드 순수 JSON API 서버(`application/json`)로 동작하며 `eval` 등 위험 동적 실행 코드 사용 0건 (`통과`)
- [x] **[SEC-03] 인증·인가 검증 및 민감 정보 노출 차단**: 장바구니 단건 삭제 시 `WHERE id = ? AND user_id = ?`로 본인 소유 여부를 검증하며, 의도되지 않은 `500 INTERNAL_ERROR` 발생 시 내부 DB·시스템 에러 원문은 `internalMessage`에만 남기고 외부 응답은 `'서버 내부 오류가 발생했습니다.'`로 마스킹하여 유출을 차단함 (`통과`)
- [x] **[SEC-04] 안전한 CORS 및 네트워크 경계**: 다중 포트 마이크로 앱(`3000~3004`) 연동을 위한 `CORS` 허용 헤더 적용, `express.json({ limit: '100kb' })` 본문 크기 제한 및 `SIGINT`/`SIGTERM` Graceful Shutdown(`server.close` -> `db.close`) 적용 완료 (`통과`)

---

## 3. [MFE 실전 이슈 점검] MFE 14대 고유 이슈 방어 체크리스트 ([`Study 04`](../../../../../docs/study/04-mfe-real-world-pitfalls-and-solutions.md) 기준)
- **적용 여부**: `부분 적용 (백엔드 다중 포트 CORS 및 물리적 멀티레포 격리 항목 해당)`
- [x] **다중 포트 CORS 및 스모크 호환 (#03, #14)**: `Origin: http://localhost:3000` 요청 시 `Access-Control-Allow-Origin` 헤더와 HTTP `200`을 반환하여 추후 `verify-mfe-smoke.mjs` 런타임 스모크 테스트 기준을 충족하며, 로컬 타 앱 코드 참조가 0%로 격리됨 (`통과`)

---

## 4. [서비스 구현 실전 이슈 점검] 풀스택 16대 이슈 방어 체크리스트 ([`Study 05`](../../../../../docs/study/05-fullstack-service-real-world-issues.md) 기준)

### 4.1 프론트엔드 & 디자인 시스템 점검 (`shared`, `products`, `cart`, `host-*` 해당 시)
- `N/A (해당 없음 — 순수 백엔드 스코프)`

### 4.2 백엔드 API & SQLite DB 점검 (`api` 해당 시)
- [x] **SQLite 무결성 및 동시성 (#05~#06)**: 커넥션 생성 직후 `PRAGMA foreign_keys = ON` 및 `PRAGMA journal_mode = WAL` 강제 활성화, `GET /api/health` 실시간 자가 점검, `_schema_comments` 이중 한글 코멘트 등록, `BEGIN IMMEDIATE` 트랜잭션 래퍼(`runInTransaction`) 및 `ON CONFLICT(user_id, product_id) DO UPDATE` 원자적 `UPSERT` 적용 완료 (`통과`)
- [x] **표준 에러 응답 및 쿼리 최적화 (#07~#08)**: 표준 응답 봉투(`{ success, data, error }`)와 전역 에러 미들웨어를 통일했으며, `cart_items` + `products` 단일 `INNER JOIN` 조회, 외래키 인덱스(`idx_cart_items_user_id`), 그리고 `Omit<ProductRow, ...>` 인터페이스 합성 패턴을 적용함 (`통과`)

### 4.3 공통 모듈 및 주석 컨벤션 점검 (`공통 필수`)
- [x] **모듈 구조 및 예외 안전성 (#09~#12)**: 무분별한 배럴 파일 없이 도메인별(`system`, `auth`, `products`, `cart`) 명확한 단방향 의존성을 유지하며, `normalizeBackendError`로 문자열 등 비표준 예외를 안전하게 처리함 (`통과`)
- [x] **6대 주석 원칙 ([`Study 02` §3](../../../../../docs/study/02-polyrepo-and-architecture-decisions.md) 및 `GEMINI.md` 기준)**: 모든 파일 최상단 헤더(`@file`, `@app`, `@exposed`, `@description`), **모든 인터페이스 내부 속성의 `/** */` 인텔리센스 한글 주석**, 함수 `@param`/`@returns` JSDoc, 상수 주석, 분기문(`if/else`, `switch`)의 의도(Why) 주석이 100% 작성·동기화됨 (`통과`)

---

## 5. 리뷰 발견 사항 및 PR 생성 전 조치 내역 (Findings & Actions) — `[공통 필수]`

### 5.1 리뷰 중 발견 및 즉시 수정 완료한 내역 (`Self-Corrected Issues`)
1. **통합 테스트의 외부 루트 스크립트 참조로 인한 `tsc` `rootDir` 위반(`TS6059`) 발견** -> 물리적 멀티레포 독립성을 위해 `src/db/client.ts` 내부에 `verifyLocalSqlHashes()` 자체 검증 함수를 구현하여 외부 폴더 참조를 0%로 제거하고 `typecheck` 및 `build` 통과 완료 (해결 완료)
2. **깨진 JSON 본문(`SyntaxError`) 수신 시 `500` 반환 및 내부 에러 원문 노출 위험(`SEC-03`) 발견** -> `normalizeBackendError`에서 JSON 파싱 `SyntaxError(status: 400)`를 `400 VALIDATION_ERROR`로 정확히 분류하고, 일반 `500` 예외는 외부 `message`를 마스킹(`internalMessage`와 분리)하며 `express.json({ limit: '100kb' })` 크기 제한을 추가함 (해결 완료)
3. **`runInTransaction` 내 `ROLLBACK` 2차 예외 발생 시 원본 예외 덮어쓰기 가능성 발견** -> SQLite가 치명적 오류로 트랜잭션을 이미 자동 종료한 상태에서도 원래의 원인 예외(`err`)가 보존되도록 `ROLLBACK` 호출을 `try / catch` 가드로 보호함 (해결 완료)
4. **상품 키워드 검색(`LIKE`) 시 `%`, `_` 와일드카드 문자 리터럴 매칭 보완 및 `docs/service-registry.md` 오타 수정** -> 검색어 특수문자를 이스케이프(`ESCAPE '\'`)하고 테스트 케이스를 추가했으며, 레지스트리 표 내 오타(`'all' Play` -> `'all'`)를 교정함 (해결 완료)

### 5.2 승인자(사용자) 중점 확인 요청 포인트 (`Questions / Highlights for Approver`)
1. **파일 DB 자동 초기화 정책 (`server.ts` -> `createDatabaseClient({ autoInitialize: true })`)**:
   - 로컬에서 `pnpm dev`로 처음 서버를 띄울 때 별도로 `db:setup`을 먼저 치지 않아도 즉시 대시보드가 동작하도록, `users` 테이블이 비어 있을 때 최초 1회 `01-schema.sql`과 `02-reset-seed.sql`을 자동 실행하도록 구성했습니다. (이후 데이터가 쌓인 상태에서는 서버를 재시작해도 데이터가 초기화되지 않고 유지되며, 수동 리셋은 `db:reset`으로 수행합니다.)
2. **신설된 [`docs/service-registry.md`](../../../../../docs/service-registry.md) 구성 확인**:
   - 앞으로 새 세션을 열었을 때 훅이 자동으로 가리키는 서비스 명령어·API·노출 모듈 요약 정본이 보기 편하게 구성되었는지 확인 부탁드립니다.

---

## 6. 최종 리뷰 판정 (Review Verdict)
- **판정 결과**: `✅ 승인 가능 (Ready for PR)`
- **다음 단계**: 이상 없으므로 [`pull-request.template.md`](../../../../../docs/templates/pull-request.template.md) 기반 PR 초안 및 순수 텍스트 커밋 메시지 보고(`5단계-B`) 진행
