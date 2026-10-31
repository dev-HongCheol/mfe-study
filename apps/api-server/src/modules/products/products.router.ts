/**
 * @file products.router.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description 상품 카탈로그 목록 조회 및 필터링(GET /api/products) 라우터를 제공합니다.
 */
import type { DatabaseSync } from 'node:sqlite';
import { Router } from 'express';
import { AppError, sendSuccess } from '../../middlewares/response.js';
import { productsQuerySchema } from './products.schema.js';
import { listProducts } from './products.service.js';

/**
 * 상품 카탈로그 라우터를 생성합니다.
 *
 * @param db - 주입할 SQLite DatabaseSync 인스턴스
 * @returns 구성된 Express Router 인스턴스
 */
export function createProductsRouter(db: DatabaseSync): Router {
  const router = Router();

  // GET /api/products?category=...&search=...
  router.get('/products', (req, res) => {
    const parsed = productsQuerySchema.safeParse(req.query);

    // [분기 설명] 허용되지 않은 category 등 잘못된 쿼리 파라미터가 전달되면 400 VALIDATION_ERROR를 반환합니다.
    if (!parsed.success) {
      throw new AppError({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? '상품 조회 쿼리 파라미터가 올바르지 않습니다.',
        details: parsed.error.issues,
      });
    }

    const products = listProducts(db, parsed.data);
    return sendSuccess(res, products);
  });

  return router;
}
