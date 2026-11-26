/**
 * @file HostDashboard.integration.test.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description [TC-01~TC-07, EC-01~EC-03] host-vite 대시보드의 원격 지연 로딩, 인증·테마·모드 전파, 장애 격리 및 [다시 시도] 복구, Suspense 폴백, 아키텍처 정적 회귀 통합 테스트입니다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { type ReactElement, lazy } from 'react';
import { ThemeProvider } from 'remote_shared/theme';
import { MFE_EVENTS, mfeEventBus, sharedQueryClient } from 'remote_shared/utils';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { RemoteWidgetSlot } from '../features/dashboard/ui/RemoteWidgetSlot';
import { MOCK_API_BASE_URL } from '../testing/msw/handlers';
import { server } from '../testing/msw/server';
import { setRemoteCartStubError } from '../testing/stubs/remote-cart';

describe('host-vite 대시보드 통합 테스트 (TC-01~TC-07, EC-01~EC-03)', () => {
  it('TC-01: 초기 마운트 시 Vite Host(:3000) 헤더와 ProductList·CartWidget 2대 리모트가 비로그인 기본값으로 결합된다', async () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    expect(screen.getByText(/Vite Host/)).toBeInTheDocument();
    expect(screen.getByText(/Port 3000/)).toBeInTheDocument();

    const productsEl = await screen.findByTestId('remote-products-stub');
    const cartEl = await screen.findByTestId('remote-cart-stub');

    expect(productsEl).toHaveAttribute('data-host-type', 'vite');
    expect(productsEl).toHaveAttribute('data-user-id', 'guest');
    expect(productsEl).toHaveAttribute('data-sync-mode', 'mode-a-event');
    expect(productsEl).toHaveAttribute('data-simulate-delay', 'false');

    expect(cartEl).toHaveAttribute('data-host-type', 'vite');
    expect(cartEl).toHaveAttribute('data-user-id', 'guest');
    expect(cartEl).toHaveAttribute('data-sync-mode', 'mode-a-event');
    expect(cartEl).toHaveAttribute('data-simulate-delay', 'false');
  });

  it('TC-02: 사용자 로그인·전환 및 게스트 복귀 시 POST /api/auth/login, 스토리지, AUTH_CHANGED 이벤트 및 양쪽 리모트 userId가 동기화된다', async () => {
    const user = userEvent.setup();
    const authEvents: Array<{ userId: string; sourceId?: string }> = [];
    const unsubscribe = mfeEventBus.subscribe(MFE_EVENTS.AUTH_CHANGED, (payload, meta) => {
      authEvents.push({ userId: payload.userId, sourceId: meta?.sourceId });
    });

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    await screen.findByTestId('remote-products-stub');
    const userSelect = await screen.findByLabelText('로그인 사용자 선택');

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /홍길동/ })).toBeInTheDocument();
    });

    await user.selectOptions(userSelect, 'user-1');

    await waitFor(() => {
      expect(screen.getByTestId('remote-products-stub')).toHaveAttribute('data-user-id', 'user-1');
      expect(screen.getByTestId('remote-cart-stub')).toHaveAttribute('data-user-id', 'user-1');
    });

    expect(window.localStorage.getItem('mfe:host-vite:auth-session')).toContain('user-1');
    expect(authEvents[0]?.userId).toBe('user-1');
    expect(authEvents[0]?.sourceId).toMatch(/^host-vite:/);

    await user.selectOptions(userSelect, 'user-2');
    await waitFor(() => {
      expect(screen.getByTestId('remote-products-stub')).toHaveAttribute('data-user-id', 'user-2');
      expect(screen.getByTestId('remote-cart-stub')).toHaveAttribute('data-user-id', 'user-2');
    });

    await user.selectOptions(userSelect, '__guest__');
    await waitFor(() => {
      expect(screen.getByTestId('remote-products-stub')).toHaveAttribute('data-user-id', 'guest');
      expect(screen.getByTestId('remote-cart-stub')).toHaveAttribute('data-user-id', 'guest');
    });
    expect(window.localStorage.getItem('mfe:host-vite:auth-session')).toBeNull();

    unsubscribe();
  });

  it('TC-03 / TC-04: 테마·1.5초 지연 토글 및 MfeInspector Mode B 전환과 sharedQueryClient 캐시 관찰이 연동된다', async () => {
    const user = userEvent.setup();

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    await screen.findByTestId('remote-products-stub');

    // 테마 전환 + 지연 토글
    await user.selectOptions(screen.getByLabelText('실시간 테마 선택'), 'dark');
    expect(document.documentElement.dataset.mfeTheme).toBe('dark');

    await user.click(screen.getByRole('button', { name: /1\.5초 지연 시뮬레이션/ }));
    expect(screen.getByTestId('remote-products-stub')).toHaveAttribute(
      'data-simulate-delay',
      'true',
    );
    expect(screen.getByTestId('remote-cart-stub')).toHaveAttribute('data-simulate-delay', 'true');

    // Mode B 전환 및 이벤트 로그 + 캐시 관찰
    await user.click(screen.getByRole('button', { name: /Mode B/ }));
    expect(screen.getByTestId('remote-products-stub')).toHaveAttribute(
      'data-sync-mode',
      'mode-b-query',
    );
    expect(screen.getByTestId('remote-cart-stub')).toHaveAttribute(
      'data-sync-mode',
      'mode-b-query',
    );
    expect(screen.getByText(/mfe:sync-mode-changed/)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /런타임 · 캐시 상태/ }));
    act(() => {
      sharedQueryClient.setQueryData(['cart', 'user-1'], [{ id: 10 }]);
    });
    expect(screen.getByText(/\["cart","user-1"\]/)).toBeInTheDocument();
  });

  it('TC-06: CartWidget 장애 시 장바구니 영역만 RemoteErrorBoundary 폴백으로 격리되고 ProductList는 유지되며 [다시 시도]로 복구된다', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    setRemoteCartStubError('remote-cart(:3003) 일시 장애 시뮬레이션');

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    // 좌측 상품 목록은 장애 없이 정상 렌더링 유지
    expect(await screen.findByTestId('remote-products-stub')).toBeInTheDocument();

    // 우측 장바구니 영역만 독립 폴백 UI 표시
    expect(screen.getByRole('alert')).toHaveTextContent('remote-cart(:3003) 일시 장애 시뮬레이션');
    expect(screen.queryByTestId('remote-cart-stub')).not.toBeInTheDocument();

    // 장애 해소 후 [다시 시도] 클릭 시 장바구니 영역만 복구
    setRemoteCartStubError(null);
    await user.click(screen.getByRole('button', { name: /다시 시도/ }));

    expect(await screen.findByTestId('remote-cart-stub')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('EC-01: POST /api/auth/login 실패 시 세션을 오염시키지 않고 에러 배너를 표시한다', async () => {
    const user = userEvent.setup();
    server.use(
      http.post(`${MOCK_API_BASE_URL}/auth/login`, () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: '인증 서버 일시 오류입니다.',
            },
          },
          { status: 500 },
        ),
      ),
    );

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    await screen.findByTestId('remote-products-stub');
    const userSelect = await screen.findByLabelText('로그인 사용자 선택');
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /홍길동/ })).toBeInTheDocument();
    });

    await user.selectOptions(userSelect, 'user-1');

    expect(await screen.findByRole('alert')).toHaveTextContent('인증 서버 일시 오류입니다.');
    expect(window.localStorage.getItem('mfe:host-vite:auth-session')).toBeNull();
    expect(screen.getByTestId('remote-products-stub')).toHaveAttribute('data-user-id', 'guest');
  });

  it('EC-02: 오염된 localStorage 세션·환경설정 JSON이 있어도 크래시 없이 기본 비로그인 상태로 부팅된다', async () => {
    window.localStorage.setItem('mfe:host-vite:auth-session', '{invalid-json');
    window.localStorage.setItem('mfe:host-vite:preferences', '{"syncMode":"broken"}');

    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    const productsEl = await screen.findByTestId('remote-products-stub');
    expect(productsEl).toHaveAttribute('data-user-id', 'guest');
    expect(productsEl).toHaveAttribute('data-sync-mode', 'mode-a-event');
  });

  it('EC-03: RemoteWidgetSlot은 원격 지연 로딩 동안 Suspense Skeleton 폴백을 표시하고 완료 후 본문을 렌더링한다', async () => {
    const deferred: { resolve?: (mod: { default: () => ReactElement }) => void } = {};
    const LazyWidget = lazy(
      () =>
        new Promise<{ default: () => ReactElement }>((resolvePromise) => {
          deferred.resolve = resolvePromise;
        }),
    );

    render(
      <RemoteWidgetSlot remoteLabel="상품 카탈로그" remotePort={3002} loadingLines={2}>
        <LazyWidget />
      </RemoteWidgetSlot>,
    );

    expect(screen.getByText(/상품 카탈로그.*불러오는 중/)).toBeInTheDocument();

    act(() => {
      deferred.resolve?.({
        default: () => <div data-testid="lazy-loaded-widget">지연 로드 완료</div>,
      });
    });

    expect(await screen.findByTestId('lazy-loaded-widget')).toBeInTheDocument();
  });

  it('TC-07: 정적 아키텍처·무-Shim·이종 번들러 설정·스타일 격리 불변식을 만족한다', () => {
    const appRoot = resolve(import.meta.dirname, '../..');
    const pkgJson = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const viteConfig = readFileSync(resolve(appRoot, 'vite.config.ts'), 'utf-8');
    const viteEnv = readFileSync(resolve(appRoot, 'src/vite-env.d.ts'), 'utf-8');
    const dashboardCss = readFileSync(
      resolve(appRoot, 'src/features/dashboard/ui/host-dashboard.css'),
      'utf-8',
    );

    // 1. @ark-ui/react, clsx 직접 설치 0건
    expect(pkgJson.dependencies?.['@ark-ui/react']).toBeUndefined();
    expect(pkgJson.devDependencies?.['@ark-ui/react']).toBeUndefined();
    expect(pkgJson.dependencies?.clsx).toBeUndefined();
    expect(pkgJson.devDependencies?.clsx).toBeUndefined();

    // 2. 임시 @ark-ui/react Shim 0줄
    expect(viteEnv).not.toMatch(/declare\s+module/);
    expect(viteEnv).not.toContain('@ark-ui/react');

    // 3. vite.config.ts 이종 번들러(remote_cart type: 'var'), React 서브패스 3종, disableDynamicRemoteTypeHints 검증
    expect(viteConfig).toContain("type: 'module'");
    expect(viteConfig).toContain("type: 'var'");
    expect(viteConfig).toContain("'react/jsx-runtime'");
    expect(viteConfig).toContain("'react/jsx-dev-runtime'");
    expect(viteConfig).toContain("'react-dom/client'");
    expect(viteConfig).toContain('disableDynamicRemoteTypeHints: true');

    // 4. host-dashboard.css 전역 태그 선택자 및 #hex 하드코딩 0건
    expect(dashboardCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(dashboardCss).not.toMatch(/^\s*(html|body|button|h[1-6]|p|a|div|span|table)\s*\{/m);
  });
});
