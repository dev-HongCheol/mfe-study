/**
 * @file cart.service.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description [Study 05 #06 & #08] INNER JOIN 단일 쿼리 장바구니 조회, BEGIN IMMEDIATE 트랜잭션 + 복합 고유키 원자적 UPSERT, 단건/전체 삭제를 수행하는 서비스입니다.
 */
import type { DatabaseSync } from 'node:sqlite';
import { runInTransaction } from '../../db/client.js';
import { AppError } from '../../middlewares/response.js';
import type { CartItemJoinedRow, CartItemView, DeleteCartResult } from '../../types/contracts.js';
import type { AddToCartInput } from './cart.schema.js';

/**
 * SQLite 스네이크 케이스 JOIN 행(CartItemJoinedRow)을 프론트엔드용 카멜 케이스(CartItemView)로 변환합니다.
 *
 * @param row - cart_items와 products가 INNER JOIN된 원본 행 객체
 * @returns 카멜 케이스로 정규화된 장바구니 뷰 객체
 */
function mapJoinedRowToView(row: CartItemJoinedRow): CartItemView {
  return {
    id: Number(row.id),
    userId: row.user_id,
    productId: Number(row.product_id),
    productName: row.product_name,
    price: Number(row.price),
    category: row.category,
    quantity: Number(row.quantity),
    addedFromHost: row.added_from_host,
    createdAt: row.created_at,
  };
}

/**
 * 특정 사용자의 장바구니 목록을 products 테이블과 INNER JOIN하여 단일 쿼리로 조회합니다 (N+1 쿼리 방지).
 *
 * @param db - SQLite DatabaseSync 인스턴스
 * @param userId - 조회할 사용자 고유 ID
 * @returns 장바구니 항목 뷰 배열
 */
export function getCartItemsByUser(db: DatabaseSync, userId: string): CartItemView[] {
  const rows = db
    .prepare(
      `
      SELECT
        c.id,
        c.user_id,
        c.product_id,
        p.name AS product_name,
        p.price,
        p.category,
        c.quantity,
        c.added_from_host,
        c.created_at
      FROM cart_items c
      INNER JOIN products p ON c.product_id = p.id
      WHERE c.user_id = ?
      ORDER BY c.id ASC
    `,
    )
    .all(userId) as unknown as CartItemJoinedRow[];

  return rows.map(mapJoinedRowToView);
}

/**
 * 트랜잭션(BEGIN IMMEDIATE) 내에서 사용자·상품·재고를 검증하고, 복합 고유키(user_id, product_id) 기반 원자적 UPSERT를 수행합니다.
 *
 * @param db - SQLite DatabaseSync 인스턴스
 * @param input - 장바구니 추가 요청 데이터 (userId, productId, quantity, addedFromHost)
 * @returns 추가 또는 수량이 누적된 장바구니 항목 뷰 객체
 */
export function upsertCartItem(db: DatabaseSync, input: AddToCartInput): CartItemView {
  return runInTransaction(db, () => {
    // 1) 사용자 존재 여부 확인
    const userExists = db.prepare('SELECT id FROM users WHERE id = ?').get(input.userId);
    if (!userExists) {
      throw new AppError({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: `사용자(${input.userId})를 찾을 수 없습니다.`,
      });
    }

    // 2) 상품 존재 여부 및 현재 재고(stock) 확인
    const product = db
      .prepare('SELECT id, name, stock FROM products WHERE id = ?')
      .get(input.productId) as { id: number; name: string; stock: number } | undefined;

    if (!product) {
      throw new AppError({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: `상품(ID: ${input.productId})을 찾을 수 없습니다.`,
      });
    }

    // 3) 기존 장바구니에 담긴 수량과 새로 추가할 수량의 합이 재고(stock)를 초과하는지 검증
    const existingCartRow = db
      .prepare('SELECT quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
      .get(input.userId, input.productId) as { quantity: number } | undefined;

    const currentQuantity = Number(existingCartRow?.quantity ?? 0);
    const nextTotalQuantity = currentQuantity + input.quantity;

    // [분기 설명] 누적될 총수량이 상품의 남은 재고(stock)보다 많으면 400 OUT_OF_STOCK 예외를 던져 ROLLBACK합니다.
    if (nextTotalQuantity > Number(product.stock)) {
      throw new AppError({
        statusCode: 400,
        code: 'OUT_OF_STOCK',
        message: `'${product.name}' 상품의 재고가 부족합니다. (남은 재고: ${product.stock}개, 요청 누적 수량: ${nextTotalQuantity}개)`,
      });
    }

    // 4) [Study 05 #06] 복합 고유키 UNIQUE(user_id, product_id) 기반 원자적 UPSERT 실행
    db.prepare(
      `
      INSERT INTO cart_items (user_id, product_id, quantity, added_from_host, created_at)
      VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
      ON CONFLICT(user_id, product_id)
      DO UPDATE SET
        quantity = cart_items.quantity + excluded.quantity,
        added_from_host = excluded.added_from_host,
        created_at = datetime('now', 'localtime')
    `,
    ).run(input.userId, input.productId, input.quantity, input.addedFromHost);

    // 5) 갱신된 장바구니 항목을 products와 INNER JOIN하여 반환
    const updatedRow = db
      .prepare(
        `
        SELECT
          c.id,
          c.user_id,
          c.product_id,
          p.name AS product_name,
          p.price,
          p.category,
          c.quantity,
          c.added_from_host,
          c.created_at
        FROM cart_items c
        INNER JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ? AND c.product_id = ?
      `,
      )
      .get(input.userId, input.productId) as unknown as CartItemJoinedRow;

    return mapJoinedRowToView(updatedRow);
  });
}

/**
 * 특정 장바구니 항목을 단건 삭제하거나 해당 사용자의 장바구니 전체('all')를 비웁니다.
 *
 * @param db - SQLite DatabaseSync 인스턴스
 * @param targetId - 삭제할 장바구니 항목 ID 문자열 또는 'all'
 * @param userId - 장바구니 소유 사용자 ID
 * @returns 삭제된 대상 식별자 및 삭제된 행 개수
 */
export function deleteCartItem(
  db: DatabaseSync,
  targetId: string,
  userId: string,
): DeleteCartResult {
  // [분기 설명 1] targetId가 'all'인 경우 해당 사용자의 장바구니 항목 전체를 일괄 삭제합니다.
  if (targetId === 'all') {
    const runResult = db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
    return {
      deletedId: 'all',
      deletedCount: Number(runResult.changes),
    };
  }

  // [분기 설명 2] 특정 항목 ID 삭제인 경우 본인(user_id) 소유의 항목만 삭제하며, 대상이 없으면 404를 던집니다.
  const numericId = Number(targetId);
  const runResult = db
    .prepare('DELETE FROM cart_items WHERE id = ? AND user_id = ?')
    .run(numericId, userId);

  if (Number(runResult.changes) === 0) {
    throw new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: `삭제할 장바구니 항목(ID: ${numericId})을 찾을 수 없습니다.`,
    });
  }

  return {
    deletedId: numericId,
    deletedCount: Number(runResult.changes),
  };
}
