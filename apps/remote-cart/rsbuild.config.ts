/**
 * @file rsbuild.config.ts
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description Port 3003 고정, 다중 포트 CORS 허용, assetPrefix auto, Vite 공급자(remote_shared:3004) 이종 번들러 소비 및 ./CartWidget 노출 + @mf-types 양방향 동기화를 수행하는 Rsbuild(Rspack) 설정입니다.
 */
import { pluginModuleFederation } from '@module-federation/rsbuild-plugin';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  source: {
    entry: {
      index: './src/main.ts',
    },
  },
  html: {
    title: 'MFE Study — 장바구니 원격 앱 (Port 3003 | Rspack)',
  },
  server: {
    port: 3003,
    strictPort: true,
    cors: {
      origin: '*',
    },
  },
  output: {
    // [Study 04 #02] 호스트(3000, 3001)에 마운트될 때도 리모트 에셋·청크가 3003 출처 기준으로 해석되도록 auto 설정
    assetPrefix: 'auto',
  },
  tools: {
    rspack: {
      watchOptions: {
        // [Study 04 #04 ⑥] @mf-types 자동 갱신 시 Rspack 파일 워처의 무한 재컴파일 루프 방지
        ignored: ['**/node_modules/**', '**/@mf-types/**', '**/.mf/**'],
      },
    },
  },
  plugins: [
    pluginReact(),
    pluginModuleFederation({
      name: 'remote_cart',
      filename: 'remoteEntry.js',
      manifest: true,
      dev: {
        // [Study 04 #04 ④] 정적 remotes 구조에서 불필요한 16322 WebSocket 동적 타입 힌트 클라이언트 주입 차단
        disableDynamicRemoteTypeHints: true,
      },
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
        remote_shared: 'remote_shared@http://localhost:3004/mf-manifest.json',
      },
      exposes: {
        './CartWidget': './src/exposed/CartWidget.tsx',
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
