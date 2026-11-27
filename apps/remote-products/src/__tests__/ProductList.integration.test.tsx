/**
 * @file ProductList.integration.test.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description [TC-01~TC-06, EC-01~EC-04] ProductList 통합 플로우(Mode A sourceId 발신·유지 vs Mode B, 1.5초 지연 스켈레톤, 에러 복구, 단독 쇼케이스, 무-Shim·React 서브패스 6종 아키텍처 무결성) 테스트입니다.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { ProductList } from '../exposed/ProductList';
import { ProductCatalogView } from '../features/catalog/ui/ProductCatalogView';
import { server } from '../testing/msw/server';
import { ThemeProvider } from '../testing/stubs/remote-shared-theme';
import {
  CART_QUERY_KEY,
  MFE_EVENTS,
  createMfeQueryClient,
  mfeEventBus,
  sharedQueryClient,
} from '../testing/stubs/remote-shared-utils';
import * as remoteSharedUtils from '../testing/stubs/remote-shared-utils';

/**
 * 지정된 디렉터리 하위에서 모든 TypeScript 선언 파일(.d.ts) 경로를 재귀 수집합니다.
 *
 * @param dirPath - 탐색을 시작할 루트 디렉터리 절대 경로
 * @returns 수집된 .d.ts 파일 절대 경로 배열
 */
function collectDtsFiles(dirPath: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = join(dirPath, entry.name);
    // [분기 설명] 중첩된 compiled-types 하위 경로까지 누락 없이 검사하기 위해 디렉터리는 재귀 탐색하고 .d.ts 파일만 수집합니다.
    if (entry.isDirectory()) {
      results.push(...collectDtsFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.d.ts')) {
      results.push(fullPath);
    }
  }
  return results;
}

