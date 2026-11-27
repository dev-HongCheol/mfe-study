/**
 * @file main.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description Module Federation eager consumption 및 DeferredRemoteProxy 경쟁 조건을 방지하는 2단 비동기 진입점입니다. remote_shared 3대 서브패스만 선행 프리로드하고 도메인 리모트(products/cart)는 컴포넌트 레벨 React.lazy로 격리합니다 ([Study 04 #01, Study 14 § 4.1]).
 */

// [분기 설명] remote_shared 3대 서브패스만 선행 프리로드하고, remote_products·remote_cart는
// 장애 격리를 위해 여기서 프리로드하지 않고 DashboardWorkspace의 React.lazy + RemoteErrorBoundary로 격리합니다.
// 프리로드 실패 시에만 폴백 모듈(bootstrap-fallback.ts + CSS)을 지연 로드해 정상 부팅 경로와 책임을 분리합니다.
void Promise.all([
  import('remote_shared/utils'),
  import('remote_shared/theme'),
  import('remote_shared/ui'),
])
  .then(() => import('./bootstrap'))
  .catch((err: unknown) => {
    console.error('[host-vite] 부트스트랩 초기화 실패:', err);
    void import('./bootstrap-fallback').then(({ renderBootstrapFallback }) => {
      renderBootstrapFallback(err);
    });
  });
