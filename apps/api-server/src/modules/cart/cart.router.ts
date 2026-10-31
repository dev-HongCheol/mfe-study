/**
 * @file cart.router.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description 장바구니 목록 조회(GET /api/cart), 상품 추가(POST /api/cart), 단건·전체 삭제(DELETE /api/cart/:id) 라우터를 제공합니다.
 */
import type { DatabaseSync } from 'node:sqlite';
import { Router } from 'express';
import { AppError, sendSuccess } from '../../middlewares/response.js';
import {
  addToCartBodySchema,
  deleteCartParamsSchema,
  deleteCartQuerySchema,
  getCartQuerySchema,
} from './cart.schema.js';
import { deleteCartItem, getCartItemsByUser, upsertCartItem } from './cart.service.js';

/**
 * 장바구니 도메인 라우터를 생성합니다.
 *
 * @param db - 주입할 SQLite DatabaseSync 인스턴스
 * @returns 구성된 Express Router 인스턴스
 */
export function createCartRouter(db: DatabaseSync): Router {
  const router = Router();

  // 1) GET /api/cart?userId=user-1
  router.get('/cart', (req, res) => {
    const parsed = getCartQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? '장바구니 조회 파라미터가 올바르지 않습니다.',
        details: parsed.error.issues,
      });
    }

    const items = getCartItemsByUser(db, parsed.data.userId);
    return sendSuccess(res, items);
  });

  // 2) POST /api/cart
  router.post('/cart', (req, res) => {
    const parsed = addToCartBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message:
          parsed.error.issues[0]?.message ?? '장바구니 담기 요청 데이터가 올바르지 않습니다.',
        details: parsed.error.issues,
      });
    }

    const updatedItem = upsertCartItem(db, parsed.data);
    return sendSuccess(res, updatedItem);
  });

  // 3) DELETE /api/cart/:id?userId=user-1
  router.delete('/cart/:id', (req, res) => {
    const paramsParsed = deleteCartParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      throw new AppError({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: paramsParsed.error.issues[0]?.message ?? '삭제할 장바구니 ID가 올바르지 않습니다.',
        details: paramsParsed.error.issues,
      });
    }

    const queryParsed = deleteCartQuerySchema.safeParse(req.query);
    if (!queryParsed.success) {
      throw new AppError({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: queryParsed.error.issues[0]?.message ?? '사용자 ID(userId)가 필요합니다.',
        details: queryParsed.error.issues,
      });
    }

    const result = deleteCartItem(db, paramsParsed.data.id, queryParsed.data.userId);
    return sendSuccess(res, result);
  });

  return router;
}
