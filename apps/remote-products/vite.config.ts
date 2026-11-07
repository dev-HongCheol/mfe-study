/**
 * @file vite.config.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description Port 3002 고정, 다중 포트 CORS 허용, remote_shared(3004) 소비 및 ./ProductList 노출 + @mf-types 양방향 동기화를 수행하는 Vite 설정입니다.
 */
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: 'http://localhost:3002/',
  server: {
    port: 3002,
    strictPort: true,
    cors: true,
    origin: 'http://localhost:3002',
  },
  preview: {
    port: 3002,
    strictPort: true,
    cors: true,
  },
  build: {
    target: 'chrome89',
  },
  plugins: [
    react(),
    federation({
      name: 'remote_products',
      filename: 'remoteEntry.js',
      manifest: true,
      dts: {
        generateTypes: {
          tsConfigPath: './tsconfig.json',
          abortOnError: false,
        },
        consumeTypes: {
          typesOnBuild: true,
          abortOnError: false,
        },
      },
      remotes: {
        remote_shared: {
          type: 'module',
          name: 'remote_shared',
          entry: 'http://localhost:3004/mf-manifest.json',
          entryGlobalName: 'remote_shared',
          shareScope: 'default',
        },
      },
      exposes: {
        './ProductList': './src/exposed/ProductList.tsx',
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
