# 📓 Study 05. 풀스택 서비스 구현 16대 실전 이슈와 해결 아키텍처 (FE · BE/DB · 공통 모듈 · 디자인)

> **문서 목적**: 마이크로 프론트엔드(`MFE`) 고유 이슈([Study 04](./04-mfe-real-world-pitfalls-and-solutions.md))에 이어, 실제 웹 서비스를 구현할 때 **① 프론트엔드(`React 19` / `TanStack Query`), ② 백엔드 및 DB(`Express` / `SQLite`), ③ 공통 모듈(`remote-shared`), ④ 디자인 시스템(`Ark UI` / `CSS 테마`)** 4대 영역에서 실무자들이 가장 빈번하게 겪는 **16가지 실전 엔지니어링 이슈와 해결 패턴**을 정리한 학습 문서입니다.

---

## 📊 한눈에 보는 16대 서비스 구현 실전 이슈 요약표

| 영역 | 번호 및 이슈명 | 발생 상황 | 핵심 해결 키워드 |
| :---: | :--- | :---: | :--- |
| **1. 프론트엔드**<br>(React / Query) | **#01.** 버튼 연타 중복 요청과 조회·수정 응답 역전 (`Race Condition`) | 장바구니 담기/삭제 연타 | `isPending` 잠금 + `cancelQueries` / `AbortController` |
| **1. 프론트엔드**<br>(React / Query) | **#02.** `Suspense` 사용 시 병렬 API가 직렬 폭포수(`Waterfall`)로 느려지는 현상 | 초기 데이터 다중 조회 | `useSuspenseQueries` 병렬 호출 또는 `Suspense` 경계 분리 |
| **1. 프론트엔드**<br>(React / Query) | **#03.** 잘못된 `key` 부여 및 불필요한 `useEffect` 파생 상태 동기화 버그 | 리스트 갱신 / 합계 계산 | DB 고유 ID `key` 고정 + 렌더링 중 파생 상태(`Derived State`) 계산 |
| **1. 프론트엔드**<br>(React / Query) | **#04.** 시간대(`UTC` vs `KST`) 불일치 및 부동소수점 금액 계산 오차 | 주문 시간 / 할인 금액 표시 | 정수(원 단위) 연산 + `Intl.NumberFormat` (`formatCurrency`) |
| **2. 백엔드·DB**<br>(Express / SQLite) | **#05.** SQLite 외래키 기본 비활성화와 주석(`COMMENT`) 부재 이슈 | 유령 데이터 누적 / 스키마 의도 유실 | `PRAGMA foreign_keys = ON`, `WAL` 자가 점검 + `_schema_comments` 사전 테이블 |
| **2. 백엔드·DB**<br>(Express / SQLite) | **#06.** 수량 증가·재고 차감 시 동시성 경합(`TOCTOU`)과 트랜잭션 누락 | 동시 장바구니 추가 요청 | 원자적 `UPSERT`(`ON CONFLICT DO UPDATE`) + `db.transaction()` |
| **2. 백엔드·DB**<br>(Express / SQLite) | **#07.** API마다 제각각인 에러 응답과 미처리 비동기 예외로 인한 서버 다운 | 예외 발생 / 잘못된 요청 | 표준 응답 엔벨로프(`{ success, data, error }`) + 전역 에러 미들웨어 |
| **2. 백엔드·DB**<br>(Express / SQLite) | **#08.** 장바구니 조회 시 루프를 돌며 상품을 조회하는 `N+1 쿼리`와 인덱스 누락 | 목록 조회 성능 저하 | `JOIN` 단일 쿼리 조회 + 외래키 복합 인덱스(`CREATE INDEX`) |
| **3. 공통 모듈**<br>(`remote-shared`) | **#09.** 단일 배럴 파일(`index.ts`) 남용으로 인한 트리 쉐이킹 실패 및 순환 참조 | 공통 모듈 임포트 시 | `./ui`, `./theme`, `./utils` 서브패스 분리 및 단방향 의존성 |
| **3. 공통 모듈**<br>(`remote-shared`) | **#10.** 외부 경계 데이터를 `as Type` 단언으로만 믿었다가 런타임에 앱이 터지는 현상 | API / 이벤트 / 스토리지 수신 | 런타임 스키마 검증(`zod` 등)으로 외부 입력 데이터 파싱 |
| **3. 공통 모듈**<br>(`remote-shared`) | **#11.** 공통 컴포넌트에 도메인 플래그를 넣는 과도한 추상화(`Props` 폭발) | 버튼/셀렉트 기능 확장 시 | 도메인 지식 0% 유지 + 표준 HTML 속성 상속 및 합성 패턴 |
| **3. 공통 모듈**<br>(`remote-shared`) | **#12.** `Error` 인스턴스가 아닌 예외(`throw "문자열"`) 발생 시 에러 핸들러 크래시 | `try / catch` 예외 처리 | 모든 예외를 표준 객체로 변환하는 `normalizeError` 유틸리티 |
| **4. 디자인·UI**<br>(`Ark UI` / CSS) | **#13.** 스켈레톤(`Skeleton`)과 실제 카드 높이 불일치로 화면이 덜컥거리는 현상 (`CLS`) | 1.5초 지연 로딩 완료 시 | 스켈레톤과 실제 카드의 `min-height` · 그리드 규격 1:1 매칭 |
| **4. 디자인·UI**<br>(`Ark UI` / CSS) | **#14.** 다크 모드 및 실시간 테마 전환 시 하드코딩 색상으로 글자가 사라지는 현상 | 테마 스위처 변경 시 | 색상 하드코딩 금지 + 시맨틱 CSS 변수 토큰(`--color-*`) 강제 |
| **4. 디자인·UI**<br>(`Ark UI` / CSS) | **#15.** 헤드리스 UI 적용 시 키보드 포커스 링 증발 및 로딩 중 엔터키 중복 실행 | 키보드 탭 이동 / 폼 제출 | `:focus-visible` 스타일링 + `data-disabled` / `aria-busy` 연동 |
| **4. 디자인·UI**<br>(`Ark UI` / CSS) | **#16.** 긴 상품명·큰 금액 숫자로 플렉스박스가 터지고 숫자가 흔들리는 현상 | 긴 텍스트 / 실시간 수량 변경 | 플렉스 자식 `min-width: 0` 말줄임 + 숫자 `tabular-nums` 고정폭 적용 |

