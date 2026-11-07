/**
 * @file server.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description Node/jsdom 테스트 환경에서 네트워크 요청을 가로채는 MSW setupServer 인스턴스입니다.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers.js';

/** 테스트 전역에서 공유되는 MSW 서버 인스턴스 */
export const server = setupServer(...handlers);
