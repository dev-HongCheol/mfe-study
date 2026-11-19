/**
 * @file vitest.config.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description remote-products의 jsdom 기반 TDD 테스트 및 remote_shared/* 로컬 스텁 alias 매핑 설정입니다 ([Study 04 #11]).
 */
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'remote_shared/ui': resolve(import.meta.dirname, 'src/testing/stubs/remote-shared-ui.tsx'),
      'remote_shared/theme': resolve(
        import.meta.dirname,
        'src/testing/stubs/remote-shared-theme.tsx',
      ),
      'remote_shared/utils': resolve(
        import.meta.dirname,
        'src/testing/stubs/remote-shared-utils.ts',
      ),
    },
  },
  test: {
    name: 'remote-products',
    root: resolve(import.meta.dirname),
    environment: 'jsdom',
    setupFiles: ['./src/testing/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    globals: false,
    css: true,
  },
});
