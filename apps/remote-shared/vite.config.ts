/**
 * @file vite.config.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description Port 3004 고정, 다중 포트 CORS 허용 및 Module Federation 2.0 3대 서브패스(./ui, ./theme, ./utils)를 노출하는 Vite 빌드 설정입니다.
 */
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: 'http://localhost:3004/',
  server: {
    port: 3004,
    strictPort: true,
    cors: true,
    origin: 'http://localhost:3004',
  },
  preview: {
    port: 3004,
    strictPort: true,
    cors: true,
  },
  build: {
    target: 'chrome89',
  },
  plugins: [
    react(),
    federation({
      name: 'remote_shared',
      filename: 'remoteEntry.js',
      manifest: true,
      dts: {
        generateTypes: true,
        tsConfigPath: './tsconfig.json',
      },
      exposes: {
        './ui': './src/exposed/ui.ts',
        './theme': './src/exposed/theme.ts',
        './utils': './src/exposed/utils.ts',
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^19.1.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^19.1.0',
        },
        '@tanstack/react-query': {
          singleton: true,
          requiredVersion: '^5.74.4',
        },
      },
    }),
  ],
});