---

## 1. 프론트엔드 (`React 19` · `TanStack Query` · 비동기 제어) 실전 이슈

### #01. 버튼 연타(Double-Click) 중복 요청과 조회·수정 응답 역전 (`Race Condition`)
* **왜 문제가 되나요?**
  - 사용자가 [장바구니 담기] 버튼을 빠르게 2~3번 연타하면 `POST /api/cart` 요청이 중복 전송됩니다.
  - 더 까다로운 문제는 **응답 역전(Out-of-Order Response)**입니다: 이미 진행 중이던 옛날 장바구니 조회(`GET #1`) 응답이 네트워크 지연으로 인해 방금 성공한 상품 추가(`POST #2`)보다 **0.1초 늦게 도착하면, 화면이 방금 담은 상품이 없는 옛날 데이터로 덮어써집니다.**
* **실무 해결 아키텍처**:
  1. `useMutation`의 `isPending` 상태를 버튼의 `disabled` 및 `aria-busy`에 즉시 바인딩하여 물리적 중복 클릭을 막습니다.
  2. `TanStack Query`의 `queryFn: ({ signal }) => httpClient.get('cart', { signal }).json()`에 **`ky`의 `signal`(`AbortSignal`)**을 연결하고, 뮤테이션 시작 시(`onMutate`) `await queryClient.cancelQueries({ queryKey: ['cart'] })`를 호출하여 진행 중이던 구버전 `GET` 요청을 네트워크 레벨에서 즉시 취소합니다.

### #02. `Suspense` 환경에서 병렬 API 요청이 직렬 폭포수(`Request Waterfall`)로 변하는 현상
* **왜 문제가 되나요?**
  - 한 컴포넌트 안에서 `useSuspenseQuery`를 두 번 연속 호출하면, 첫 번째 쿼리가 `Promise`를 던지며(throw) 컴포넌트 렌더링이 즉시 일시 중단(Suspend)됩니다.
  - 그 결과 **첫 번째 API 응답이 완전히 끝날 때까지 두 번째 API 요청은 출발조차 하지 못하는 직렬 대기(Waterfall)**가 발생해 로딩 시간이 2배로 늘어납니다.
* **실무 해결 아키텍처**:
  - 서로 의존성이 없는 데이터는 ① 각자 별도의 하위 컴포넌트와 `<Suspense>` 경계로 분리하여 동시에 출발시키거나, ② 한 컴포넌트에서 부를 때는 반드시 `useSuspenseQueries({ queries: [...] })`를 사용해 병렬로 요청합니다.

### #03. 잘못된 `key` 부여(`index`) 및 불필요한 `useEffect` 파생 상태로 인한 버그
* **왜 문제가 되나요?**
  1. 장바구니 목록에서 배열의 `index`를 `key`로 쓰면, 첫 번째 상품을 삭제했을 때 두 번째 상품의 DOM 상태가 첫 번째 자리를 덮어써서 수량 입력창 포커스나 애니메이션이 엉뚱한 항목에 남습니다.
  2. `cartItems` 배열에서 `totalPrice`(총금액)를 계산하려고 `const [total, setTotal] = useState(0)`과 `useEffect`를 쓰면, 불필요한 추가 렌더링(2번 렌더링)이 발생하고 순간적으로 이전 금액이 보이는 깜빡임이 생깁니다.
