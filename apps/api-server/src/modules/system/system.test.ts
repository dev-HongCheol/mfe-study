/**
 * @file system.test.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description [TC-02] GET /api/health (CORS 및 PRAGMA 상태) 및 GET /api/schema-comments (_schema_comments 한글 설명 조회) 단위 테스트입니다.
 */
import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { createDatabaseClient } from '../../db/client.js';

describe('시스템 헬스체크 및 스키마 코멘트 API 검증 (TC-02)', () => {
  /** 테스트용 인메모리 SQLite 인스턴스 */
  let db: DatabaseSync;

  beforeEach(() => {
    db = createDatabaseClient({ dbPath: ':memory:', autoInitialize: true });
  });

  afterEach(() => {
    db.close();
  });

  it('TC-02-1: GET /api/health 호출 시 CORS 헤더와 함께 SQLite PRAGMA 활성화 상태를 표준 봉투로 반환해야 한다', async () => {
    const app = createApp(db);
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:3000')
      .expect(200);

    expect(response.headers['access-control-allow-origin']).toBeDefined();
    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'ok',
        dbMode: 'memory',
        foreignKeys: true,
      },
    });
  });

  it('TC-02-2: GET /api/schema-comments 호출 시 4대 테이블과 컬럼의 한글 코멘트를 카멜 케이스로 반환해야 한다', async () => {
    const app = createApp(db);
    const response = await request(app).get('/api/schema-comments').expect(200);

    expect(response.body.success).toBe(true);
    const comments: Array<{ tableName: string; columnName: string | null; comment: string }> =
      response.body.data;

    expect(comments.length).toBeGreaterThanOrEqual(20);
    const tableNames = new Set(comments.map((item) => item.tableName));
    expect(tableNames.has('_schema_comments')).toBe(true);
    expect(tableNames.has('users')).toBe(true);
    expect(tableNames.has('products')).toBe(true);
    expect(tableNames.has('cart_items')).toBe(true);
  });
});
