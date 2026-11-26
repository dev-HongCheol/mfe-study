/**
 * @file server.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description Node(Vitest) 환경에서 REST API 요청을 가로채는 MSW 서버 인스턴스입니다.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** host-vite 테스트용 MSW 서버 인스턴스 */
export const server = setupServer(...handlers);
