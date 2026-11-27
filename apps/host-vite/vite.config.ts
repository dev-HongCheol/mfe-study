/**
 * @file vite.config.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description Port 3000 고정, 동종 Vite 리모트(remote_shared:3004, remote_products:3002)와 이종 Rspack 리모트(remote_cart:3003) 동시 소비 및 React 서브패스 3종 포함 6종 싱글톤 공유를 구성하는 Vite 호스트 설정입니다 ([Study 14 § 5]).
 */
import { federation } from '@module-federation/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: 'http://localhost:3000/',
  server: {
    port: 3000,
    strictPort: true,
    cors: true,
    origin: 'http://localhost:3000',
  },
  preview: {
    port: 3000,
    strictPort: true,
    cors: true,
  },
  build: {
    target: 'chrome89',
  },
  plugins: [
    react(),
    federation({
      name: 'host_vite',
      filename: 'remoteEntry.js',
      manifest: false,
      // [이종 번들러·장애 격리 방어] 기본값 version-first는 부팅 시 모든 remoteEntry를 선행 초기화하여
      // remote_cart(:3003, Rsbuild) 오프라인 시 부팅을 막고 remote_shared와 @tanstack/react-query 초기화 레이스를 유발합니다.
      // loaded-first로 호스트 싱글톤을 먼저 확정하고 도메인 리모트는 React.lazy 시점에 on-demand 로드합니다 ([Study 14 § 5]).
      shareStrategy: 'loaded-first',
      dev: {
        // [Study 04 #04 ④] 정적 remotes 구조에서 불필요한 16322 WebSocket 동적 타입 힌트 클라이언트 주입 차단
        disableDynamicRemoteTypeHints: true,
      },
      dts: {
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
        remote_products: {
          type: 'module',
          name: 'remote_products',
          entry: 'http://localhost:3002/mf-manifest.json',
          entryGlobalName: 'remote_products',
          shareScope: 'default',
        },
        // [이종 번들러 방어] remote_cart는 Rsbuild(Rspack) 기반 global 포맷(remoteEntry.type: 'global')이므로 type: 'var' 명시 ([Study 14 § 5])
        remote_cart: {
          type: 'var',
          name: 'remote_cart',
          entry: 'http://localhost:3003/mf-manifest.json',
          entryGlobalName: 'remote_cart',
          shareScope: 'default',
        },
      },
      shared: {
        react: {
          singleton: true,
          requiredVersion: '^19.1.0',
        },
        // [이종 번들러 방어] Vite 호스트와 Rsbuild(Rspack) 리모트 간 React Automatic JSX Transform 서브패스 경합(jsxDEV is not a function) 차단
        'react/jsx-runtime': {
          singleton: true,
          requiredVersion: '^19.1.0',
        },
        'react/jsx-dev-runtime': {
          singleton: true,
          requiredVersion: '^19.1.0',
        },
        'react-dom': {
          singleton: true,
          requiredVersion: '^19.1.0',
        },
        'react-dom/client': {
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
