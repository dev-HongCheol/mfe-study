-- ============================================================================
-- @file 02-reset-seed.sql
-- @app api-server (Scope: api | Port: 4000)
-- @description 기존 테이블 데이터를 외래키 역순으로 초기화하고, 테스트용 사용자·상품 카탈로그·초기 장바구니 시드 데이터를 투입하는 쿼리입니다.
-- ============================================================================

-- 1. 외래키 자식 테이블부터 순서대로 기존 데이터 초기화
DELETE FROM cart_items;
DELETE FROM products;
DELETE FROM users;

-- 2. 테스트용 사용자 시드 데이터 (2명)
INSERT INTO users (id, username, role, token) VALUES
  ('user-1', '홍길동 (VIP)', 'admin', 'mfe-study-token-user-1-vip'),
  ('user-2', '이순신 (일반)', 'member', 'mfe-study-token-user-2-member');

-- 3. 상품 카탈로그 시드 데이터 (카테고리별 6종 — 품절 테스트용 재고 0 상품 1종 포함)
INSERT INTO products (id, name, price, category, stock, description) VALUES
  (1, '기계식 무선 키보드 Pro', 129000, 'electronics', 15, '저소음 적축 스위치가 탑재된 듀얼 모드 무선 기계식 키보드'),
  (2, '초경량 버티컬 마우스 Air', 68000, 'electronics', 20, '손목 피로를 줄여주는 인체공학 57도 무선 버티컬 마우스'),
  (3, '4K UHD 데스크 모니터 27인치', 389000, 'electronics', 8, 'USB-C PD 65W 충전을 지원하는 IPS 전문가용 모니터'),
  (4, '모션 데스크 스탠딩 책상', 450000, 'office', 5, '메모리 프리셋 기능을 갖춘 듀얼 모터 전동 높이조절 책상'),
  (5, '알루미늄 노트북 거치대 Stand', 42000, 'accessories', 30, '발열 해소에 최적화된 각도 조절 풀 알루미늄 스탠드'),
  (6, '한정판 코딩 장패드 XL (품절)', 25000, 'accessories', 0, '방수 패브릭 소재의 와이드 데스크 매트 (재고 소진 테스트용)');

-- 4. 초기 장바구니 샘플 시드 데이터 (user-1 기준 2건)
INSERT INTO cart_items (id, user_id, product_id, quantity, added_from_host, created_at) VALUES
  (1, 'user-1', 1, 1, 'vite', datetime('now', 'localtime')),
  (2, 'user-1', 5, 2, 'rspack', datetime('now', 'localtime'));
