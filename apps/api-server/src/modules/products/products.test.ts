/**
 * @file products.test.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description [TC-04 / EC-02] 상품 카탈로그 전체 조회 및 카테고리·검색어 필터링(GET /api/products) 단위 테스트입니다.
 */
import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { createDatabaseClient } from '../../db/client.js';

describe('상품 카탈로그 조회 및 필터링 API 검증 (TC-04 & EC-02)', () => {
  /** 테스트용 인메모리 SQLite 인스턴스 */
  let db: DatabaseSync;

  beforeEach(() => {
    db = createDatabaseClient({ dbPath: ':memory:', autoInitialize: true });
  });

  afterEach(() => {
    db.close();
  });

  it('TC-04: 전체 상품 목록을 반환하고 category 및 search 쿼리 파라미터로 정확히 필터링해야 한다', async () => {
    const app = createApp(db);

    // 1) 전체 상품 조회
    const allRes = await request(app).get('/api/products').expect(200);
    expect(allRes.body.success).toBe(true);
    expect(allRes.body.data.length).toBeGreaterThanOrEqual(6);

    // 2) 카테고리 + 검색어 복합 필터링
    const filteredRes = await request(app)
      .get('/api/products')
      .query({ category: 'electronics', search: '키보드' })
      .expect(200);

    expect(filteredRes.body.success).toBe(true);
    expect(filteredRes.body.data.length).toBeGreaterThanOrEqual(1);
    for (const product of filteredRes.body.data) {
      expect(product.category).toBe('electronics');
      expect(`${product.name} ${product.description}`).toContain('키보드');
    }

    // 3) 검색어에 SQL LIKE 와일드카드 문자('%')가 포함되어도 전체 상품이 매칭되지 않고 리터럴 문자로 안전하게 검색되어야 함
    const wildcardRes = await request(app)
      .get('/api/products')
      .query({ search: '100%' })
      .expect(200);
    expect(wildcardRes.body.success).toBe(true);
    expect(wildcardRes.body.data).toHaveLength(0);
  });

  it('EC-02: 허용되지 않은 category 쿼리 전송 시 400 VALIDATION_ERROR 봉투를 반환해야 한다', async () => {
    const app = createApp(db);

    const badRes = await request(app)
      .get('/api/products')
      .query({ category: 'invalid-category' })
      .expect(400);

    expect(badRes.body.success).toBe(false);
    expect(badRes.body.error.code).toBe('VALIDATION_ERROR');
  });
});
