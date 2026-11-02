/**
 * @file error-handler.test.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description [EC-04] 미등록 경로(404 NOT_FOUND), AppError 비즈니스 예외, 그리고 비표준 문자열 예외(500 INTERNAL_ERROR)를 표준 응답 봉투로 변환하는 미들웨어 단위 테스트입니다.
 */
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { globalErrorHandler, normalizeBackendError, notFoundHandler } from './error-handler.js';
import { AppError } from './response.js';

describe('전역 에러 핸들러 및 예외 정규화 검증 (EC-04)', () => {
  it('EC-04-1: normalizeBackendError는 비표준 예외의 내부 원문은 internalMessage에 보존하고 외부 message는 안전하게 마스킹해야 한다', () => {
    const stringErr = normalizeBackendError('비표준 문자열 예외');
    expect(stringErr.statusCode).toBe(500);
    expect(stringErr.code).toBe('INTERNAL_ERROR');
    expect(stringErr.message).toBe('서버 내부 오류가 발생했습니다.');
    expect(stringErr.internalMessage).toContain('비표준 문자열 예외');

    const appErr = normalizeBackendError(
      new AppError({
        statusCode: 404,
        code: 'NOT_FOUND',
        message: '요청한 상품을 찾을 수 없습니다.',
      }),
    );
    expect(appErr.statusCode).toBe(404);
    expect(appErr.code).toBe('NOT_FOUND');
    expect(appErr.message).toBe('요청한 상품을 찾을 수 없습니다.');
  });

  it('EC-04-2: 미등록 경로(404), 깨진 JSON 본문(400), 비표준 문자열 예외(500 마스킹) 시 각각 표준 에러 봉투를 반환해야 한다', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/api/echo', (req, res) => res.json({ ok: true, body: req.body }));
    testApp.get('/api/boom-string', async () => {
      throw '라우터 내부 민감 문자열 크래시';
    });
    testApp.use(notFoundHandler);
    testApp.use(globalErrorHandler);

    // 1) 미등록 경로 요청 -> 404 NOT_FOUND
    const notFoundRes = await request(testApp).get('/api/unknown-endpoint').expect(404);
    expect(notFoundRes.body.success).toBe(false);
    expect(notFoundRes.body.error.code).toBe('NOT_FOUND');

    // 2) 문법이 깨진 JSON 본문 요청 -> 500이 아닌 400 VALIDATION_ERROR 반환
    const malformedJsonRes = await request(testApp)
      .post('/api/echo')
      .set('Content-Type', 'application/json')
      .send('{ "brokenJson": ')
      .expect(400);
    expect(malformedJsonRes.body.success).toBe(false);
    expect(malformedJsonRes.body.error.code).toBe('VALIDATION_ERROR');

    // 3) 비표준 문자열 예외 -> 서버가 죽지 않고 내부 원문을 마스킹한 500 INTERNAL_ERROR 봉투 반환 (SEC-03)
    const boomRes = await request(testApp).get('/api/boom-string').expect(500);
    expect(boomRes.body.success).toBe(false);
    expect(boomRes.body.error.code).toBe('INTERNAL_ERROR');
    expect(boomRes.body.error.message).toBe('서버 내부 오류가 발생했습니다.');
  });
});