* **실무 해결 아키텍처**:
  - 리스트의 `key`는 무조건 DB 고유 식별자(`item.id`)를 사용하고, 기존 상태에서 계산 가능한 값(총금액, 총수량, 필터링 결과)은 `useState + useEffect`를 절대 쓰지 않고 렌더링 본문에서 즉시 계산(`const totalPrice = items.reduce(...)`)합니다.

### #04. 시간대(`UTC` vs `KST`) 불일치 및 부동소수점 금액 계산 오차
* **왜 문제가 되나요?**
  - JavaScript에서 `0.1 + 0.2 === 0.30000000000000004`이듯, 소수점 할인 연산을 그냥 처리하면 화면에 `19,999.999999원`이 찍힙니다.
  - 또한 SQLite의 기본 `CURRENT_TIMESTAMP`는 `UTC` 기준이므로 한국 시간(`KST`, UTC+9)과 9시간 차이가 납니다.
* **실무 해결 아키텍처**:
  - 모든 원화 금액은 정수(Integer) 단위로만 저장·연산(`Math.round` 및 `es-toolkit`의 `sumBy`)하고 화면 표시 직전에만 `remote-shared/utils`의 `formatCurrency`(`Intl.NumberFormat('ko-KR')`)를 거치게 합니다.
  - 시간은 DB 저장 시 `datetime('now', 'localtime')` 또는 표준 `ISO-8601` 문자열로 일관되게 처리하며, 프론트엔드 포맷팅에는 전역 프로토타입 오염이 없는 순수 함수형 **`date-fns` (`ko` 로케일, `format`, `formatDistanceToNow`)**를 사용합니다.

---

## 2. 백엔드 API & SQLite 데이터베이스 (`api-server`) 실전 이슈

### #05. SQLite의 치명적 기본값: 외래키(`FOREIGN KEY`) 기본 OFF, 락 충돌 및 주석(`COMMENT`) 부재 이슈
* **왜 안 해본 사람은 모르나요?**
  1. `01-schema.sql`에 아무리 `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`를 완벽하게 적어놔도, **SQLite는 30년 전 하위 호환성(2009년 이전 레거시 앱 방어) 때문에 DB 커넥션을 열 때마다 외래키 검사 기능이 기본적으로 꺼져(`OFF`, 0) 있습니다!**
  2. SQLite의 기본 저널 모드(Rollback Journal)는 쓰기(`INSERT/UPDATE/DELETE`) 시 DB 파일 전체를 잠그기 때문에, 다중 마이크로 앱(`products`, `cart`, `host-*`)이 동시에 요청을 쏟아부으면 즉시 `database is locked` 에러가 터집니다.
  3. MySQL이나 PostgreSQL과 달리 **SQLite에는 테이블·컬럼 주석 전용 `COMMENT` 문법이 아예 없습니다.**
* **어떤 증상이 나타나나요?**
  - 존재하지 않는 유저(`user-999`)나 이미 삭제된 상품(`product-999`)을 장바구니에 넣어도 DB가 아무런 에러 없이 그대로 저장해 버려 쓰레기 유령 데이터(Orphan Record)가 쌓입니다.
  - 리모트 앱들이 비동기 API를 호출할 때 락 충돌이 발생해 화면 로딩이 멈추거나 타임아웃이 발생합니다.
  - DB 스키마 의도를 파악하려면 SQL 원문 파일을 직접 열어봐야만 해서, API나 프론트엔드 모니터링 툴에서 스키마 설명을 확인할 수 없습니다.
* **무결성을 위해 무조건 켜야 하는데, 실무에서 '일부러 끄는' 특수 상황이 있나요?**
  - 일반적인 비즈니스 웹 서비스에서는 데이터 무결성을 위해 **무조건 `ON`으로 켜두는 것이 절대적인 정석**입니다.
  - 다만 실무에서 일시적으로 끄는 예외적 상황 3가지가 있습니다:
    1. **대량 데이터 복원/마이그레이션 (`Bulk Insert`)**: 수백만 건의 데이터를 덤프 파일에서 밀어 넣을 때 행마다 부모 키를 검사하면 속도가 수십 배 느려지며, 부모 테이블보다 자식 테이블이 먼저 삽입될 때 에러가 나므로 일시적으로 끄고 복원 후 일괄 검사(`PRAGMA foreign_key_check;`)합니다.
    2. **테이블 스키마 마이그레이션 (`ALTER TABLE` 제약 우회)**: SQLite는 복잡한 컬럼 변경 시 `새 테이블 생성 -> 데이터 복사 -> 기존 테이블 삭제(DROP) -> 이름 변경` 방식을 쓰는데, 이때 외래키가 켜져 있으면 다른 테이블이 참조 중이라 기존 테이블 `DROP`이 차단되므로 마이그레이션 동안 잠시 끕니다.
    3. **초고속 단순 로그/IoT 장비**: 무결성 검사 비용(CPU 오버헤드)조차 아까운 극단적 쓰기 환경.
