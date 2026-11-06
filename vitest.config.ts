/**
 * @file vitest.config.ts
 * @app mfe-study-root (Scope: root)
 * @exposed false
 * @description 루트 하네스 스크립트(node) 및 각 마이크로 앱(node / jsdom) 프로젝트를 일괄 실행하는 통합 Vitest 설정입니다.
 */
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'root-harness',
          environment: 'node',
          include: ['scripts/__tests__/**/*.test.ts'],
          globals: false,
        },
      },
      'apps/api-server/vitest.config.ts',
      'apps/remote-shared/vitest.config.ts',
    ],
  },
});
