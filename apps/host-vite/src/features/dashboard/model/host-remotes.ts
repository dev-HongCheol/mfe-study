/**
 * @file host-remotes.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description host-vite가 소비하는 3대 원격 마이크로 앱(remote_shared, remote_products, remote_cart)의 메타 정보 정본 상수를 정의합니다 ([Study 14 § 3.2]).
 */

/**
 * @description 호스트가 소비하는 원격 모듈의 메타 정보 인터페이스 (RuntimeStatusTab 상단 카드 렌더링용)
 */
export interface RemoteModuleDescriptor {
  /** 원격 모듈 식별 이름 (예: 'remote_cart') */
  remoteName: string;

  /** 화면 표시용 한글 서비스명 */
  label: string;

  /** 원격 개발 서버 포트 번호 */
  port: number;

  /** 공급자 번들러 및 MF 소비 포맷 설명 */
  bundlerLabel: string;

  /** 원격 매니페스트 정본 URL */
  manifestUrl: string;

  /** 소비 중인 노출 경로 목록 */
  consumedPaths: readonly string[];
}

/** host-vite(:3000)가 런타임에 소비하는 3대 원격 모듈 메타 목록 상수 */
export const HOST_REMOTE_DESCRIPTORS: readonly RemoteModuleDescriptor[] = [
  {
    remoteName: 'remote_shared',
    label: '공통 디자인 시스템 · 테마 · 유틸',
    port: 3004,
    bundlerLabel: "Vite 7 (ESM · type: 'module')",
    manifestUrl: 'http://localhost:3004/mf-manifest.json',
    consumedPaths: ['./ui', './theme', './utils'],
  },
  {
    remoteName: 'remote_products',
    label: '상품 카탈로그 도메인 리모트',
    port: 3002,
    bundlerLabel: "Vite 7 (ESM · type: 'module')",
    manifestUrl: 'http://localhost:3002/mf-manifest.json',
    consumedPaths: ['./ProductList'],
  },
  {
    remoteName: 'remote_cart',
    label: '장바구니 도메인 리모트',
    port: 3003,
    bundlerLabel: "Rsbuild / Rspack 1.7 (Global · type: 'var')",
    manifestUrl: 'http://localhost:3003/mf-manifest.json',
    consumedPaths: ['./CartWidget'],
  },
] as const;

/** host-vite와 모든 리모트가 싱글톤으로 공유하는 핵심 의존성 목록 상수 */
export const HOST_SHARED_SINGLETONS: readonly string[] = [
  'react (^19.1.0)',
  'react/jsx-runtime',
  'react/jsx-dev-runtime',
  'react-dom (^19.1.0)',
  'react-dom/client',
  '@tanstack/react-query (^5.74.4)',
] as const;