* **실무 해결 아키텍처 (2대 필수 엔진 프라그마 + 헬스체크 자가 점검 + `_schema_comments` 메타 테이블)**:
  1. **초기화 프라그마 2종 강제 (`src/db/client.ts` — Node.js 22 내장 `node:sqlite`)**:
     ```ts
     import { DatabaseSync } from 'node:sqlite';
     const db = new DatabaseSync(dbPath);

     // ★ 1. 외래키 마스터 스위치 강제 활성화! (스프링클러 노즐과 메인 수도 밸브 비유)
     // 테이블에 적어둔 개별 외래키들이 실제로 동작하도록 엔진 전원 스위치를 켭니다.
     db.exec('PRAGMA foreign_keys = ON;');

     // ★ 2. WAL(Write-Ahead Logging) 모드 활성화!
     // 읽기(Reader)와 쓰기(Writer)가 서로를 블로킹하지 않고 동시 실행되도록 전환합니다.
     db.exec('PRAGMA journal_mode = WAL;');
     ```
  2. **`GET /api/health` 런타임 자가 점검 보증 (`{ status: 'ok', dbMode: 'wal', foreignKeys: true }`)**:
     - `db.prepare('PRAGMA foreign_keys;').get()`과 `db.prepare('PRAGMA journal_mode;').get()`을 실행하여, 현재 DB 커넥션에서 외래키 보호와 동시성 WAL 모드가 확실히 활성화되어 있는지 스스로 점검하고 프론트엔드 모니터(`MfeInspector`)에 보증합니다.
     - `foreignKeys: true`는 "외래키가 하나라도 설정되었는가"가 아니라 **"개별 테이블에 걸어둔 모든 외래키가 실제로 작동하도록 엔진 마스터 스위치가 켜져 있는가"**를 뜻합니다.
  3. **`_schema_comments` 사전 메타 테이블 및 `SchemaCommentRecord` 구축**:
     - SQLite의 `COMMENT` 부재를 극복하기 위해 `01-schema.sql`에 코멘트 전용 사전 테이블(`_schema_comments`)을 두고 테이블 및 컬럼 설명을 정형 데이터로 영구 보관합니다.
     - 백엔드에 `GET /api/schema-comments` (`SchemaCommentRecord[]`) 엔드포인트를 열어 호스트의 `MfeInspector` 모니터나 개발자가 DB 스키마 사전을 JSON으로 즉시 확인할 수 있게 합니다.

### #06. 수량 증가·재고 확인 시 발생하는 동시성 경합(`TOCTOU`)과 트랜잭션 누락
* **왜 문제가 되나요? (`TOCTOU`: 확인 시점과 수정 시점 사이의 틈)**
  - 백엔드 API에서 ① 먼저 `SELECT quantity FROM cart_items`로 현재 수량(`1개`)을 읽고, ② JS 코드에서 `1 + 1 = 2`를 계산한 뒤, ③ `UPDATE cart_items SET quantity = 2`를 실행하는 2단계 분리 방식을 쓰면 동시성 버그가 터집니다.
  - 만약 두 요청이 동시에 들어오면 두 요청 모두 `1개`를 읽은 뒤 각각 `2개`로 덮어써 버려서, 실제로는 2번 추가했는데 수량이 `3개`가 아니라 `2개`가 되는 **수량 증발(Lost Update)** 현상이 발생합니다.
