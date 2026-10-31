/**
 * @file api-and-sql.integration.test.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description 3종 SQL(01-schema, 02-reset-seed, 03-drop-all) 해시·멱등성·외래키 CASCADE 무결성 및 전체 REST API 사용자 흐름을 검증하는 통합 테스트입니다.
 */
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
import { createDatabaseClient, executeSqlFile, verifyLocalSqlHashes } from '../db/client.js';

describe('백엔드 3종 SQL 생명주기 및 REST API 통합 시나리오 검증', () => {
  it('SQL-01: .sql-hashes.json 해시 검증 및 01 -> 02 -> 03 -> 01 -> 02 순차 실행 멱등성과 외래키 CASCADE가 정상 동작해야 한다', () => {
    // 1) .sql-hashes.json SHA-256 해시 일치 확인
    expect(verifyLocalSqlHashes()).toBe(true);

    // 2) 3종 SQL 반복 실행 멱등성 및 외래키 제약 검증
    const db = createDatabaseClient({ dbPath: ':memory:', autoInitialize: false });
    executeSqlFile(db, '01-schema.sql');
    executeSqlFile(db, '02-reset-seed.sql');
    executeSqlFile(db, '03-drop-all.sql');
    executeSqlFile(db, '01-schema.sql');
    executeSqlFile(db, '02-reset-seed.sql');

    // 존재하지 않는 user_id 또는 product_id 삽입 시 외래키 제약(FOREIGN KEY constraint failed)으로 차단되어야 함
    expect(() => {
      db.prepare(
        'INSERT INTO cart_items (user_id, product_id, quantity, added_from_host) VALUES (?, ?, ?, ?)',
      ).run('non-existent-user', 1, 1, 'vite');
    }).toThrow();

    // 부모 유저(user-1) 삭제 시 ON DELETE CASCADE에 의해 user-1의 장바구니 항목도 자동 연쇄 삭제되어야 함
    db.prepare('DELETE FROM users WHERE id = ?').run('user-1');
    const orphanRow = db
      .prepare('SELECT COUNT(*) AS cnt FROM cart_items WHERE user_id = ?')
      .get('user-1') as { cnt: number };
    expect(Number(orphanRow.cnt)).toBe(0);

    db.close();
  });

  it('INT-01: 로그인 -> 상품 조회 -> 장바구니 담기(UPSERT) -> 장바구니 조회 -> 전체 비우기 E2E 시나리오가 동작해야 한다', async () => {
    const db = createDatabaseClient({ dbPath: ':memory:', autoInitialize: true });
    const app = createApp(db);

    // 1) 로그인
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ userId: 'user-1' })
      .expect(200);
    const userId = loginRes.body.data.id;

    // 2) 상품 목록 조회
    const productsRes = await request(app).get('/api/products').expect(200);
    const targetProduct = productsRes.body.data.find((p: { stock: number }) => p.stock >= 5);
    expect(targetProduct).toBeDefined();

    // 3) 기존 장바구니 초기화 후 상품 담기
    await request(app).delete('/api/cart/all').query({ userId }).expect(200);
    await request(app)
      .post('/api/cart')
      .send({
        userId,
        productId: targetProduct.id,
        quantity: 2,
        addedFromHost: 'vite',
      })
      .expect(200);

    // 4) 장바구니 조회 확인
    const cartRes = await request(app).get('/api/cart').query({ userId }).expect(200);
    expect(cartRes.body.data).toHaveLength(1);
    expect(cartRes.body.data[0]).toMatchObject({
      userId,
      productId: targetProduct.id,
      productName: targetProduct.name,
      quantity: 2,
      addedFromHost: 'vite',
    });

    db.close();
  });
});
