/**
 * @file products.service.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description 바인딩 파라미터(?)를 사용해 SQL 인젝션 없이 상품을 필터링·조회하는 서비스입니다.
 */
import type { DatabaseSync } from 'node:sqlite';
import type { ProductEntity, ProductRow } from '../../types/contracts.js';
import type { ProductFilterOptions } from './products.schema.js';

/**
 * 카테고리 및 검색어 조건에 맞는 상품 카탈로그 목록을 조회합니다.
 *
 * @param db - SQLite DatabaseSync 인스턴스
 * @param filters - 카테고리 및 검색어 필터 옵션
 * @returns 필터링된 상품 엔티티 배열
 */
export function listProducts(
  db: DatabaseSync,
  filters: ProductFilterOptions = {},
): ProductEntity[] {
  /** 동적 WHERE 조건절 배열 */
  const conditions: string[] = [];

  /** SQL 인젝션 방지를 위한 바인딩 파라미터 값 배열 */
  const params: Array<string | number> = [];

  // [분기 설명 1] category 필터가 지정된 경우 idx_products_category 인덱스를 타도록 정확 일치 조건을 추가합니다.
  if (filters.category) {
    conditions.push('category = ?');
    params.push(filters.category);
  }

  // [분기 설명 2] search 검색어가 지정된 경우 SQL LIKE 와일드카드 문자(\, %, _)를 이스케이프한 뒤
  // 상품명(name) 또는 설명(description) 부분 일치 조건을 안전하게 바인딩합니다.
  if (filters.search) {
    const escapedSearch = filters.search.replace(/[\\%_]/g, '\\$&');
    conditions.push("(name LIKE ? ESCAPE '\\' OR description LIKE ? ESCAPE '\\')");
    const likePattern = `%${escapedSearch}%`;
    params.push(likePattern, likePattern);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT id, name, price, category, stock, description
    FROM products
    ${whereClause}
    ORDER BY id ASC
  `;

  const rows = db.prepare(sql).all(...params) as unknown as ProductRow[];

  return rows.map((row) => ({
    id: Number(row.id),
    name: row.name,
    price: Number(row.price),
    category: row.category,
    stock: Number(row.stock),
    description: row.description,
  }));
}
