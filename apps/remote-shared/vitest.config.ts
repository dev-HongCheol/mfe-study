/**
 * @file vitest.config.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description remote-shared 서비스의 jsdom 기반 단위 테스트(Co-location) 및 통합 테스트(__tests__/) 실행 설정입니다.
 */
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    name: 'remote-shared',
    root: resolve(import.meta.dirname),
    environment: 'jsdom',
    setupFiles: ['./src/testing/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    globals: false,
    css: true,
  },
});
