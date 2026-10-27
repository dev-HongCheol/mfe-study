/**
 * @file vitest.config.ts
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description 루트 워크스페이스 및 AI 하네스 스크립트(scripts/*.mjs) TDD 검증을 위한 Vitest 설정 파일입니다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['scripts/__tests__/**/*.test.ts'],
    globals: false,
  },
});