* **실무 해결 아키텍처 (복합 `UNIQUE` 고유키 + 원자적 `UPSERT` + 트랜잭션 래퍼)**:
  1. **복합 고유키 `UNIQUE(user_id, product_id)` 설정**:
     - 이름은 동명이인이 있거나 변경될 수 있으므로 **유저 고유 ID(`user_id`) + 상품 고유 ID(`product_id`)** 두 컬럼을 묶어 고유키(`UNIQUE`)로 지정합니다.
     - 이를 통해 *"같은 유저가 같은 상품을 장바구니에 여러 번 담아도 행(Row)이 여러 줄로 중복 생성되지 않고 무조건 딱 1줄만 유지"*하도록 DB 엔진이 강제합니다.
  2. **원자적 `UPSERT` (`INSERT` + `UPDATE`) 쿼리 및 `ON CONFLICT ~ DO UPDATE` 문법 해부**:
     - 조회(`SELECT`)와 수정(`UPDATE`)을 쪼개지 않고 아래 **단 1개의 쿼리**로 처리하여 다른 요청이 중간에 끼어들 틈을 원천 차단합니다.
       ```sql
       INSERT INTO cart_items (user_id, product_id, quantity, added_from_host)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, product_id)
       DO UPDATE SET
         quantity = cart_items.quantity + excluded.quantity,
         added_from_host = excluded.added_from_host;
       ```
     - **SQL 구문별 1:1 의미 해부 (`CONFLICT`, `DO`, `excluded`는 함수가 아니라 SQL 표준 조건/명령 키워드)**:

       | 쿼리 구문 조각 | 쉬운 한국어 해석 (`if ~ then` 비유) | 상세 동작 원리 |
       | :--- | :--- | :--- |
       | **`INSERT INTO ... VALUES (...)`** | *"일단 새 줄로 넣어봐!"* | 장바구니에 `(user_id, product_id)` 쌍이 **처음 들어오는 경우**라면 그대로 새 행(Row)이 추가되고 끝납니다. |
       | **`ON CONFLICT(user_id, product_id)`** | **`if (이미_그_쌍이_존재해서_충돌나면)`** | 테이블에 걸어둔 `UNIQUE(user_id, product_id)` 제약 때문에 이미 같은 쌍이 존재하면 원래는 중복 에러가 발생합니다. 이 절은 *"두 컬럼 쌍이 겹쳐 충돌(`CONFLICT`)이 나면 에러를 내지 말고 잡아라"*라는 조건절입니다. |
       | **`DO UPDATE SET ...`** | **`then { 대신 수정(UPDATE)을 실행해라! }`** | 앞의 충돌 조건이 성립했을 때(= **이미 쌍으로 존재할 때**) 수행할 동작(`DO`)을 지정합니다 (`DO NOTHING`은 무시, `DO UPDATE SET`은 기존 행 수정). |
       | **`cart_items.quantity + excluded.quantity`** | **`기존_수량 + 방금_넣으려던_새_수량`** | SQLite의 특수 예약어인 **`excluded`**는 *"방금 `INSERT` 하려다가 중복 충돌로 튕겨 나온(Excluded) 새 요청 데이터"*를 가리킵니다. 즉 원래 DB 수량(`cart_items.quantity`)에 새 요청 수량(`excluded.quantity`)을 DB 내부에서 즉시 더합니다. |

  3. **트랜잭션 래퍼 (`runInTransaction`: `BEGIN IMMEDIATE ~ COMMIT / ROLLBACK`)와 `DatabaseSync` 라이프사이클**:
     - `원자적 UPSERT`가 한 쿼리 안에서의 수량 누적을 보장한다면, **트랜잭션 래퍼**는 **"① `products` 테이블의 남은 재고(`stock`) 확인 → ② `cart_items`에 `UPSERT` 실행 → ③ 갱신 결과 조회"**처럼 여러 쿼리와 다른 수정·삭제(`DELETE`) 요청이 동시에 일어날 때 작업 순서를 직렬화(잠금 보장)해 줍니다.
     - **Q. `DatabaseSync` 객체 하나로 커넥션 관리와 쿼리 실행을 모두 하나요?**
       - 네! Node.js 22 내장 `node:sqlite`의 `DatabaseSync` 인스턴스(`db`) 하나가 **연결 열기 → 쿼리 실행 → 연결 닫기** 전체 생명주기를 담당합니다.

       | 라이프사이클 단계 | 사용 메서드 | 언제 사용하나요? |
       | :--- | :--- | :--- |
       | **1. 커넥션 열기 및 초기 설정** | `new DatabaseSync(경로)`<br>`db.exec('PRAGMA ...')` | DB 파일(또는 `:memory:`)을 열고 외래키(`foreign_keys = ON`)와 `WAL` 모드를 켤 때 |
       | **2. 단순/제어 SQL 일괄 실행** | `db.exec(sql)` | 파라미터(`?`)나 반환값이 없는 SQL 파일(`01-schema.sql`) 또는 트랜잭션 제어어(`BEGIN IMMEDIATE`, `COMMIT`, `ROLLBACK`)를 실행할 때 |
       | **3. 파라미터 바인딩 쿼리 실행** | `db.prepare(sql)` 후<br>- `.get(...)`<br>- `.all(...)`<br>- `.run(...)` | `?` 자리에 값을 안전하게 넣어 실행할 때:<br>- `.get()`: **단 1줄(객체)** 조회 (예: 로그인 유저 조회)<br>- `.all()`: **여러 줄(배열)** 조회 (예: 상품·장바구니 목록)<br>- `.run()`: **쓰기(`INSERT`/`UPDATE`/`DELETE`)** 실행 후 `{ changes, lastInsertRowid }` 반환 |
       | **4. 커넥션 닫기** | `db.close()` | 서버 종료 또는 테스트 종료 시 DB 파일 잠금을 해제할 때 |

     - **Q. `BEGIN IMMEDIATE`는 무엇인가요? 쿼리 실행 전 라이프사이클인가요?**
       - 네! 여러 쿼리를 한 묶음(트랜잭션)으로 실행하기 직전에 DB 엔진에 보내는 **'트랜잭션 시작 + 즉시 쓰기 자물쇠(Lock) 선점' 라이프사이클 명령어**입니다.
       - **트랜잭션 3단계 라이프사이클 흐름**:
         ```mermaid
         flowchart LR
             S1["1. 시작 (Pre-Query)<br/>db.exec('BEGIN IMMEDIATE')<br/>🔒 즉시 쓰기 잠금 선점"]
             S2["2. 본 쿼리 실행<br/>① 재고 조회 (SELECT)<br/>② 장바구니 UPSERT"]
             S3_OK["3-A. 성공 시 확정 (Post-Query)<br/>db.exec('COMMIT')<br/>✅ DB 반영 및 잠금 해제"]
             S3_ERR["3-B. 에러 시 취소 (On-Error)<br/>db.exec('ROLLBACK')<br/>↩️ 변경사항 원상복구 및 잠금 해제"]

             S1 --> S2
             S2 -->|정상 완료| S3_OK
             S2 -->|재고 부족 등 예외 throw| S3_ERR
         ```
       - **왜 일반 `BEGIN` 대신 `BEGIN IMMEDIATE`를 쓰나요?**:
         - 일반 `BEGIN`(`DEFERRED`)은 첫 쿼리가 조회(`SELECT`)일 때 잠금을 걸지 않고 있다가, 나중에 `INSERT/UPDATE`를 할 때서야 잠금을 걸려고 시도합니다. 그러면 동시에 들어온 두 요청이 모두 재고 조회를 통과해 버린 뒤 나중에 충돌(`SQLITE_BUSY`)이 납니다.
         - 반면 **`BEGIN IMMEDIATE`는 트랜잭션을 시작하는 그 즉시(재고 조회를 하기도 전에!) 쓰기 자물쇠를 선점**하므로, 다른 수정·삭제 요청이 아예 처음부터 대기하게 되어 동시성 순서가 100% 보장됩니다.