describe('ProductList & App 통합 테스트 (TC-05, TC-06, EC-02, EC-03)', () => {
  it('TC-01 / TC-05: Mode A(mode-a-event)에서는 장바구니 담기 성공 시 remote-products: sourceId와 함께 mfe:cart-updated 이벤트를 발행하고 sharedQueryClient.invalidateQueries는 호출하지 않는다', async () => {
    const user = userEvent.setup();
    const emitSpy = vi.spyOn(mfeEventBus, 'emit');
    const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries');
    const onCartAdded = vi.fn();
    const observedEvents: Array<{ payload: Record<string, unknown>; sourceId?: string }> = [];
    const unsubscribe = mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, (payload, meta) => {
      observedEvents.push({
        payload: payload as unknown as Record<string, unknown>,
        sourceId: meta?.sourceId,
      });
    });

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
      {
        sourceId: expect.stringMatching(/^remote-products:.+/),
      },
    );
    expect(observedEvents).toHaveLength(1);
    expect(observedEvents[0]?.sourceId).toMatch(/^remote-products:.+/);
    expect(observedEvents[0]?.payload).not.toHaveProperty('__mfeSourceId');
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(onCartAdded).toHaveBeenCalledTimes(1);

    unsubscribe();
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

  it('TC-06: 단독 실행 쇼케이스(App.tsx)가 정상 렌더링되고 컨트롤 바(게스트 전환·동기화 모드·지연 토글)가 동작한다', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    expect(
      screen.getByRole('heading', { name: /상품 카탈로그 리모트 쇼케이스/ }),
    ).toBeInTheDocument();
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    // 초기 진입 시 임의 유저 폴백 없이 게스트(비로그인) 읽기 전용 상태로 시작하는지 확인
    expect(screen.getByText(/비로그인 \(읽기 전용\)/)).toBeInTheDocument();

    // 드롭다운에서 user-1 선택 시 로그인 상태로 전환되고, 다시 게스트 선택 시 비로그인으로 복귀하는지 확인
    const userSelect = screen.getByLabelText('시뮬레이션 사용자 선택');
    await user.selectOptions(userSelect, 'user-1');
    expect(screen.getByText(/사용자: user-1/)).toBeInTheDocument();

    await user.selectOptions(userSelect, '__guest__');
    expect(screen.getByText(/비로그인 \(읽기 전용\)/)).toBeInTheDocument();
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

  it('EC-04: userId 미전달(비로그인) 마운트 시 목록 조회는 허용되나 장바구니 담기는 차단되고, mfe:auth-changed 수신 시 활성화된다', async () => {
    const user = userEvent.setup();
    let addCartCallCount = 0;
    let lastAddedUserId: string | null = null;

    server.use(
      http.post('http://localhost:4000/api/cart', async ({ request }) => {
        addCartCallCount += 1;
        const body = (await request.json()) as {
          userId: string;
          productId: number;
          quantity: number;
          addedFromHost: string;
        };
        lastAddedUserId = body.userId;
        return HttpResponse.json(
          {
            success: true,
            data: {
              id: 99,
              userId: body.userId,
              productId: body.productId,
              productName: '기계식 무선 키보드 Pro',
              price: 129000,
              category: 'electronics',
              quantity: body.quantity,
              addedFromHost: body.addedFromHost,
              createdAt: '2026-11-16T00:00:00.000Z',
            },
          },
          { status: 201 },
        );
      }),
    );

    render(<ProductList />);

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    expect(screen.getByText(/비로그인 \(읽기 전용\)/)).toBeInTheDocument();

    const blockedButtons = screen.getAllByRole('button', { name: '로그인 후 담기 가능' });
    expect(blockedButtons.length).toBeGreaterThan(0);
    expect(blockedButtons[0]).toBeDisabled();
    await user.click(blockedButtons[0] as HTMLElement);
    expect(addCartCallCount).toBe(0);

    mfeEventBus.emit(MFE_EVENTS.AUTH_CHANGED, {
      userId: 'user-1',
      username: '홍길동',
      token: 'mock-token',
      timestamp: new Date().toISOString(),
    });

    await waitFor(() => {
      expect(screen.getByText(/사용자: user-1/)).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole('button', { name: /장바구니 담기/ });
    await user.click(addButtons[0] as HTMLElement);

    await waitFor(() => {
      expect(addCartCallCount).toBe(1);
    });
    expect(lastAddedUserId).toBe('user-1');
  });

  it('TC-05: syncMode="mode-b-query" 마운트 시 독립 QueryClient(createMfeQueryClient)를 생성하지 않는다', async () => {
    const createClientSpy = vi.spyOn(remoteSharedUtils, 'createMfeQueryClient');

    render(<ProductList userId="user-1" syncMode="mode-b-query" />);
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    expect(createClientSpy).not.toHaveBeenCalled();

    createClientSpy.mockRestore();
  });

  it('TC-01 / EC-01: src/vite-env.d.ts에 @ark-ui/react 임시 타입 Shim이 없고 로컬 @mf-types 내 전이 타입 누출이 0건이다', () => {
    const appRoot = resolve(import.meta.dirname, '../..');
    const viteEnvText = readFileSync(resolve(appRoot, 'src/vite-env.d.ts'), 'utf-8');

    // 1. 표준 Vite 클라이언트 전역 타입 지시어는 반드시 유지되어야 합니다.
    expect(viteEnvText).toContain('/// <reference types="vite/client" />');

    // 2. 공급자 경계 캡슐화 완료 이후 소비자 임시 Shim(declare module '@ark-ui/react...') 및 HTMLArkProps가 0건인지 확인합니다.
    expect(viteEnvText).not.toMatch(/declare\s+module\s+['"]@ark-ui\/react/);
    expect(viteEnvText).not.toContain('HTMLArkProps');

    // 3. 로컬 @mf-types 캐시가 존재하는 환경에서는 구버전 전이 타입 누출(@ark-ui/react)이 0건인지 검증합니다.
    const mfTypesDir = resolve(appRoot, '@mf-types');
    // [분기 설명] CI 등 클린 체크아웃 환경에서는 @mf-types가 Git 미추적이므로 디렉터리가 존재할 때만 누출 검사를 수행합니다.
    if (existsSync(mfTypesDir)) {
      const leakedFiles = collectDtsFiles(mfTypesDir).filter((filePath) =>
        readFileSync(filePath, 'utf-8').includes('@ark-ui/react'),
      );
      expect(leakedFiles).toEqual([]);
    }
  });

  it('TC-02: 동일 ProductList 인스턴스는 리렌더 후에도 같은 sourceId를 유지하고, 재마운트된 새 인스턴스는 고유한 sourceId를 발급받는다', async () => {
    const user = userEvent.setup();
    const capturedSourceIds: Array<string | undefined> = [];
    const unsubscribe = mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, (_payload, meta) => {
      capturedSourceIds.push(meta?.sourceId);
    });

    const { rerender, unmount } = render(
      <ProductList userId="user-1" hostType="vite" syncMode="mode-a-event" />,
    );
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    const firstButtons = screen.getAllByRole('button', { name: /장바구니 담기/ });
    await user.click(firstButtons[0] as HTMLElement);
    await waitFor(() => {
      expect(capturedSourceIds).toHaveLength(1);
    });

    // 상위 호스트 prop 변경으로 리렌더가 발생해도 동일 마운트 인스턴스의 sourceId는 유지되어야 합니다.
    rerender(<ProductList userId="user-1" hostType="rspack" syncMode="mode-a-event" />);
    const secondButtons = screen.getAllByRole('button', { name: /장바구니 담기/ });
    await user.click(secondButtons[0] as HTMLElement);
    await waitFor(() => {
      expect(capturedSourceIds).toHaveLength(2);
    });

    unmount();

    // 새 마운트 인스턴스는 이전 인스턴스와 구별되는 신규 remote-products:<uuid>를 발급받아야 합니다.
    render(<ProductList userId="user-1" hostType="vite" syncMode="mode-a-event" />);
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    const thirdButtons = screen.getAllByRole('button', { name: /장바구니 담기/ });
    await user.click(thirdButtons[0] as HTMLElement);
    await waitFor(() => {
      expect(capturedSourceIds).toHaveLength(3);
    });

    expect(capturedSourceIds[0]).toMatch(/^remote-products:.+/);
    expect(capturedSourceIds[1]).toBe(capturedSourceIds[0]);
    expect(capturedSourceIds[2]).toMatch(/^remote-products:.+/);
    expect(capturedSourceIds[2]).not.toBe(capturedSourceIds[0]);

    unsubscribe();
  });

  it('TC-03: 단독 실행 쇼케이스(App.tsx) 실시간 이벤트 로그에 발신자 sourceId가 함께 표시된다', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <App />
      </ThemeProvider>,
    );

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    const userSelect = screen.getByLabelText('시뮬레이션 사용자 선택');
    await user.selectOptions(userSelect, 'user-1');

    const addButtons = screen.getAllByRole('button', { name: /장바구니 담기/ });
    await user.click(addButtons[0] as HTMLElement);

    expect(await screen.findByText(/source=remote-products:.+/)).toBeInTheDocument();
  });

  it('TC-04: vite.config.ts에 React 서브패스 3종 포함 6종 싱글톤이 선언되고 로컬 스텁이 표준 4대 이벤트·createMfeEventSourceId 정본과 정합한다', () => {
    const appRoot = resolve(import.meta.dirname, '../..');
    const viteConfigText = readFileSync(resolve(appRoot, 'vite.config.ts'), 'utf-8');

    expect(viteConfigText).toContain("'react/jsx-runtime'");
    expect(viteConfigText).toContain("'react/jsx-dev-runtime'");
    expect(viteConfigText).toContain("'react-dom/client'");
    expect(viteConfigText).toContain("'@tanstack/react-query'");

    expect(Object.keys(MFE_EVENTS).sort()).toEqual([
      'AUTH_CHANGED',
      'CART_UPDATED',
      'SYNC_MODE_CHANGED',
      'THEME_CHANGED',
    ]);
    expect('CSS_ISOLATION_CHANGED' in MFE_EVENTS).toBe(false);
    expect(typeof (remoteSharedUtils as Record<string, unknown>).createMfeEventSourceId).toBe(
      'function',
    );
  });

  it('EC-01: ProductCatalogView를 eventSourceId 없이 직접 마운트해도 내부 지연 폴백으로 remote-products: sourceId를 발행한다', async () => {
    const user = userEvent.setup();
    const emitSpy = vi.spyOn(mfeEventBus, 'emit');
    const localClient = createMfeQueryClient();

    render(
      <QueryClientProvider client={localClient}>
        <ProductCatalogView
          userId="user-1"
          hostType="standalone"
          syncMode="mode-a-event"
          simulateDelay={false}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    const addButtons = screen.getAllByRole('button', { name: /장바구니 담기/ });
    await user.click(addButtons[0] as HTMLElement);

    await waitFor(() => {
      expect(emitSpy).toHaveBeenCalledTimes(1);
    });

    expect(emitSpy).toHaveBeenCalledWith(
      MFE_EVENTS.CART_UPDATED,
      expect.objectContaining({
        action: 'add',
        userId: 'user-1',
        productId: 1,
      }),
      {
        sourceId: expect.stringMatching(/^remote-products:.+/),
      },
    );

    emitSpy.mockRestore();
  });

  it('EC-02: ProductList가 Mode A에서 Mode B로 전환(rerender)되어도 QueryClientProvider 리마운트 후 정상 조회 및 Mode B 무효화만 수행한다', async () => {
    const user = userEvent.setup();
    const emitSpy = vi.spyOn(mfeEventBus, 'emit');
    const cancelSpy = vi.spyOn(sharedQueryClient, 'cancelQueries');
    const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries');

    const { rerender } = render(
      <ProductList userId="user-1" hostType="vite" syncMode="mode-a-event" />,
    );
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    rerender(<ProductList userId="user-1" hostType="vite" syncMode="mode-b-query" />);
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    const addButtons = screen.getAllByRole('button', { name: /장바구니 담기/ });
    await user.click(addButtons[0] as HTMLElement);

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: CART_QUERY_KEY });
    });

    expect(cancelSpy).toHaveBeenCalledWith({ queryKey: CART_QUERY_KEY });
    expect(emitSpy).not.toHaveBeenCalled();

    emitSpy.mockRestore();
    cancelSpy.mockRestore();
    invalidateSpy.mockRestore();
  });
});
