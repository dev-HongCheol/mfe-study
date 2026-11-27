/**
 * @file vitest.config.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description host-vite의 jsdom 기반 단독 TDD 실행을 위해 3대 원격 모듈(remote_shared, remote_products, remote_cart)을 로컬 스텁으로 매핑하는 Vitest 설정입니다 ([Study 04 #11]).
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
      'remote_products/ProductList': resolve(
        import.meta.dirname,
        'src/testing/stubs/remote-products.tsx',
      ),
      'remote_cart/CartWidget': resolve(import.meta.dirname, 'src/testing/stubs/remote-cart.tsx'),
    },
  },
  test: {
    name: 'host-vite',
    root: resolve(import.meta.dirname),
    environment: 'jsdom',
    setupFiles: ['./src/testing/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    globals: false,
    css: true,
  },
});