### #07. API마다 제각각인 에러 응답 규격과 미처리 예외로 인한 서버 프로세스 다운
* **왜 문제가 되나요?**
  - 어떤 API는 배열(`[{ id: 1 }]`)을 바로 주고, 어떤 API는 `{ message: '에러' }`나 문자열(`"Internal Server Error"`)을 주면 프론트엔드(`host-*`, `remote-*`)마다 응답 파싱과 에러 분기 코드를 제각각 작성해야 합니다.
  - 또한 라우트 내부에서 발생한 예외가 전역 미들웨어로 잡히지 않으면 `api-server(Port 4000)` 프로세스 자체가 종료되어 전체 테스트베드가 멈춥니다.
* **실무 해결 아키텍처 (표준 API 응답 엔벨로프 & 전역 에러 미들웨어)**:
  1. **표준 API 응답 엔벨로프 (`Envelope` = '편지 봉투' 공통 래퍼 구조)**:
     - 실제 알맹이 데이터(`data`)나 에러 정보(`error`)를 날것 그대로 보내지 않고, 성공이든 실패든 **항상 `{ success, data, error }`라는 동일한 바깥 껍데기(편지 봉투) 객체로 한 번 감싸서 응답**합니다.
     - **성공 시 (`success: true` + 알맹이는 `data` 안에)**:
       ```json
       {
         "success": true,
         "data": [{ "id": 1, "name": "기계식 무선 키보드 Pro", "price": 129000 }]
       }
       ```
     - **실패 시 (`success: false` + 원인은 `error` 안에)**:
       ```json
       {
         "success": false,
         "error": { "code": "OUT_OF_STOCK", "message": "재고가 부족합니다." }
       }
       ```
     - 이렇게 봉투 규격을 통일하면 모든 마이크로 앱이 `remote-shared/utils`의 공통 `httpClient`에서 `if (!res.success) throw res.error` 한 줄로 모든 API 응답과 에러를 일관되게 처리할 수 있습니다.
  2. **최하단 전역 에러 핸들러 미들웨어**:
     - Express 앱 최하단에 전역 에러 핸들러 미들웨어(`error-handler.ts`)를 두어, 어떤 예외가 발생해도 서버 프로세스가 죽지 않고 표준 에러 봉투(`{ success: false, error: { code, message } }`)와 HTTP 상태 코드(`400`, `404`, `500`)를 안전하게 반환하게 합니다.

### #08. 장바구니 목록 조회 시 발생하는 `N+1 쿼리` 문제와 인덱스 누락
* **왜 문제가 되나요?**
  - `SELECT * FROM cart_items WHERE user_id = ?`로 10건을 가져온 뒤, `for` 루프를 돌며 각 상품의 이름과 가격을 알기 위해 `SELECT * FROM products WHERE id = ?`를 10번 더 실행하면 총 11번(`1 + N`)의 쿼리가 발생합니다.
