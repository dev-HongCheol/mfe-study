/**
 * @file cart.schema.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description 장바구니 조회(GET /api/cart), 추가(POST /api/cart), 삭제(DELETE /api/cart/:id) 요청 파라미터를 검증하는 Zod 스키마입니다.
 */
import { z } from 'zod';

/** 요청 출처 호스트 구분 Zod 스키마 */
export const hostOriginSchema = z.enum(['vite', 'rspack', 'standalone']);

/** [GET /api/cart] 장바구니 목록 조회 Query 검증 스키마 */
export const getCartQuerySchema = z.object({
  userId: z.string().trim().min(1, '조회할 사용자 ID(userId)는 필수입니다.'),
});

/** [POST /api/cart] 장바구니 상품 추가 요청 Body 검증 스키마 */
export const addToCartBodySchema = z.object({
  userId: z.string().trim().min(1, '사용자 ID(userId)는 필수입니다.'),
  productId: z.number().int().positive('상품 ID(productId)는 양의 정수여야 합니다.'),
  quantity: z
    .number()
    .int()
    .min(1, '수량(quantity)은 1 이상이어야 합니다.')
    .max(99, '1회 최대 추가 수량은 99개입니다.'),
  addedFromHost: hostOriginSchema,
});

/** [DELETE /api/cart/:id] 장바구니 삭제 Path Param 검증 스키마 (양의 정수 문자열 또는 'all') */
export const deleteCartParamsSchema = z.object({
  id: z.union([
    z.literal('all'),
    z.string().regex(/^[1-9]\d*$/, '유효한 장바구니 ID 또는 all이어야 합니다.'),
  ]),
});

/** [DELETE /api/cart/:id] 장바구니 삭제 시 소유자 확인을 위한 Query 검증 스키마 */
export const deleteCartQuerySchema = z.object({
  userId: z.string().trim().min(1, '사용자 ID(userId) 쿼리 파라미터는 필수입니다.'),
});

/**
 * @description 장바구니 상품 추가 요청 입력 데이터 인터페이스
 */
export type AddToCartInput = z.infer<typeof addToCartBodySchema>;
