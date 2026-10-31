/**
 * @file auth.test.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description [TC-03 / EC-02 / EC-04] 사용자 목록 조회(GET /api/users) 및 계정 전환 로그인(POST /api/auth/login) 단위 테스트입니다.
 */
import type { DatabaseSync } from 'node:sqlite';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../app.js';
import { createDatabaseClient } from '../../db/client.js';

describe('사용자 목록 조회 및 로그인 API 검증 (TC-03 & EC-02 & EC-04)', () => {
  /** 테스트용 인메모리 SQLite 인스턴스 */
  let db: DatabaseSync;

  beforeEach(() => {
    db = createDatabaseClient({ dbPath: ':memory:', autoInitialize: true });
  });

  afterEach(() => {
    db.close();
  });

  it('TC-03: GET /api/users는 시드 유저 목록을 반환하고 POST /api/auth/login은 유효한 유저 정보와 토큰을 반환해야 한다', async () => {
    const app = createApp(db);

    // 1) 전체 시드 유저 목록 조회
    const usersRes = await request(app).get('/api/users').expect(200);
    expect(usersRes.body.success).toBe(true);
    expect(usersRes.body.data.length).toBeGreaterThanOrEqual(2);
    expect(usersRes.body.data[0]).toMatchObject({
      id: 'user-1',
      role: 'admin',
    });

    // 2) user-1 로그인 요청
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ userId: 'user-1' })
      .expect(200);

    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.id).toBe('user-1');
    expect(loginRes.body.data.token).toBeTruthy();
  });

  it('EC-02 & EC-04: 빈 userId 전송 시 400 VALIDATION_ERROR를, 미등록 유저 전송 시 404 NOT_FOUND를 반환해야 한다', async () => {
    const app = createApp(db);

    const invalidRes = await request(app)
      .post('/api/auth/login')
      .send({ userId: '   ' })
      .expect(400);
    expect(invalidRes.body.success).toBe(false);
    expect(invalidRes.body.error.code).toBe('VALIDATION_ERROR');

    const notFoundRes = await request(app)
      .post('/api/auth/login')
      .send({ userId: 'user-999' })
      .expect(404);
    expect(notFoundRes.body.success).toBe(false);
    expect(notFoundRes.body.error.code).toBe('NOT_FOUND');
  });
});