* **실무 해결 아키텍처 (`INNER JOIN` 단일 쿼리 + `Omit`/`Pick` 인터페이스 합성)**:
  1. **단일 `INNER JOIN` 쿼리 및 외래키 인덱스(`idx_cart_items_user_id`) 생성**:
     - `cart_items`와 `products`를 `INNER JOIN`한 단일 쿼리로 한 번에 조회하며, `01-schema.sql`에 조회 조건 컬럼(`idx_cart_items_user_id`) 인덱스를 명시적으로 생성합니다.
  2. **조인 결과 TypeScript 타입 정의 시 중복 작성 대신 `Omit` / `Pick` 합성 사용**:
     - 조인 결과 인터페이스(`CartItemJoinedRow`)에 두 테이블의 컬럼을 처음부터 다시 복붙해서 적으면, 나중에 `products` 테이블의 컬럼 타입이 바뀔 때 두 곳을 모두 수정해야 합니다.
     - 대신 각 테이블의 1:1 원본 인터페이스(`CartItemRow`, `ProductRow`)를 먼저 정의한 뒤, 이름이 겹치는 `id`와 미사용 컬럼을 `Omit`으로 제외하고 별칭(`AS product_name`) 컬럼만 연결하여 **타입과 `/** */` 인텔리센스 한글 주석을 100% 그대로 물려받아 재사용**합니다:
       ```ts
       export interface CartItemJoinedRow
         extends CartItemRow,
           Omit<ProductRow, 'id' | 'name' | 'stock' | 'description'> {
         /** JOIN 조회 시 p.name AS product_name 별칭으로 매핑된 상품명 */
         product_name: ProductRow['name'];
       }
       ```

---

## 3. 공통 모듈 & 유틸리티 (`remote-shared`) 실전 이슈

### #09. 단일 배럴 파일(`index.ts`) 남용으로 인한 트리 쉐이킹 실패와 순환 참조 지옥
* **왜 문제가 되나요?**
  - 편의상 모든 컴포넌트, 테마, 유틸리티를 최상단 `src/index.ts` 하나에 `export *`로 몰아넣으면(Barrel File anti-pattern), 내부 파일끼리도 이 `index.ts`를 다시 `import`하면서 **순환 참조(Circular Dependency)**가 발생해 런타임에 컴포넌트가 `undefined`로 평가되는 치명적인 버그가 터집니다.
* **실무 해결 아키텍처**:
  - `remote-shared`의 노출 경로를 역할별로 엄격히 분리(`./ui`, `./theme`, `./utils`)하고, 내부 의존성은 무조건 **`utils`(최하단) -> `theme`(중간) -> `ui`(최상단)** 단방향으로만 흐르도록 강제합니다.

### #10. 네트워크·이벤트·스토리지 데이터를 `as Type`으로만 믿었다가 런타임에 터지는 현상
* **왜 문제가 되나요?**
  - TypeScript의 `as CartItem[]`이나 `interface`는 빌드 후 런타임 JS 코드에서는 완전히 사라집니다.
  - 다른 마이크로 앱이 `CustomEvent`로 잘못된 형태의 페이로드를 보냈거나, `localStorage`에 예전 스키마의 데이터가 남아 있을 때 검증 없이 프로퍼티에 접근하면 즉시 화면이 하얗게 죽습니다.
* **실무 해결 아키텍처 (경계 데이터 `Zod` 런타임 스키마 검증 & `React Hook Form` 연동)**:
  - 외부와 맞닿는 3대 경계(① 백엔드 API 요청/응답, ② `mfeEventBus` 이벤트 페이로드, ③ `localStorage` 읽기)에는 **`zod` (`safeParse`)** 런타임 스키마 검증을 적용하여 데이터가 오염되었더라도 안전하게 폴백 처리하며, 사용자 입력 폼에는 **`react-hook-form` + `@hookform/resolvers/zod`(`zodResolver`)**를 결합해 클라이언트-서버 스키마를 일원화합니다.

### #11. 공통 컴포넌트의 과도한 추상화(`Props` 폭발)로 인한 유지보수 불가
* **왜 문제가 되나요?**
  - 공통 `<Button>` 컴포넌트에 `isAddToCartButton`, `showPriceBadge` 같은 특정 도메인 요구사항을 `Props`로 계속 추가하면, 나중에는 `Props`가 30개가 넘어가는 괴물 컴포넌트가 됩니다.
* **실무 해결 아키텍처**:
  - `remote-shared/ui`의 컴포넌트는 **상품이나 장바구니 같은 비즈니스 도메인 용어를 단 하나도 몰라야 합니다(도메인 지식 0%).**
  - 오직 시각적 변형(`variant: 'primary' | 'secondary' | 'danger'`, `size: 'sm' | 'md' | 'lg'`)과 `children` 합성, 그리고 표준 HTML 속성(`ComponentPropsWithoutRef<'button'>`)만 깔끔하게 지원합니다.

### #12. `Error` 인스턴스가 아닌 예외(`throw "문자열"` 등) 발생 시 에러 핸들러 크래시
* **왜 문제가 되나요?**
  - JavaScript에서는 `throw new Error()`뿐만 아니라 `throw "에러 문자열"`, `throw null`, `throw { code: 500 }` 등 무엇이든 던질 수 있습니다. 그래서 `catch (e)` 블록에서 무조건 `e.message`를 읽으면 에러를 처리하려던 코드가 또 에러를 내며 죽습니다.
