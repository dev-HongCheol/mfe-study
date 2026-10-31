/**
 * @file products.schema.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description [GET /api/products] 상품 카탈로그 카테고리 및 검색어 필터링 Query 파라미터를 검증하는 Zod 스키마입니다.
 */
import { z } from 'zod';

/** 상품 카탈로그 필터링 Query 검증 스키마 */
export const productsQuerySchema = z.object({
  category: z.enum(['electronics', 'office', 'accessories']).optional(),
  search: z.string().trim().max(100, '검색어는 100자 이내여야 합니다.').optional(),
});

/**
 * @description 상품 카탈로그 필터링 조건 인터페이스
 */
export interface ProductFilterOptions {
  /** 필터링할 상품 카테고리 (선택적) */
  category?: 'electronics' | 'office' | 'accessories';

  /** 상품명 또는 설명에서 부분 일치로 검색할 키워드 (선택적) */
  search?: string;
}
