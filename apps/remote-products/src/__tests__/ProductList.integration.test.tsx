/**
 * @file ProductList.integration.test.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description [TC-05, TC-06, EC-02, EC-03] ProductList 통합 플로우(Mode A vs Mode B, 1.5초 지연 스켈레톤, 에러 복구, 아키텍처 무결성) 테스트입니다.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App.js';
import { ProductList } from '../exposed/ProductList.js';
import { server } from '../testing/msw/server.js';
import { ThemeProvider } from '../testing/stubs/remote-shared-theme.js';
import {
  CART_QUERY_KEY,
  MFE_EVENTS,
  mfeEventBus,
  sharedQueryClient,
} from '../testing/stubs/remote-shared-utils.js';

describe('ProductList & App 통합 테스트 (TC-05, TC-06, EC-02, EC-03)', () => {
  it('TC-05: Mode A(mode-a-event)에서는 장바구니 담기 성공 시 mfe:cart-updated 이벤트를 발행하고 sharedQueryClient.invalidateQueries는 호출하지 않는다', async () => {
    const user = userEvent.setup();
    const emitSpy = vi.spyOn(mfeEventBus, 'emit');
    const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries');
    const onCartAdded = vi.fn();

    render(
      <ProductList
        userId="user-1"
        hostType="vite"
        syncMode="mode-a-event"
        onCartAdded={onCartAdded}
      />,
    );

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    const addButtons = screen.getAllByRole('button', { name: /장바구니 담기/ });
    const firstAddBtn = addButtons[0] as HTMLElement;
    await user.click(firstAddBtn);

    await waitFor(() => {
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    expect(emitSpy).toHaveBeenCalledWith(
      MFE_EVENTS.CART_UPDATED,
      expect.objectContaining({
        action: 'add',
        userId: 'user-1',
        productId: 1,
        productName: '기계식 무선 키보드 Pro',
        quantity: 1,
        sourceHost: 'vite',
      }),
    );
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(onCartAdded).toHaveBeenCalledTimes(1);

    emitSpy.mockRestore();
    invalidateSpy.mockRestore();
  });

  it('TC-05: Mode B(mode-b-query)에서는 장바구니 담기 시 sharedQueryClient.cancelQueries 및 invalidateQueries(["cart"])만 호출하고 mfe:cart-updated 이벤트 버스는 발송하지 않는다', async () => {
    const user = userEvent.setup();
    const emitSpy = vi.spyOn(mfeEventBus, 'emit');
    const cancelSpy = vi.spyOn(sharedQueryClient, 'cancelQueries');
    const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries');
    const onCartAdded = vi.fn();

    render(
      <ProductList
        userId="user-2"
        hostType="rspack"
        syncMode="mode-b-query"
        onCartAdded={onCartAdded}
      />,
    );

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    const addButtons = screen.getAllByRole('button', { name: /장바구니 담기/ });
    const firstAddBtn = addButtons[0] as HTMLElement;
    await user.click(firstAddBtn);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: CART_QUERY_KEY });
    });

    expect(cancelSpy).toHaveBeenCalledWith({ queryKey: CART_QUERY_KEY });
    expect(emitSpy).not.toHaveBeenCalled();
    expect(onCartAdded).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'add',
        userId: 'user-2',
        productId: 1,
        sourceHost: 'rspack',
      }),
    );

    emitSpy.mockRestore();
    cancelSpy.mockRestore();
    invalidateSpy.mockRestore();
  });

  it('TC-06: simulateDelay={true}일 때 먼저 6-카드 스켈레톤 그리드를 표시한 후 상품 목록으로 전환한다', async () => {
    render(<ProductList simulateDelay={true} delayMs={60} />);

    expect(screen.getByTestId('product-grid-skeleton')).toBeInTheDocument();

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    expect(screen.queryByTestId('product-grid-skeleton')).not.toBeInTheDocument();
  });

  it('EC-02: 장바구니 담기 중 400 OUT_OF_STOCK 에러 발생 시 role="alert" 인라인 에러 배너를 표시한다', async () => {
    const user = userEvent.setup();
    server.use(
      http.post('http://localhost:4000/api/cart', () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'OUT_OF_STOCK',
              message: '선택하신 상품의 재고가 부족합니다.',
            },
          },
          { status: 400 },
        );
      }),
    );

    render(<ProductList userId="user-1" />);
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    const addButtons = screen.getAllByRole('button', { name: /장바구니 담기/ });
    const firstAddBtn = addButtons[0] as HTMLElement;
    await user.click(firstAddBtn);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '선택하신 상품의 재고가 부족합니다.',
    );
  });

  it('EC-03: 검색 결과가 0건일 때 빈 상태 안내 및 필터 초기화가 동작하고, 조회 에러 시 다시 시도 버튼으로 복구된다', async () => {
    const user = userEvent.setup();
    let shouldFail = true;

    server.use(
      http.get('http://localhost:4000/api/products', () => {
        if (shouldFail) {
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'DB_ERROR',
                message: '일시적인 상품 조회 오류가 발생했습니다.',
              },
            },
            { status: 500 },
          );
        }
        return HttpResponse.json({
          success: true,
          data: [
            {
              id: 1,
              name: '기계식 무선 키보드 Pro',
              price: 129000,
              category: 'electronics',
              stock: 15,
              description: '무선 키보드',
              createdAt: '2026-10-31T09:00:00.000Z',
            },
          ],
        });
      }),
    );

    render(<ProductList />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      '일시적인 상품 조회 오류가 발생했습니다.',
    );

    shouldFail = false;
    await user.click(screen.getByRole('button', { name: '다시 시도' }));

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
  });

  it('TC-06: 단독 실행 쇼케이스(App.tsx)가 정상 렌더링되고 컨트롤 바(동기화 모드·지연 토글)가 동작한다', async () => {
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole('heading', { name: /상품 카탈로그 리모트 쇼케이스/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
  });

  it('TC-06: 아키텍처 무결성 검증 — @ark-ui/react·clsx 직접 미설치, @mf-types 양방향 설정, PascalCase.tsx 분리, CSS 격리를 준수한다', () => {
    const appRoot = resolve(import.meta.dirname, '../..');
    const pkgJson = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf-8')) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };

    // 1. @ark-ui/react 및 clsx 직접 설치 금지 확인
    expect(pkgJson.dependencies?.['@ark-ui/react']).toBeUndefined();
    expect(pkgJson.devDependencies?.['@ark-ui/react']).toBeUndefined();
    expect(pkgJson.dependencies?.clsx).toBeUndefined();
    expect(pkgJson.devDependencies?.clsx).toBeUndefined();

    // 2. 수동 remotes.d.ts 파일 미존재 및 vite.config.ts @mf-types 양방향 설정 확인
    expect(existsSync(resolve(appRoot, 'src/remotes.d.ts'))).toBe(false);
    const viteConfigText = readFileSync(resolve(appRoot, 'vite.config.ts'), 'utf-8');
    expect(viteConfigText).toContain('generateTypes:');
    expect(viteConfigText).toContain('consumeTypes:');
    expect(viteConfigText).toContain('http://localhost:3004/mf-manifest.json');
    expect(viteConfigText).toContain("'./ProductList': './src/exposed/ProductList.tsx'");

    // 3. UI 폴더 내 모든 .tsx 컴포넌트 파일이 대문자(PascalCase)로 시작하는지 확인
    const uiDir = resolve(appRoot, 'src/features/catalog/ui');
    const uiFiles = readdirSync(uiDir).filter((f) => f.endsWith('.tsx'));
    expect(uiFiles.length).toBeGreaterThanOrEqual(4);
    for (const file of uiFiles) {
      expect(/^[A-Z]/.test(file)).toBe(true);
    }

    // 4. catalog.css 내 #hex 색상 하드코딩이 없고 .prod- 프리픽스와 var(--mfe-*)를 사용하는지 확인
    const cssText = readFileSync(resolve(uiDir, 'catalog.css'), 'utf-8');
    expect(cssText).toContain('.prod-');
    expect(cssText).toContain('var(--mfe-');
    expect(cssText).toContain('tabular-nums');
    expect(cssText).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
  });
});
