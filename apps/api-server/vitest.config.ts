/**
 * @file vitest.config.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description 백엔드 API 서버(apps/api-server)의 단위 테스트(Co-location) 및 통합 테스트(__tests__/) 실행을 위한 Vitest 설정 파일입니다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
});
