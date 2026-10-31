/**
 * @file vitest.config.ts
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description 루트 하네스 스크립트(scripts/*.mjs) 및 마이크로 앱(apps/*) TDD 검증을 통합 실행하는 Vitest 설정 파일입니다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/__tests__/**/*.test.ts', 'apps/api-server/src/**/*.test.ts'],
    globals: false,
  },
});
