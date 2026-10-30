# 📐 [기획 및 설계 정본(SSOT)] Phase 1 서비스 간 공통 연동 계약 (`01-plan-and-design.md`)

> **✍️ 문서 목적 및 SSOT 항목 참조 원칙 (필수 준수)**
> 1. **Phase 1 전체 서비스의 단일 진실 공급원(SSOT)**: 이 문서는 `api(4000)`, `shared(3004)`, `products(3002)`, `cart(3003)`, `host-vite(3000)`, `host-rspack(3001)` 6개 서비스가 서로 통신하고 결합하기 위한 **표준 인터페이스·이벤트·API·Props 계약 정본**입니다.
> 2. **개별 앱 설계 시 본문 복붙 금지 & 항목(제목) 참조**: 이후 `Step 1.1 ~ 1.5` 각 마이크로 앱에서 자체 `01-plan-and-design.md`를 작성할 때는 이 문서의 코드를 복사·재작성하지 않고, **`§ 5.1.2 데이터베이스 4대 테이블 및 도메인 엔티티 계약`처럼 항목(섹션 제목)만 가리키는 참조 형태**로 작성합니다.
> 3. **인터페이스 재협의 프로토콜**: 특정 앱 개발 도중 본 계약의 수정이 필요할 경우, 작업 중이던 앱 브랜치를 즉시 홀드(`stash`/대기)하고 `root` 브랜치에서 이 정본 문서를 먼저 업데이트·머지한 뒤 앱 브랜치로 다시 받아 진행합니다.

---

## 1. 작업 메타데이터 — `[공통 필수]`
| 항목 | 내용 |
| :--- | :--- |
| **작업 폴더명** | `20261027-phase1-service-contracts` |
| **서비스 스코프 (`Scope ID`)** | `root` (`isDocsOnly: true` — 설계 정본 전용 브랜치) |
| **작업 브랜치** | `root/docs/phase1-service-contracts` (패턴 A) |
| **기술 스택 / 번들러** | `TypeScript 5.7+` + `Zod` + `Module Federation 2.0` + `TanStack Query v5` + `Ark UI` + `node:sqlite` |
| **작성일** | `2026-10-27` |
| **작업 규모 평가** | `적정 (단일 설계 PR)` — Phase 1 전체 마이크로 앱 간 사전 연동 계약 확정 |

---

## 2. 기획 의도 및 핵심 학습 포인트 — `[공통 필수]`
### 2.1 기획 배경 및 목적
- 물리적 멀티레포와 동일하게 각 마이크로 앱을 스코프 잠금(`verify-scope.mjs`) 상태에서 순차적으로(`api → shared → products → cart → host-*`) 개발할 때, 서비스 간 데이터 필드명이나 이벤트 페이로드, `Props` 시그니처가 어긋나 재작업이 발생하는 것을 원천 차단합니다.
- 모든 외부 경계(REST API 응답, `CustomEvent` 페이로드, `localStorage` 데이터)에 적용할 `TypeScript` 인터페이스(6대 주석 원칙 적용)와 `Zod` 스키마 규격을 확정합니다.

### 2.2 MFE / 아키텍처 핵심 학습 포인트
- **계약 주도 개발(`Contract-First Development`)**: 코드가 물리적으로 격리된 멀티레포 MFE 환경에서 `remotes.d.ts` 및 API/이벤트 스키마 계약을 먼저 고정하여 각 팀(또는 각 단계)이 독립적으로 병렬/순차 개발을 수행하는 실무 프로세스를 체득합니다.
- **상태 동기화 `Mode A (CustomEvent)` vs `Mode B (sharedQueryClient)` 비교 설계**: 어느 한 방식에 종속되지 않고 호스트의 `MfeInspector`에서 실시간으로 동기화 모드를 전환하며 두 아키텍처의 장단점을 관찰할 수 있는 인터페이스 계약을 수립합니다.

### 2.3 루트 공통 설계 정본(SSOT) 참조 — `[타 서비스 연계 작업 시 필수]`
- **참조 정본 문서**: 본 문서 자체가 Phase 1 전체 서비스의 최상위 루트 정본(`SSOT`)입니다.

---

