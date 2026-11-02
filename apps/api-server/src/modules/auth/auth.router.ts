/**
 * @file auth.router.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description 사용자 목록 조회(GET /api/users) 및 계정 전환 로그인(POST /api/auth/login) 라우터를 제공합니다.
 */
import type { DatabaseSync } from 'node:sqlite';
import { Router } from 'express';
import { AppError, sendSuccess } from '../../middlewares/response.js';
import { loginBodySchema } from './auth.schema.js';
import { listUsers, loginByUserId } from './auth.service.js';

/**
 * 사용자 조회 및 인증 라우터를 생성합니다.
 *
 * @param db - 주입할 SQLite DatabaseSync 인스턴스
 * @returns 구성된 Express Router 인스턴스
 */
export function createAuthRouter(db: DatabaseSync): Router {
  const router = Router();

  // 1) GET /api/users — 시드 등록된 테스트 사용자 전체 목록 반환
  router.get('/users', (_req, res) => {
    const users = listUsers(db);
    return sendSuccess(res, users);
  });

  // 2) POST /api/auth/login — 선택한 userId로 로그인 및 인증 토큰 반환
  router.post('/auth/login', (req, res) => {
    const parsed = loginBodySchema.safeParse(req.body);

    // [분기 설명] 외부 입력(req.body)이 스키마에 맞지 않으면 즉시 400 VALIDATION_ERROR를 던집니다 (Study 05 #10).
    if (!parsed.success) {
      throw new AppError({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
        message: parsed.error.issues[0]?.message ?? '로그인 요청 형식이 올바르지 않습니다.',
        details: parsed.error.issues,
      });
    }

    const user = loginByUserId(db, parsed.data.userId);
    return sendSuccess(res, user);
  });

  return router;
}
