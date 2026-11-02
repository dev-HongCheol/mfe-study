/**
 * @file cart.test.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description [TC-05 / EC-02 / EC-03] 장바구니 INNER JOIN 조회, 복합 고유키 기반 원자적 UPSERT 수량 누적, 재고 초과 방어 및 삭제 API 단위 테스트입니다.
 */
import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { createDatabaseClient } from '../../db/client.js';

describe('장바구니 조회·원자적 UPSERT·삭제 API 검증 (TC-05 & EC-02 & EC-03)', () => {
  /** 테스트용 인메모리 SQLite 인스턴스 */
  let db: DatabaseSync;

  beforeEach(() => {
    db = createDatabaseClient({ dbPath: ':memory:', autoInitialize: true });
  });

  afterEach(() => {
    db.close();
  });

  it('TC-05: 동일 (userId, productId) 재요청 시 행 중복 없이 원자적 UPSERT로 수량이 누적되고 JOIN 조회 및 단건/전체 삭제가 동작해야 한다', async () => {
    const app = createApp(db);

    // 깨끗한 검증을 위해 user-2 장바구니 전체 비우기 후 시작
    await request(app).delete('/api/cart/all').query({ userId: 'user-2' }).expect(200);

    // 1) 첫 번째 담기 (vite 호스트에서 productId: 1을 1개 추가)
    const firstAddRes = await request(app)
      .post('/api/cart')
      .send({
        userId: 'user-2',
        productId: 1,
        quantity: 1,
        addedFromHost: 'vite',
      })
      .expect(200);

    expect(firstAddRes.body.success).toBe(true);
    expect(firstAddRes.body.data).toMatchObject({
      userId: 'user-2',
      productId: 1,
      quantity: 1,
      addedFromHost: 'vite',
    });
    expect(firstAddRes.body.data.productName).toBeTruthy();

    // 2) 두 번째 담기 (동일 user-2 + productId: 1에 rspack 호스트에서 2개 추가 -> UPSERT 누적 = 3개)
    const secondAddRes = await request(app)
      .post('/api/cart')
      .send({
        userId: 'user-2',
        productId: 1,
        quantity: 2,
        addedFromHost: 'rspack',
      })
      .expect(200);

    expect(secondAddRes.body.success).toBe(true);
    expect(secondAddRes.body.data.quantity).toBe(3);
    expect(secondAddRes.body.data.addedFromHost).toBe('rspack');

    // 3) GET /api/cart 조회 시 중복 행 없이 딱 1줄만 존재하며 INNER JOIN 상품 정보가 포함되어야 함
    const listRes = await request(app).get('/api/cart').query({ userId: 'user-2' }).expect(200);
    expect(listRes.body.success).toBe(true);
    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].quantity).toBe(3);
    expect(typeof listRes.body.data[0].price).toBe('number');

    const cartItemId = listRes.body.data[0].id;

    // 4) 단건 삭제 검증
    const deleteOneRes = await request(app)
      .delete(`/api/cart/${cartItemId}`)
      .query({ userId: 'user-2' })
      .expect(200);
    expect(deleteOneRes.body.data).toEqual({
      deletedId: cartItemId,
      deletedCount: 1,
    });
  });

  it('EC-02 & EC-03: 잘못된 파라미터 전송 시 400 VALIDATION_ERROR를, 재고 부족 상품 추가 시 400 OUT_OF_STOCK을 반환해야 한다', async () => {
    const app = createApp(db);

    // 1) 잘못된 호스트 출처 및 0 이하 수량 -> 400 VALIDATION_ERROR
    const invalidRes = await request(app)
      .post('/api/cart')
      .send({
        userId: 'user-1',
        productId: 1,
        quantity: 0,
        addedFromHost: 'vite',
      })
      .expect(400);
    expect(invalidRes.body.error.code).toBe('VALIDATION_ERROR');

    // 2) 재고(stock)를 초과하는 대량 수량 요청 -> 400 OUT_OF_STOCK
    const outOfStockRes = await request(app)
      .post('/api/cart')
      .send({
        userId: 'user-1',
        productId: 1,
        quantity: 95,
        addedFromHost: 'standalone',
      })
      .expect(400);
    expect(outOfStockRes.body.success).toBe(false);
    expect(outOfStockRes.body.error.code).toBe('OUT_OF_STOCK');
  });
});