## 3. 최신 기술 스펙 확인 요약 (`Context7` MCP) — `[공통 필수]`
- **조회 대상 라이브러리**: `@tanstack/react-query (v5)`, `@ark-ui/react (v4)`, `zod (v3)`, `node:sqlite (Node.js v22)`
- **핵심 스펙 및 주의사항**:
  - `TanStack Query v5`에서는 `useQuery` / `useSuspenseQuery`의 두 번째 인자로 커스텀 `QueryClient` 인스턴스를 직접 전달할 수 있으므로, `Mode A`(앱별 독립 `localQueryClient`)와 `Mode B`(`remote_shared/utils`의 싱글톤 `sharedQueryClient`)를 `syncMode` Props 하나로 즉시 전환할 수 있습니다.
  - `@ark-ui/react`의 `Splitter`, `Tabs`, `Collapsible`, `Select`는 `remote-shared/ui`에서 테마 CSS 변수와 결합하여 단일 창구로 캡슐화해 노출합니다.

---

## 4. 생성 및 수정 대상 파일 목록 — `[공통 필수]`
| 구분 (`NEW` / `MOD`) | 파일 경로 (루트 기준) | 역할 및 변경 요약 |
| :---: | :--- | :--- |
| `NEW` | `docs/features/20261027-phase1-service-contracts/01-plan-and-design.md` | Phase 1 서비스 간 5대 공통 연동 계약 정본(SSOT) 문서 생성 |
| `MOD` | `todo.md` | `Step 1.0` 완료 상태 갱신 및 `Step 1.1` 진행 준비 |

---

## 5. 상세 인터페이스 및 데이터 설계 (`TypeScript` & `Zod` 스키마 정본) — `[공통 필수]`

---

### § 5.1 백엔드 DB 테이블 스키마 및 REST API 입출력 계약 (`Scope: api` & 프론트엔드 패칭 공통)

