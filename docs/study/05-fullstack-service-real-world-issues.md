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
| **2. 백엔드·DB**<br>(Express / SQLite) | **#05.** SQLite 외래키(`FOREIGN KEY`) 기본 비활성화로 인한 유령 데이터 누적 | 잘못된 유저/상품 ID 저장 | DB 연결 시 `PRAGMA foreign_keys = ON` + `journal_mode = WAL` |
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

### #05. SQLite의 치명적 기본값: 외래키(`FOREIGN KEY`) 제약이 꺼져(`OFF`) 있어 유령 데이터가 쌓이는 현상
* **왜 안 해본 사람은 모르나요?**
  - `01-schema.sql`에 아무리 `FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE`를 완벽하게 적어놔도, **SQLite는 하위 호환성 때문에 DB 커넥션을 열 때마다 외래키 기능이 기본적으로 꺼져(`OFF`) 있습니다!**
* **어떤 증상이 나타나나요?**
  - 존재하지 않는 유저(`user-999`)나 이미 삭제된 상품(`product-999`)을 장바구니에 넣어도 DB가 아무런 에러 없이 그대로 저장해 버려 유령 데이터(Orphan Record)가 쌓입니다.
* **실무 해결 아키텍처 (`src/db/client.ts` 초기화 필수 프라그마 — Node.js 22 내장 `node:sqlite`)**:
  - `apps/api-server/src/db/client.ts`에서 Node.js 22 공식 내장 모듈 `node:sqlite` (`DatabaseSync`)로 DB 파일을 열자마자 아래 2줄을 무조건 실행합니다:
  ```ts
  import { DatabaseSync } from 'node:sqlite';
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;'); // ★ 외래키 제약 조건 및 CASCADE 강제 활성화!
  db.exec('PRAGMA journal_mode = WAL;'); // ★ 다중 마이크로 앱 동시 읽기·쓰기 성능 및 락 방지!
  ```

### #06. 수량 증가·재고 확인 시 발생하는 동시성 경합(`TOCTOU`)과 트랜잭션 누락
* **왜 문제가 되나요?**
  - 백엔드 API에서 ① 먼저 `SELECT quantity FROM cart_items`로 현재 수량(`1`)을 읽고, ② JS 코드에서 `1 + 1 = 2`를 계산한 뒤, ③ `UPDATE cart_items SET quantity = 2`를 실행하는 방식(Time-Of-Check to Time-Of-Use)을 쓰면, 동시에 요청이 들어왔을 때 수량이 누락됩니다.
* **실무 해결 아키텍처 (원자적 `UPSERT` 및 `db.transaction`)**:
  - `user_id`와 `product_id`에 `UNIQUE` 인덱스를 걸고, 단일 원자적 쿼리(`INSERT ... ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = cart_items.quantity + excluded.quantity`)와 `db.transaction()`을 사용하여 동시 요청에도 100% 정확한 수량과 재고를 보장합니다.

### #07. API마다 제각각인 에러 응답 규격과 미처리 예외로 인한 서버 프로세스 다운
* **왜 문제가 되나요?**
  - 어떤 API는 `{ message: '에러' }`를 주고 어떤 API는 문자열을 주면 프론트엔드 에러 처리 코드가 지저분해집니다. 또한 라우트 내부에서 발생한 예외가 전역 미들웨어로 잡히지 않으면 `api-server(Port 4000)` 프로세스 자체가 종료되어 전체 테스트베드가 멈춥니다.
* **실무 해결 아키텍처 (표준 응답 엔벨로프 & 전역 에러 미들웨어)**:
  - 모든 API 응답을 `{ success: boolean, data?: T, error?: { code: string, message: string, details?: unknown } }` 규격으로 통일하고, 최하단에 전역 에러 핸들러 미들웨어를 두어 어떤 예외가 발생해도 서버가 절대 죽지 않고 규격화된 JSON과 HTTP 상태 코드(`400`, `404`, `500`)를 반환하게 합니다.

### #08. 장바구니 목록 조회 시 발생하는 `N+1 쿼리` 문제와 인덱스 누락
* **왜 문제가 되나요?**
  - `SELECT * FROM cart_items WHERE user_id = ?`로 10건을 가져온 뒤, `for` 루프를 돌며 각 상품의 이름과 가격을 알기 위해 `SELECT * FROM products WHERE id = ?`를 10번 더 실행하면 총 11번(`1 + N`)의 쿼리가 발생합니다.
* **실무 해결 아키텍처**:
  - `cart_items`와 `products`를 `INNER JOIN`한 단일 쿼리로 한 번에 조회하며, `01-schema.sql`에 조회 조건 컬럼(`idx_cart_items_user_id`) 인덱스를 명시적으로 생성합니다.

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
