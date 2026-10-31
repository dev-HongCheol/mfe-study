-- ============================================================================
-- @file 01-schema.sql
-- @app api-server (Scope: api | Port: 4000)
-- @description MFE Study 백엔드 SQLite 4대 테이블(_schema_comments, users, products, cart_items),
--              인덱스 및 테이블·컬럼 한글 코멘트 메타데이터를 생성하는 스키마 정본 쿼리입니다.
-- ============================================================================

-- 1. [_schema_comments] SQLite의 COMMENT 문법 부재를 보완하는 테이블·컬럼 한글 설명 사전 테이블
CREATE TABLE IF NOT EXISTS _schema_comments (
  table_name TEXT NOT NULL,  -- 설명 대상 테이블 이름 (예: 'products', 'cart_items')
  column_name TEXT,          -- 설명 대상 컬럼 이름 (테이블 자체 설명일 경우 NULL)
  comment TEXT NOT NULL      -- 테이블 또는 컬럼의 역할에 대한 한글 상세 설명
);

-- NULL을 포함한 (table_name, column_name) 조합의 중복 등록을 방지하는 표현식 고유 인덱스
CREATE UNIQUE INDEX IF NOT EXISTS idx_schema_comments_target
  ON _schema_comments (table_name, IFNULL(column_name, '__TABLE__'));

-- 2. [users] 호스트·리모트 간 인증 컨텍스트 공유 테스트용 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                                     -- 사용자 고유 식별자 (PK, 예: 'user-1')
  username TEXT NOT NULL,                                  -- 화면에 표시할 사용자 이름 및 등급
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),  -- 사용자 권한 등급 ('admin' | 'member')
  token TEXT NOT NULL                                      -- 테스트용 인증 베어러 토큰 문자열
);

-- 3. [products] 상품 카탈로그 마이크로 앱(remote-products)에서 조회하는 상품 테이블
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,                                         -- 상품 고유 번호 (PK, 자동 증가 정수)
  name TEXT NOT NULL,                                                           -- 상품명
  price INTEGER NOT NULL CHECK (price >= 0),                                    -- 상품 단가 (부동소수점 오차 방지를 위한 원화 정수)
  category TEXT NOT NULL CHECK (category IN ('electronics', 'office', 'accessories')), -- 상품 카테고리 구분
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),                          -- 현재 남아있는 재고 수량 (0 이상 정수)
  description TEXT NOT NULL                                                     -- 상품 요약 설명 문구
);

-- 카테고리별 상품 필터링 성능 최적화를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_products_category ON products (category);

-- 4. [cart_items] 사용자별 장바구니 담긴 상품 내역 테이블 (remote-products 추가 / remote-cart 조회)
CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,                                              -- 장바구니 항목 고유 번호 (PK, 자동 증가 정수)
  user_id TEXT NOT NULL,                                                             -- 장바구니 소유 사용자 ID (users.id 외래키)
  product_id INTEGER NOT NULL,                                                       -- 담긴 상품 고유 번호 (products.id 외래키)
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),                         -- 담긴 상품 수량 (1 이상 정수)
  added_from_host TEXT NOT NULL CHECK (added_from_host IN ('vite', 'rspack', 'standalone')), -- 상품을 담은 호스트 출처 구분
  created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),                   -- 최초 등록 또는 수량 갱신 일시 (KST 기준)
  UNIQUE (user_id, product_id),                                                      -- 동일 유저+상품 중복 행 방지 및 원자적 UPSERT용 복합 고유키
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,                     -- 유저 삭제 시 장바구니 항목 연쇄 삭제
  FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE                -- 상품 삭제 시 장바구니 항목 연쇄 삭제
);

-- 장바구니 목록 조회(WHERE user_id = ?) 및 JOIN 성능 최적화를 위한 외래키 인덱스
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items (user_id);

-- 5. 전체 테이블 및 컬럼 한글 코멘트 메타데이터 등록 (멱등성 보장을 위해 기존 코멘트 정리 후 재등록)
DELETE FROM _schema_comments;

INSERT INTO _schema_comments (table_name, column_name, comment) VALUES
  -- _schema_comments 테이블 설명
  ('_schema_comments', NULL, '데이터베이스 테이블 및 컬럼 한글 주석 사전 메타 테이블'),
  ('_schema_comments', 'table_name', '설명 대상 테이블 이름'),
  ('_schema_comments', 'column_name', '설명 대상 컬럼 이름 (테이블 자체 설명일 경우 NULL)'),
  ('_schema_comments', 'comment', '테이블 또는 컬럼의 한글 역할 설명'),

  -- users 테이블 설명
  ('users', NULL, '인증 컨텍스트 공유 테스트용 사용자 테이블'),
  ('users', 'id', '사용자 고유 식별자 (PK, 예: user-1, user-2)'),
  ('users', 'username', '화면에 표시할 사용자 이름'),
  ('users', 'role', '사용자 권한 등급 (admin 또는 member)'),
  ('users', 'token', '테스트용 인증 베어러 토큰 문자열'),

  -- products 테이블 설명
  ('products', NULL, '상품 카탈로그 마이크로 앱(remote-products)에서 조회하는 상품 마스터 테이블'),
  ('products', 'id', '상품 고유 번호 (PK, AUTOINCREMENT 정수)'),
  ('products', 'name', '상품명'),
  ('products', 'price', '상품 단가 (원화 정수 단위)'),
  ('products', 'category', '상품 카테고리 구분 (electronics, office, accessories)'),
  ('products', 'stock', '현재 남아있는 재고 수량 (0 이상의 정수)'),
  ('products', 'description', '상품 요약 설명 문구'),

  -- cart_items 테이블 설명
  ('cart_items', NULL, '사용자별 장바구니 담긴 상품 내역 테이블'),
  ('cart_items', 'id', '장바구니 항목 고유 번호 (PK, AUTOINCREMENT 정수)'),
  ('cart_items', 'user_id', '장바구니 소유 사용자 ID (users.id 외래키, ON DELETE CASCADE)'),
  ('cart_items', 'product_id', '담긴 상품 고유 번호 (products.id 외래키, ON DELETE CASCADE)'),
  ('cart_items', 'quantity', '담긴 상품 수량 (1 이상의 정수, 원자적 UPSERT 누적 대상)'),
  ('cart_items', 'added_from_host', '이 상품을 장바구니에 담은 호스트 출처 (vite, rspack, standalone)'),
  ('cart_items', 'created_at', '장바구니 최초 등록 또는 수량 갱신 일시');