#### § 5.1.1 표준 API 응답 엔벨로프 계약 (`ApiResponse<T>` & `ApiErrorPayload`)
모든 백엔드(`Port 4000`) REST API는 성공·실패 여부와 관계없이 항상 아래 표준 엔벨로프 규격으로 JSON을 반환합니다 ([Study 05 #07](../../study/05-fullstack-service-real-world-issues.md) 준수).

```ts
/**
 * @description 백엔드 REST API 에러 발생 시 반환되는 표준 에러 상세 객체 인터페이스
 */
export interface ApiErrorPayload {
  /** 머신 판독용 표준 에러 코드 (예: 'VALIDATION_ERROR', 'NOT_FOUND', 'OUT_OF_STOCK', 'INTERNAL_ERROR') */
  code: string;

  /** 사용자 또는 개발자에게 표시할 한글 에러 설명 메시지 */
  message: string;

  /** Zod 스키마 검증 실패 등 추가 디버깅 상세 정보 (선택적) */
  details?: unknown;
}

/**
 * @description 모든 백엔드 REST API 엔드포인트가 공통으로 반환하는 표준 응답 엔벨로프 인터페이스
 */
export interface ApiResponse<T> {
  /** 요청 처리 성공 여부 (HTTP 2xx일 때 true, 4xx/5xx일 때 false) */
  success: boolean;

  /** 요청 성공 시 반환되는 실제 도메인 데이터 페이로드 (성공 시 필수) */
  data?: T;

  /** 요청 실패 시 반환되는 표준 에러 객체 (실패 시 필수) */
  error?: ApiErrorPayload;
}
```

#### § 5.1.2 데이터베이스 4대 테이블(`_schema_comments`, `users`, `products`, `cart_items`) 및 도메인 엔티티 계약
`apps/api-server/sql/01-schema.sql`에 정의될 4개 테이블과 프론트엔드·백엔드가 공유하는 도메인 모델입니다.

```ts
/**
 * @description 요청이 발생한 호스트(또는 단독 실행) 애플리케이션의 출처 구분 타입
 */
export type HostOriginType = 'vite' | 'rspack' | 'standalone';

/**
 * @description [Table: _schema_comments] 데이터베이스 테이블 및 컬럼 한글 주석 메타데이터 인터페이스
 */
export interface SchemaCommentRecord {
  /** 대상 테이블 이름 (예: 'products', 'cart_items') */
  tableName: string;

  /** 대상 컬럼 이름 (테이블 자체에 대한 설명일 경우 null) */
  columnName: string | null;

  /** 테이블 또는 컬럼의 역할에 대한 한글 상세 설명 */
  comment: string;
}

/**
 * @description [Table: users] 인증 컨텍스트 공유 테스트용 사용자 엔티티 인터페이스
 */
export interface UserEntity {
  /** 사용자 고유 식별자 (PK, 예: 'user-1', 'user-2') */
  id: string;

  /** 화면에 표시할 사용자 이름 (예: '홍길동 (VIP)', '이순신 (일반)') */
  username: string;

  /** 사용자 권한 등급 ('admin' | 'member') */
  role: 'admin' | 'member';

  /** 테스트용 인증 베어러 토큰 문자열 */
  token: string;
}

/**
 * @description [Table: products] 상품 카탈로그 마이크로 앱(remote-products)에서 조회하는 상품 엔티티 인터페이스
 */
export interface ProductEntity {
  /** 상품 고유 번호 (PK, AUTOINCREMENT 정수) */
  id: number;

  /** 상품명 (예: '기계식 무선 키보드 Pro') */
  name: string;

  /** 상품 단가 (원화 정수 단위, 부동소수점 오차 방지를 위해 반드시 정수로만 저장·연산) */
  price: number;

  /** 상품 카테고리 구분 ('electronics' | 'office' | 'accessories') */
  category: 'electronics' | 'office' | 'accessories';

  /** 현재 남아있는 재고 수량 (0 이상의 정수) */
  stock: number;

  /** 상품 설명 요약 문구 */
  description: string;
}

/**
 * @description [Table: cart_items + products JOIN] 장바구니 마이크로 앱(remote-cart)에서 조회하는 장바구니 항목 인터페이스
 */
export interface CartItemView {
  /** 장바구니 항목 고유 번호 (PK, AUTOINCREMENT 정수) */
  id: number;

  /** 장바구니 소유 사용자 ID (users.id 외래키) */
  userId: string;

  /** 담긴 상품 고유 번호 (products.id 외래키) */
  productId: number;

  /** JOIN으로 함께 조회된 상품명 (N+1 쿼리 방지용 단일 JOIN 결과) */
  productName: string;

  /** JOIN으로 함께 조회된 상품 단가 (원화 정수) */
  price: number;

  /** JOIN으로 함께 조회된 상품 카테고리 */
  category: 'electronics' | 'office' | 'accessories';

  /** 담긴 상품 수량 (1 이상의 정수) */
  quantity: number;

  /** 이 상품을 장바구니에 담은 호스트 출처 ('vite' | 'rspack' | 'standalone') */
  addedFromHost: HostOriginType;

  /** 장바구니 최초 등록 또는 수량 갱신 일시 (ISO-8601 또는 KST 문자열) */
  createdAt: string;
}
```

#### § 5.1.3 REST API 7대 엔드포인트 요청·응답 상세 명세 (`Port 4000`)

| 번호 | HTTP 메서드 및 경로 | 요청 파라미터 / Body (`Zod` 검증) | 성공 응답 `data` 타입 (`ApiResponse<T>`) | 핵심 비즈니스 규칙 |
| :---: | :--- | :--- | :--- | :--- |
| **1** | `GET /api/health` | 없음 | `{ status: 'ok', dbMode: 'wal', foreignKeys: true }` | 서버 상태 및 SQLite `PRAGMA` 활성화 확인 |
| **2** | `GET /api/schema-comments` | 없음 | `SchemaCommentRecord[]` | `_schema_comments` 전체 한글 설명 목록 반환 |
| **3** | `GET /api/users` | 없음 | `UserEntity[]` | 시드 등록된 테스트 사용자 목록 반환 |
| **4** | `POST /api/auth/login` | Body: `{ userId: string }` | `UserEntity` | 선택한 `userId`로 로그인 및 토큰 반환 (`404` 검증) |
| **5** | `GET /api/products` | Query: `?category=...&search=...` (선택) | `ProductEntity[]` | 카테고리·검색어 필터링 상품 목록 반환 |
| **6** | `GET /api/cart` | Query: `?userId=user-1` (필수) | `CartItemView[]` | `cart_items`와 `products`를 `INNER JOIN`하여 단일 쿼리로 반환 |
| **7** | `POST /api/cart` | Body: `{ userId: string, productId: number, quantity: number, addedFromHost: HostOriginType }` | `CartItemView` | **원자적 `UPSERT`** (`ON CONFLICT(user_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity`) 수행 |
| **8** | `DELETE /api/cart/:id` | Param: `:id` (장바구니 항목 ID 또는 `'all'`), Query: `?userId=user-1` | `{ deletedId: number \| 'all', deletedCount: number }` | 특정 장바구니 항목 삭제 또는 해당 유저의 장바구니 전체 비우기 |

---

### § 5.2 마이크로 앱 간 이벤트 버스(`mfeEventBus`) 및 `Zod` 페이로드 계약 (`Scope: shared`, `products`, `cart`, `host-*` 공통)

#### § 5.2.1 표준 커스텀 이벤트 이름 상수 (`MFE_EVENTS`)
모든 이벤트 이름은 `mfe:` 프리픽스로 시작하며 `remote_shared/utils`에서 상수로 노출합니다.

```ts
/**
 * @description 마이크로 프론트엔드 앱 간 통신에 사용되는 표준 CustomEvent 이름 상수 맵
 */
export const MFE_EVENTS = {
  /** 상품 앱에서 장바구니에 상품을 추가했음을 알리는 이벤트 (Mode A 동기화 트리거 및 모니터 로깅용) */
  CART_UPDATED: 'mfe:cart-updated',

  /** 호스트에서 로그인 사용자를 전환했음을 알리는 이벤트 */
  AUTH_CHANGED: 'mfe:auth-changed',

  /** 실시간 디자인 테마가 변경되었음을 알리는 이벤트 */
  THEME_CHANGED: 'mfe:theme-changed',

  /** 호스트 MfeInspector에서 상태 동기화 학습 모드(Mode A <-> Mode B)를 전환했음을 알리는 이벤트 */
  SYNC_MODE_CHANGED: 'mfe:sync-mode-changed',

  /** 장바구니 앱의 CSS 스타일 충돌/격리 실험 토글 상태가 변경되었음을 알리는 이벤트 */
  CSS_ISOLATION_CHANGED: 'mfe:css-isolation-changed',
} as const;
```

#### § 5.2.2 이벤트별 페이로드 인터페이스 및 `Zod` 검증 스키마
`mfeEventBus`는 이벤트를 발송(`emit`)하거나 수신(`useMfeEvent`)할 때 아래 `Zod` 스키마(`safeParse`)로 런타임 오염 여부를 검증합니다 ([Study 05 #10](../../study/05-fullstack-service-real-world-issues.md) 준수).

```ts
/**
 * @description [mfe:cart-updated] 장바구니 변경 이벤트 페이로드 인터페이스
 */
export interface CartUpdatedEventPayload {
  /** 변경을 발생시킨 액션 종류 ('add' | 'remove' | 'clear') */
  action: 'add' | 'remove' | 'clear';

  /** 대상 사용자 ID */
  userId: string;

  /** 추가 또는 삭제된 상품 ID (전체 비우기 시 선택적) */
  productId?: number;

  /** 추가된 상품명 (실시간 모니터 로그 표시용) */
  productName?: string;

  /** 변경 수량 */
  quantity?: number;

  /** 이벤트를 발행한 호스트 출처 ('vite' | 'rspack' | 'standalone') */
  sourceHost: HostOriginType;

  /** 이벤트 발생 시각 (ISO-8601 문자열) */
  timestamp: string;
}

/**
 * @description [mfe:auth-changed] 사용자 전환 이벤트 페이로드 인터페이스
 */
export interface AuthChangedEventPayload {
  /** 새로 선택된 사용자 ID */
  userId: string;

  /** 사용자 표시 이름 */
  username: string;

  /** 발급된 인증 토큰 */
  token: string;

  /** 이벤트 발생 시각 */
  timestamp: string;
}

/**
 * @description [mfe:theme-changed] 실시간 색상 테마 변경 이벤트 페이로드 인터페이스
 */
export interface ThemeChangedEventPayload {
  /** 변경된 테마 모드 ('indigo' | 'emerald' | 'rose' | 'dark') */
  theme: 'indigo' | 'emerald' | 'rose' | 'dark';

  /** 이벤트 발생 시각 */
  timestamp: string;
}

/**
 * @description [mfe:sync-mode-changed] 상태 동기화 비교 학습 모드 전환 이벤트 페이로드 인터페이스
 */
export interface SyncModeChangedEventPayload {
  /**
   * 선택된 동기화 모드
   * - 'mode-a-event': 리모트별 독립 QueryClient + CustomEvent 신호 기반 재조회
   * - 'mode-b-query': remote-shared 싱글톤 sharedQueryClient + invalidateQueries 직접 무효화
   */
  syncMode: 'mode-a-event' | 'mode-b-query';

  /** 이벤트 발생 시각 */
  timestamp: string;
}
```

---

### § 5.3 원격 공통 모듈(`remote-shared`, Port `3004`) 노출(`exposes`) 시그니처 계약

`remote-shared`는 아래 3개의 서브패스(`exposes`)만 외부에 노출하며, 내부 의존성은 무조건 **`./utils` -> `./theme` -> `./ui`** 단방향으로만 흐릅니다 ([Study 05 #09](../../study/05-fullstack-service-real-world-issues.md) 준수).

#### § 5.3.1 `remote_shared/ui` 노출 컴포넌트 및 레이아웃 인터페이스
호스트와 도메인 리모트 앱들은 `@ark-ui/react`나 `clsx`를 직접 설치·import하지 않고 오직 `remote_shared/ui`에서 아래 컴포넌트들과 `clsx` 유틸을 가져다 씁니다.

1. **기본 UI 컴포넌트 (`@ark-ui/react` + `clsx` 캡슐화)**:
   - `Button`: `variant?: 'primary' | 'secondary' | 'danger' | 'ghost'`, `size?: 'sm' | 'md' | 'lg'`, `isLoading?: boolean` (`disabled` 및 `aria-busy` 자동 연동)
   - `Heading`: `level?: 1 | 2 | 3 | 4 | 5` (`H1 ~ H5` 시맨틱 렌더링)
   - `Select`: `options: Array<{ label: string, value: string }>`, `value: string`, `onChange: (value: string) => void`, `placeholder?: string`, `ariaLabel: string` (`Ark UI Select` 조립 캡슐화 + `--z-dropdown` 적용)
   - `Skeleton`: `width?: string | number`, `height?: string | number`, `variant?: 'card' | 'text' | 'rect'`, `count?: number` (`CLS` 방지를 위한 실제 카드 `min-height` 매칭 지원)
   - `Badge`: `tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral'` (포트 출처 및 동기화 모드 표시 배지)
2. **레이아웃 컴포넌트 (`@ark-ui/react` 인터랙티브 레이아웃 & `ark` 팩토리 프리미티브)**:
   - 인터랙티브 레이아웃: `Splitter` (패널 리사이즈 및 접기), `Tabs` (뷰/모니터 탭 전환), `Collapsible` (패널 접기/펴기)
   - 정적 그리드/플렉스 레이아웃: `Container`, `Grid` (`columns`, `gap`), `Flex` (`direction`, `align`, `justify`, `gap`), `Stack`, `Card`
3. **조건부 클래스 결합 유틸리티 재노출 (`Re-export`)**:
   - `clsx`: `export { clsx } from 'clsx'`로 함께 노출하여, 호스트(`host-vite`, `host-rspack`) 및 리모트(`products`, `cart`) 앱이 `import { Container, Flex, clsx } from 'remote_shared/ui'` 형태로 단일 창구에서 사용할 수 있게 합니다. (단, 호스트의 `RemoteErrorBoundary` 등 원격 서버 장애 시 떠야 하는 폴백 UI는 `remote_shared/ui`에 의존하지 않고 자체 인라인/내장 스타일로만 작성합니다.)

#### § 5.3.2 `remote_shared/theme` 실시간 테마(`ThemeMode`) 및 CSS 변수·`z-index` 토큰 계약
- **지원 테마 모드 (`ThemeMode`)**: `'indigo' | 'emerald' | 'rose' | 'dark'`
- **노출 항목**: `ThemeProvider`, `useTheme()`, `Z_INDEX_TOKENS` (`header: 100`, `dropdown: 200`, `drawer: 300`, `modal: 400`, `toast: 500`)
- **필수 시맨틱 CSS 변수 토큰**:
  - `--mfe-bg-app`, `--mfe-bg-surface`, `--mfe-bg-elevated`
  - `--mfe-text-primary`, `--mfe-text-secondary`, `--mfe-text-muted`
  - `--mfe-brand-primary`, `--mfe-brand-hover`, `--mfe-danger`
  - `--mfe-border-subtle`, `--mfe-radius-md`, `--mfe-space-sm`, `--mfe-space-md`, `--mfe-space-lg`

#### § 5.3.3 `remote_shared/utils` 공통 유틸리티 및 `sharedQueryClient` 시그니처 계약
- **`mfeEventBus`**: `{ emit, subscribe }` (`Zod` 런타임 스키마 검증 내장)
- **`useMfeEvent(eventName, handler)`**: 컴포넌트 언마운트 시 `removeEventListener`를 100% 자동 보장하는 커스텀 훅 ([Study 04 #09](../../study/04-mfe-real-world-pitfalls-and-solutions.md))
- **`createScopedStorage(scopeId)`**: `mfe:<scopeId>:<key>` 네임스페이스 프리픽스 및 `Zod` 파싱을 강제하는 `localStorage` 안전 래퍼 ([Study 04 #10](../../study/04-mfe-real-world-pitfalls-and-solutions.md))
- **`formatCurrency(amount: number)`**: 원화 정수 반올림(`Math.round`) 및 `Intl.NumberFormat('ko-KR')` 기반 `"129,000원"` 포맷터 ([Study 05 #04](../../study/05-fullstack-service-real-world-issues.md))
- **`formatDate(dateStr: string)` / `formatRelativeTime(dateStr: string)`**: `date-fns` (`ko` 로케일) 기반 날짜 및 상대 시간(`"방금 전"`, `"3분 전"`) 포맷터
- **`httpClient`**: `ky` 기반 공통 HTTP 클라이언트 (`prefixUrl: 'http://localhost:4000/api'`, `AbortSignal` 연동, 표준 `ApiResponse<T>` 파싱)
- **`normalizeError(err: unknown)`**: 모든 예외를 `{ message: string, code: string, originalError: unknown }`으로 안전 변환 ([Study 05 #12](../../study/05-fullstack-service-real-world-issues.md))
- **`sharedQueryClient` & `CART_QUERY_KEY` (`['cart']`)**: `Mode B`에서 모든 마이크로 앱이 메모리를 공유하는 싱글톤 `QueryClient` 인스턴스 및 표준 쿼리 키 상수

---

### § 5.4 도메인 리모트(`ProductList`, `CartWidget`) 노출 `Props` 및 상태 동기화(`Mode A` vs `Mode B`) 비교 계약

#### § 5.4.1 상태 동기화 비교 모드 타입 (`SyncMode`) 및 동작 규약
```ts
/**
 * @description MFE 마이크로 앱 간 상태 동기화 비교 학습 모드 타입
 * - 'mode-a-event': 리모트별 독립 QueryClient 사용 + CustomEvent('mfe:cart-updated') 신호로 재조회 트리거 (약결합·이종 프레임워크 호환)
 * - 'mode-b-query': remote-shared의 싱글톤 sharedQueryClient 공유 + invalidateQueries(['cart']) 직접 무효화 (강결합·React 통합)
 */
export type SyncMode = 'mode-a-event' | 'mode-b-query';
```

#### § 5.4.2 `remote_products/ProductList` 노출 컴포넌트 `Props` 계약 (`ProductListProps`)
- **노출 경로 (`exposes`)**: `'./ProductList': './src/exposed/ProductList.tsx'`
```ts
/**
 * @description 상품 카탈로그 리모트(remote-products, Port 3002)의 노출 컴포넌트 Props 계약
 */
export interface ProductListProps {
  /** 현재 로그인된 사용자 고유 ID (기본값: 'user-1') */
  userId?: string;

  /** 이 컴포넌트를 마운트한 상위 호스트 종류 (기본값: 'standalone') */
  hostType?: HostOriginType;

  /** 상태 동기화 아키텍처 비교 모드 (기본값: 'mode-a-event') */
  syncMode?: SyncMode;

  /** 1.5초 네트워크 로딩 지연(Skeleton UI 확인) 시뮬레이션 활성화 여부 (기본값: false) */
  simulateDelay?: boolean;

  /** 백엔드 API 기본 URL 오버라이드 (런타임 환경 주입용, 기본값: 'http://localhost:4000/api') */
  apiBaseUrl?: string;

  /** 장바구니 담기 완료 시 상위 호스트에 알리는 선택적 콜백 함수 */
  onCartAdded?: (payload: CartUpdatedEventPayload) => void;
}
```

#### § 5.4.3 `remote_cart/CartWidget` 노출 컴포넌트 `Props` 계약 (`CartWidgetProps`)
- **노출 경로 (`exposes`)**: `'./CartWidget': './src/exposed/CartWidget.tsx'`
```ts
/**
 * @description 장바구니 리모트(remote-cart, Port 3003)의 노출 컴포넌트 Props 계약
 */
export interface CartWidgetProps {
  /** 현재 로그인된 사용자 고유 ID (기본값: 'user-1') */
  userId?: string;

  /** 이 컴포넌트를 마운트한 상위 호스트 종류 (기본값: 'standalone') */
  hostType?: HostOriginType;

  /** 상태 동기화 아키텍처 비교 모드 (기본값: 'mode-a-event') */
  syncMode?: SyncMode;

  /** 1.5초 네트워크 로딩 지연(Skeleton UI 확인) 시뮬레이션 활성화 여부 (기본값: false) */
  simulateDelay?: boolean;

  /** CSS 스타일 오염(false) vs CSS 프리픽스/모듈 격리(true) 비교 실험 토글 (기본값: true) */
  cssIsolated?: boolean;

  /** 백엔드 API 기본 URL 오버라이드 (기본값: 'http://localhost:4000/api') */
  apiBaseUrl?: string;
}
```

---

### § 5.5 Module Federation 2.0 공통 공유 의존성(`shared` singleton) 및 포트·CORS 계약

모든 프론트엔드 마이크로 앱(`3000`, `3001`, `3002`, `3003`, `3004`)은 `vite.config.ts` 또는 `rsbuild.config.ts`에서 아래 규약을 동일하게 준수합니다.

1. **고정 포트 및 CORS 필수 설정**:
   - `host-vite`: `3000`, `host-rspack`: `3001`, `remote-products`: `3002`, `remote-cart`: `3003`, `remote-shared`: `3004`, `api-server`: `4000`
   - 모든 서버는 `strictPort: true` 및 `cors: true`(`Access-Control-Allow-Origin: *`)를 필수로 활성화합니다.
2. **Module Federation `shared` 싱글톤 설정 (`pnpm-workspace.yaml`의 `catalog:` 버전과 동기화)**:
   - `react`: `{ singleton: true, requiredVersion: '^19.1.0' }`
   - `react-dom`: `{ singleton: true, requiredVersion: '^19.1.0' }`
   - `@tanstack/react-query`: `{ singleton: true, requiredVersion: '^5.74.4' }`
3. **2단 비동기 부트스트랩 분리**:
   - 모든 프론트엔드 앱은 `main.tsx`(또는 `index.tsx`)에서 `import('./bootstrap')`만 호출하고 실제 마운트는 `bootstrap.tsx`에서 수행하여 `eager consumption` 에러를 방지합니다.

---

## 6. [조건부 A] 프론트엔드 및 MFE 연동 설계
- **적용 여부**: `적용 (상단 § 5.2 ~ § 5.5에 Phase 1 전체 MFE 연동 계약 정의 완료)`

---

## 7. [조건부 B] 백엔드 API 및 DB 3종 SQL 설계
- **적용 여부**: `적용 (상단 § 5.1에 Phase 1 전체 DB 테이블 및 REST API 계약 정의 완료)`
