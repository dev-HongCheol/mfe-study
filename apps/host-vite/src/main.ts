/**
 * @file main.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description Module Federation eager consumption 및 DeferredRemoteProxy 경쟁 조건을 방지하는 2단 비동기 진입점입니다. remote_shared 3대 서브패스만 선행 프리로드하고 도메인 리모트(products/cart)는 컴포넌트 레벨 React.lazy로 격리합니다 ([Study 04 #01, Study 14 § 4.1]).
 */

/**
 * remote_shared(Port 3004) 서버 자체가 오프라인일 때 백지 화면 대신 순수 DOM 폴백 안내를 렌더링합니다.
 *
 * @param err - 프리로드 단계에서 포착된 예외 객체
 */
function renderBootstrapFallback(err: unknown): void {
  const rootElement = document.getElementById('root');
  // [분기 설명] DOM 컨테이너가 없는 환경에서는 콘솔 로그만 남기고 종료합니다.
  if (!rootElement) {
    return;
  }

  const message = err instanceof Error ? err.message : String(err);

  // [보안 준수] innerHTML 대신 textContent와 DOM API만 사용해 XSS 위험을 원천 차단합니다.
  rootElement.replaceChildren();

  const container = document.createElement('section');
  container.setAttribute('role', 'alert');
  container.style.cssText =
    'max-width:640px;margin:48px auto;padding:24px;border-radius:12px;border:1px solid #dc2626;background:#ffffff;color:#0f172a;font-family:system-ui,sans-serif;';

  const heading = document.createElement('h1');
  heading.style.cssText = 'margin:0 0 12px;font-size:18px;color:#dc2626;';
  heading.textContent = '공통 디자인 시스템 서버(remote-shared :3004)에 연결할 수 없습니다';

  const desc = document.createElement('p');
  desc.style.cssText = 'margin:0 0 12px;font-size:14px;line-height:1.6;color:#475569;';
  desc.textContent =
    '호스트 껍데기 부팅에 필요한 remote-shared(Port 3004) 서버가 실행 중인지 확인한 뒤 다시 시도해 주세요.';

  const detail = document.createElement('pre');
  detail.style.cssText =
    'margin:0 0 16px;padding:12px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:12px;white-space:pre-wrap;';
  detail.textContent = message;

  const reloadBtn = document.createElement('button');
  reloadBtn.type = 'button';
  reloadBtn.textContent = '페이지 새로고침';
  reloadBtn.style.cssText =
    'padding:8px 16px;border-radius:8px;border:none;background:#4f46e5;color:#ffffff;font-size:13px;font-weight:600;cursor:pointer;';
  reloadBtn.addEventListener('click', () => {
    window.location.reload();
  });

  container.append(heading, desc, detail, reloadBtn);
  rootElement.appendChild(container);
}

// [분기 설명] remote_shared 3대 서브패스만 선행 프리로드하고, remote_products·remote_cart는
// 장애 격리를 위해 여기서 프리로드하지 않고 DashboardWorkspace의 React.lazy + RemoteErrorBoundary로 격리합니다.
void Promise.all([
  import('remote_shared/utils'),
  import('remote_shared/theme'),
  import('remote_shared/ui'),
])
  .then(() => import('./bootstrap'))
  .catch((err: unknown) => {
    console.error('[host-vite] 부트스트랩 초기화 실패:', err);
    renderBootstrapFallback(err);
  });
