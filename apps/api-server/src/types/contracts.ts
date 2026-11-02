/**
 * @file contracts.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description 루트 정본(SSOT § 5.1)의 API 응답 봉투·도메인 엔티티 계약과 백엔드 내부 SQLite 원본 행(Row) 및 Omit 합성 인터페이스를 정의합니다.
 */

/**
 * @description 요청이 발생한 호스트(또는 단독 실행) 애플리케이션의 출처 구분 타입
 */
export type HostOriginType = 'vite' | 'rspack' | 'standalone';

/**
 * @description 백엔드 전역에서 일관된 HTTP 상태 코드와 에러 봉투를 생성하기 위한 표준 에러 코드 유니온 타입
 */
export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'OUT_OF_STOCK'
  | 'CONFLICT_ERROR'
  | 'INTERNAL_ERROR';

/**
 * @description 백엔드 REST API 에러 발생 시 반환되는 표준 에러 상세 객체 인터페이스
 */
export interface ApiErrorPayload {
  /** 머신 판독용 표준 에러 코드 */
  code: ApiErrorCode | string;

  /** 사용자 또는 개발자에게 표시할 한글 에러 설명 메시지 */
  message: string;

  /** Zod 스키마 검증 실패 등 추가 디버깅 상세 정보 (선택적) */
  details?: unknown;
}

/**
 * @description 모든 백엔드 REST API 엔드포인트가 공통으로 반환하는 표준 응답 봉투(Envelope) 인터페이스
 */
export interface ApiResponse<T> {
  /** 요청 처리 성공 여부 (HTTP 2xx일 때 true, 4xx/5xx일 때 false) */
  success: boolean;

  /** 요청 성공 시 반환되는 실제 도메인 데이터 페이로드 (성공 시 필수) */
  data?: T;

  /** 요청 실패 시 반환되는 표준 에러 객체 (실패 시 필수) */
  error?: ApiErrorPayload;
}

/**
 * @description [Table: _schema_comments] 데이터베이스 테이블 및 컬럼 한글 주석 메타데이터 인터페이스 (카멜 케이스)
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
 * @description [Table: _schema_comments] SQLite 원본 스네이크 케이스 행(Row) 인터페이스
 */
export interface SchemaCommentRow {
  /** 설명 대상 테이블 이름 */
  table_name: string;

  /** 설명 대상 컬럼 이름 (테이블 자체 설명일 경우 null) */
  column_name: string | null;

  /** 테이블 또는 컬럼의 한글 설명 */
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

  /** 상품 단가 (원화 정수 단위, 부동소수점 오차 방지를 위해 정수로만 저장·연산) */
  price: number;

  /** 상품 카테고리 구분 ('electronics' | 'office' | 'accessories') */
  category: 'electronics' | 'office' | 'accessories';

  /** 현재 남아있는 재고 수량 (0 이상의 정수) */
  stock: number;

  /** 상품 설명 요약 문구 */
  description: string;
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
  added_from_host: HostOriginType;

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
 * @description [Table: cart_items + products JOIN] 프론트엔드(remote-cart)에 반환하는 카멜 케이스 장바구니 항목 인터페이스
 */
export interface CartItemView extends Omit<ProductEntity, 'id' | 'name' | 'stock' | 'description'> {
  /** 장바구니 항목 고유 번호 (PK, AUTOINCREMENT 정수) */
  id: number;

  /** 장바구니 소유 사용자 ID (users.id 외래키) */
  userId: string;

  /** 담긴 상품 고유 번호 (products.id 외래키) */
  productId: number;

  /** JOIN으로 함께 조회된 상품명 (N+1 쿼리 방지용 단일 JOIN 결과) */
  productName: string;

  /** 담긴 상품 수량 (1 이상의 정수) */
  quantity: number;

  /** 이 상품을 장바구니에 담은 호스트 출처 ('vite' | 'rspack' | 'standalone') */
  addedFromHost: HostOriginType;

  /** 장바구니 최초 등록 또는 수량 갱신 일시 */
  createdAt: string;
}

/**
 * @description DELETE /api/cart/:id 실행 결과 응답 데이터 인터페이스
 */
export interface DeleteCartResult {
  /** 삭제된 장바구니 항목 ID 또는 전체 비우기 식별자('all') */
  deletedId: number | 'all';

  /** 실제로 삭제된 행(Row)의 개수 */
  deletedCount: number;
}
