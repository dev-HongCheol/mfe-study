/**
 * @file server.ts
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description Vitest Node 런타임용 MSW setupServer 인스턴스입니다.
 */
import { setupServer } from 'msw/node';
import { cartHandlers } from './handlers';

/** 장바구니 API 모킹 서버 인스턴스 */
export const server = setupServer(...cartHandlers);