* **실무 해결 아키텍처 (`normalizeError` 공통 유틸리티)**:
  - `unknown` 타입의 예외를 받아 항상 안전한 `{ message: string, code?: string, originalError: unknown }` 객체로 변환해 주는 `normalizeError(err: unknown)` 함수를 `remote-shared/utils`에서 제공합니다.

---

## 4. 디자인 시스템 & 헤드리스 UI (`Ark UI` · CSS 테마) 실전 이슈

### #13. 스켈레톤(`Skeleton`)과 실제 컴포넌트 크기 불일치로 화면이 덜컥거리는 현상 (`CLS`)
* **왜 문제가 되나요?**
  - 호스트에서 **[🐢 1.5초 로딩 지연 시뮬레이션]**을 켰을 때, 로딩 중 보여주는 스켈레톤 박스의 높이는 `100px`인데 실제 로드된 상품 목록의 높이가 `450px`이면, 로딩이 끝나는 순간 아래쪽 화면이 `350px`만큼 쿵 하고 밑으로 밀려 내려갑니다(Cumulative Layout Shift).
* **실무 해결 아키텍처**:
  - 스켈레톤 UI를 만들 때는 단순 막대기 하나만 그리지 않고, 실제 렌더링될 카드 그리드 및 컨테이너의 `min-height`, `padding`, `gap` 규격과 1:1로 일치하는 레이아웃 스켈레톤으로 설계합니다.

### #14. 다크 모드 및 실시간 테마(`Indigo`/`Emerald`/`Rose`/`Dark`) 전환 시 하드코딩 색상 붕괴
* **왜 문제가 되나요?**
  - 테마 스위처로 `Dark` 모드를 켰는데, 누군가 카드 배경에 `background: #ffffff`나 글자색에 `color: #111111`을 하드코딩해 두었으면 다크 모드에서 눈부신 흰색 박스가 남거나 검은 배경에 검은 글씨가 되어 읽을 수 없게 됩니다.
* **실무 해결 아키텍처 (시맨틱 CSS 변수 토큰 강제)**:
  - 개별 마이크로 앱의 CSS에서는 `#hex`나 `rgb()` 색상값 직접 사용을 금지하고, 오직 `remote-shared/theme`가 주입하는 시맨틱 CSS 변수(`var(--mfe-bg-surface)`, `var(--mfe-text-primary)`, `var(--mfe-brand-primary)`, `var(--mfe-border-subtle)`)만 사용합니다.

### #15. 헤드리스 UI(`Ark UI`) 적용 시 키보드 포커스(`:focus-visible`) 증발 및 로딩 중 중복 실행
* **왜 문제가 되나요?**
  - 기본 브라우저 테두리가 안 예쁘다는 이유로 `outline: none`만 넣고 대체 포커스 스타일을 안 넣으면 키보드 사용자(`Tab` 이동)가 현재 어느 버튼에 있는지 전혀 알 수 없습니다.
* **실무 해결 아키텍처**:
  - 마우스 클릭 시에는 포커스 링이 안 보이고 키보드 `Tab` 이동 시에만 선명한 테마 색상 링이 표시되는 `:focus-visible` 스타일을 기본 적용하며, `Ark UI`의 `data-disabled`, `data-highlighted` 속성 및 `aria-busy` 접근성 표준을 CSS와 1:1로 매핑합니다.

### #16. 긴 상품명·큰 금액 숫자로 인해 플렉스박스가 옆으로 터지고 숫자가 흔들리는 현상
* **왜 문제가 되나요?**
  1. CSS Flexbox의 자식 요소는 기본값이 `min-width: auto`(내 콘텐츠 길이만큼 줄어들지 않음)입니다. 그래서 플렉스 아이템 안의 상품명에 `text-overflow: ellipsis`(말줄임표)를 줘도 줄어들지 않고 카드 밖으로 뚫고 나갑니다.
  2. 장바구니 수량을 `+`/`-`로 바꿀 때 숫자 `1`과 `8`의 가로 픽셀 너비가 다르면 금액 옆의 삭제 버튼까지 좌우로 미세하게 덜컥거리며 흔들립니다.
* **실무 해결 아키텍처**:
  1. 플렉스/그리드 내부의 텍스트 래퍼에는 반드시 **`min-width: 0; overflow: hidden; text-overflow: ellipsis;`** 세트를 적용합니다.
  2. 모든 가격·수량·타이머 숫자 영역에는 **`font-variant-numeric: tabular-nums;`**(모든 숫자의 가로 폭을 동일하게 고정하는 CSS 속성)를 기본 적용하여 숫자가 바뀔 때 레이아웃 흔들림을 완벽히 제거합니다.
