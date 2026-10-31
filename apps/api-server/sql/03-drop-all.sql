-- ============================================================================
-- @file 03-drop-all.sql
-- @app api-server (Scope: api | Port: 4000)
-- @description 외래키 제약조건 순서(자식 -> 부모)에 맞춰 모든 인덱스와 테이블을 깔끔히 삭제하는 쿼리입니다.
-- ============================================================================

-- 1. 인덱스 삭제
DROP INDEX IF EXISTS idx_cart_items_user_id;
DROP INDEX IF EXISTS idx_products_category;
DROP INDEX IF EXISTS idx_schema_comments_target;

-- 2. 외래키 자식 테이블부터 부모 테이블 순서로 삭제
DROP TABLE IF EXISTS cart_items;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS _schema_comments;
