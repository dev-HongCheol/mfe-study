/**
 * @file app.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description 포트 리스닝(server.ts)과 분리된 Express 애플리케이션 팩토리입니다. Supertest 무서버 메모리 테스트에서 직접 호출됩니다.
 */
import type { DatabaseSync } from 'node:sqlite';
import cors from 'cors';
import express, { type Express } from 'express';
import { globalErrorHandler, notFoundHandler } from './middlewares/error-handler.js';
import { createAuthRouter } from './modules/auth/auth.router.js';
import { createCartRouter } from './modules/cart/cart.router.js';
import { createProductsRouter } from './modules/products/products.router.js';
import { createSystemRouter } from './modules/system/system.router.js';

/**
 * 주입된 SQLite DatabaseSync 인스턴스를 사용하는 Express 애플리케이션을 조립하여 반환합니다.
 *
 * @param db - 라우터에서 사용할 SQLite DatabaseSync 인스턴스
 * @returns 구성된 Express 애플리케이션 인스턴스
 */
export function createApp(db: DatabaseSync): Express {
  const app = express();

  // [Study 04 #03] 다중 포트(3000~3004) 마이크로 앱 요청 허용을 위한 CORS 헤더 활성화
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    }),
  );

  // JSON 요청 본문 파서 등록 (대용량 페이로드 DoS 방어를 위해 100kb 제한 설정)
  app.use(express.json({ limit: '100kb' }));

  // /api 프리픽스 하위에 4개 도메인 라우터 마운트
  app.use('/api', createSystemRouter(db));
  app.use('/api', createAuthRouter(db));
  app.use('/api', createProductsRouter(db));
  app.use('/api', createCartRouter(db));

  // 미등록 경로(404) 및 전역 에러 핸들러 미들웨어 등록
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  return app;
}
