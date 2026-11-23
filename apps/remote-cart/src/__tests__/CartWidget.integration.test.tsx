/**
 * @file CartWidget.integration.test.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description [TC-05, TC-06, EC-01~EC-04] CartWidget 통합 플로우, Mode A vs Mode B 상태 동기화 대칭 비교, 비인증 차단, CSS 격리 토글, 좀비 리스너 정리 및 아키텍처 무결성 통합 테스트입니다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import * as remoteSharedUtils from 'remote_shared/utils';
import { CART_QUERY_KEY, MFE_EVENTS, mfeEventBus, sharedQueryClient } from 'remote_shared/utils';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { CartWidget } from '../exposed/CartWidget';
import { seedExtraMockCartItem } from '../testing/msw/handlers';
import { server } from '../testing/msw/server';

/** 앱 루트 절대 경로 */
const APP_ROOT = resolve(import.meta.dirname, '../..');

/**
 * 지정 디렉터리 하위의 모든 .tsx 파일명을 재귀 수집합니다.
 *
 * @param dirPath - 탐색할 디렉터리 절대 경로
 * @returns 파일명 배열
 */
function collectTsxFileNames(dirPath: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = resolve(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectTsxFileNames(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      results.push(entry.name);
    }
  }
  return results;
}

describe('CartWidget & App 통합 테스트 (TC-05, TC-06, EC-01~EC-04)', () => {
  it('TC-05: Mode A(mode-a-event)에서는 mfe:cart-updated 수신 시 자체 QueryClient를 재조회하고 삭제 시 이벤트만 발행한다', async () => {
    const user = userEvent.setup();
    const emitSpy = vi.spyOn(mfeEventBus, 'emit');
    const sharedInvalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries');

    render(<CartWidget userId="user-1" hostType="rspack" syncMode="mode-a-event" />);

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    expect(screen.getByText('213,000원')).toBeInTheDocument();

    // 외부 앱(remote-products)이 백엔드 DB에 새 상품을 추가하고 mfe:cart-updated 이벤트를 발행한 상황 시뮬레이션
    seedExtraMockCartItem({
      userId: 'user-1',
      productId: 2,
      productName: '초경량 버티컬 마우스 Air',
      price: 68000,
      category: 'electronics',
      quantity: 1,
      addedFromHost: 'vite',
      createdAt: '2026-11-23 14:20:00',
    });

    act(() => {
      mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, {
        action: 'add',
        userId: 'user-1',
        productId: 2,
        productName: '초경량 버티컬 마우스 Air',
        quantity: 1,
        sourceHost: 'vite',
        timestamp: new Date().toISOString(),
      });
    });

    expect(await screen.findByText('초경량 버티컬 마우스 Air')).toBeInTheDocument();
    expect(screen.getByText('281,000원')).toBeInTheDocument();

    emitSpy.mockClear();
    sharedInvalidateSpy.mockClear();

    // 첫 번째 항목 삭제 클릭
    const [firstDeleteBtn] = screen.getAllByRole('button', { name: /삭제/i });
    expect(firstDeleteBtn).toBeDefined();
    if (firstDeleteBtn) {
      await user.click(firstDeleteBtn);
    }

    await waitFor(() => {
      expect(screen.queryByText('기계식 무선 키보드 Pro')).not.toBeInTheDocument();
    });

    expect(emitSpy).toHaveBeenCalledWith(
      MFE_EVENTS.CART_UPDATED,
      expect.objectContaining({
        action: 'remove',
        userId: 'user-1',
        productId: 1,
        sourceHost: 'rspack',
      }),
    );
    expect(sharedInvalidateSpy).not.toHaveBeenCalled();

    emitSpy.mockRestore();
    sharedInvalidateSpy.mockRestore();
  });

  it('TC-05: Mode B(mode-b-query)에서는 createMfeQueryClient를 호출하지 않고 sharedQueryClient 캐시 무효화만으로 자동 동기화한다', async () => {
    const user = userEvent.setup();
    const createClientSpy = vi.spyOn(remoteSharedUtils, 'createMfeQueryClient');
    const emitSpy = vi.spyOn(mfeEventBus, 'emit');
    const cancelSpy = vi.spyOn(sharedQueryClient, 'cancelQueries');
    const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries');

    render(<CartWidget userId="user-1" hostType="rspack" syncMode="mode-b-query" />);

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    expect(createClientSpy).not.toHaveBeenCalled();

    // 외부에서 상품 추가 후 이벤트만 발행해도 Mode B는 이벤트 리스너로 재조회하지 않고,
    // sharedQueryClient.invalidateQueries 호출 시 자동 재조회해야 함
    seedExtraMockCartItem({
      userId: 'user-1',
      productId: 3,
      productName: '4K UHD 데스크 모니터 27인치',
      price: 389000,
      category: 'electronics',
      quantity: 1,
      addedFromHost: 'vite',
      createdAt: '2026-11-23 14:30:00',
    });

    await act(async () => {
      await sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    });

    expect(await screen.findByText('4K UHD 데스크 모니터 27인치')).toBeInTheDocument();

    emitSpy.mockClear();
    cancelSpy.mockClear();
    invalidateSpy.mockClear();

    // [+1] 수량 증가 클릭 시 cancelQueries + invalidateQueries만 호출되고 CustomEvent는 발행하지 않음
    const [firstIncrementBtn] = screen.getAllByRole('button', { name: /\+1/i });
    expect(firstIncrementBtn).toBeDefined();
    if (firstIncrementBtn) {
      await user.click(firstIncrementBtn);
    }

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith({ queryKey: CART_QUERY_KEY });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: CART_QUERY_KEY });
    });
    expect(emitSpy).not.toHaveBeenCalled();

    createClientSpy.mockRestore();
    emitSpy.mockRestore();
    cancelSpy.mockRestore();
    invalidateSpy.mockRestore();
  });

  it('EC-01: 비로그인(userId 미전달/null) 시 GET /api/cart를 0회 차단하고 mfe:auth-changed 수신 시 정상 조회한다', async () => {
    let fetchCount = 0;
    server.use(
      http.get('http://localhost:4000/api/cart', ({ request }) => {
        fetchCount += 1;
        const userId = new URL(request.url).searchParams.get('userId');
        return HttpResponse.json({
          success: true,
          data:
            userId === 'user-1'
              ? [
                  {
                    id: 1,
                    userId: 'user-1',
                    productId: 1,
                    productName: '기계식 무선 키보드 Pro',
                    price: 129000,
                    category: 'electronics',
                    quantity: 1,
                    addedFromHost: 'vite',
                    createdAt: '2026-11-23 14:00:00',
                  },
                ]
              : [],
        });
      }),
    );

    render(<CartWidget />);

    expect(screen.getByText(/로그인 후 장바구니를 확인할 수 있습니다/i)).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 30));
    expect(fetchCount).toBe(0);

    act(() => {
      mfeEventBus.emit(MFE_EVENTS.AUTH_CHANGED, {
        userId: 'user-1',
        username: '홍길동 (VIP)',
        token: 'mock-token-1',
        timestamp: new Date().toISOString(),
      });
    });

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    expect(fetchCount).toBeGreaterThanOrEqual(1);
  });

  it('EC-02: 수량 [+1] 증가 시 백엔드 400 OUT_OF_STOCK 에러를 인라인 role="alert" 배너로 안전하게 표시한다', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('http://localhost:4000/api/cart', () =>
        HttpResponse.json(
          {
            success: false,
            error: {
              code: 'OUT_OF_STOCK',
              message: '선택하신 상품의 재고가 부족합니다.',
            },
          },
          { status: 400 },
        ),
      ),
    );

    render(<CartWidget userId="user-1" syncMode="mode-a-event" />);
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    const [firstIncrementBtn] = screen.getAllByRole('button', { name: /\+1/i });
    expect(firstIncrementBtn).toBeDefined();
    if (firstIncrementBtn) {
      await user.click(firstIncrementBtn);
    }

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '선택하신 상품의 재고가 부족합니다.',
    );
    expect(firstIncrementBtn).not.toBeDisabled();
  });

  it('EC-03: 빈 장바구니(user-2) 안내와 GET /api/cart 500 장애 시 [다시 시도] 복구를 검증한다', async () => {
    const user = userEvent.setup();

    const { unmount } = render(<CartWidget userId="user-2" syncMode="mode-a-event" />);
    expect(await screen.findByText(/장바구니가 비어 있습니다/i)).toBeInTheDocument();
    unmount();

    let attempt = 0;
    server.use(
      http.get('http://localhost:4000/api/cart', () => {
        attempt += 1;
        if (attempt === 1) {
          return HttpResponse.json(
            {
              success: false,
              error: { code: 'INTERNAL_ERROR', message: '일시적인 서버 장애가 발생했습니다.' },
            },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          success: true,
          data: [
            {
              id: 1,
              userId: 'user-1',
              productId: 1,
              productName: '기계식 무선 키보드 Pro',
              price: 129000,
              category: 'electronics',
              quantity: 1,
              addedFromHost: 'vite',
              createdAt: '2026-11-23 14:00:00',
            },
          ],
        });
      }),
    );

    render(<CartWidget userId="user-1" syncMode="mode-a-event" />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '일시적인 서버 장애가 발생했습니다.',
    );

    await user.click(screen.getByRole('button', { name: /다시 시도/i }));
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
  });

  it('EC-04: Mode A에서 컴포넌트 언마운트 후 mfe:cart-updated 이벤트를 발행해도 추가 조회가 0회다 (좀비 리스너 차단)', async () => {
    let fetchCount = 0;
    server.use(
      http.get('http://localhost:4000/api/cart', () => {
        fetchCount += 1;
        return HttpResponse.json({ success: true, data: [] });
      }),
    );

    const { unmount } = render(<CartWidget userId="user-1" syncMode="mode-a-event" />);
    await waitFor(() => {
      expect(fetchCount).toBe(1);
    });

    unmount();

    act(() => {
      for (let i = 0; i < 3; i += 1) {
        mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, {
          action: 'add',
          userId: 'user-1',
          productId: 1,
          sourceHost: 'vite',
          timestamp: new Date().toISOString(),
        });
      }
    });

    await new Promise((r) => setTimeout(r, 30));
    expect(fetchCount).toBe(1);
  });

  it('TC-06: 지연 스켈레톤, cssIsolated 토글, 단독 실행 쇼케이스(App) 및 5대 아키텍처 무결성을 검증한다', async () => {
    const { container, unmount } = render(
      <CartWidget
        userId="user-1"
        syncMode="mode-a-event"
        simulateDelay={true}
        delayMs={40}
        cssIsolated={false}
      />,
    );

    expect(screen.getByTestId('cart-skeleton')).toBeInTheDocument();
    expect(container.querySelector('[data-css-isolated="false"]')).not.toBeNull();
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    unmount();

    // 단독 실행 쇼케이스 렌더링 및 [샘플 상품 담기 (POST /api/cart)] 반복 테스트 검증
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByText(/장바구니 원격 앱/i)).toBeInTheDocument();
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /샘플 상품 담기/i }));
    await waitFor(() => {
      expect(screen.getByText(/단가 129,000원 × 2개/)).toBeInTheDocument();
    });

    // 정적 아키텍처 무결성 5대 검증
    const pkgJson = JSON.parse(readFileSync(resolve(APP_ROOT, 'package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const allDeps = { ...pkgJson.dependencies, ...pkgJson.devDependencies };
    expect(allDeps['@ark-ui/react']).toBeUndefined();
    expect(allDeps.clsx).toBeUndefined();

    const rsbuildConfig = readFileSync(resolve(APP_ROOT, 'rsbuild.config.ts'), 'utf-8');
    expect(rsbuildConfig).toContain('remote_shared');
    expect(rsbuildConfig).toContain('./CartWidget');
    expect(rsbuildConfig).toContain('disableDynamicRemoteTypeHints: true');
    expect(rsbuildConfig).toContain('watchOptions');
    expect(rsbuildConfig).toContain('@mf-types');
    expect(rsbuildConfig).toContain("'react/jsx-runtime'");
    expect(rsbuildConfig).toContain("'react/jsx-dev-runtime'");
    expect(rsbuildConfig).toContain("'react-dom/client'");

    const envDts = readFileSync(resolve(APP_ROOT, 'src/rsbuild-env.d.ts'), 'utf-8');
    expect(envDts).not.toContain('@ark-ui/react');

    const tsxFiles = collectTsxFileNames(resolve(APP_ROOT, 'src'));
    for (const fileName of tsxFiles) {
      // 테스트 스텁 파일(remote-shared-*.tsx)을 제외한 모든 컴포넌트 .tsx는 PascalCase
      if (fileName.startsWith('remote-shared-') || fileName === 'bootstrap.tsx') {
        continue;
      }
      expect(/^[A-Z]/.test(fileName)).toBe(true);
    }

    const cartCss = readFileSync(resolve(APP_ROOT, 'src/features/cart/ui/cart.css'), 'utf-8');
    expect(cartCss).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    expect(cartCss).not.toMatch(/^\s*(body|html|button|h[1-5]|\*)\s*\{/m);
  });
});
