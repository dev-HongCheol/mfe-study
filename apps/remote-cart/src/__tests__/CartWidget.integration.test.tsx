/**
 * @file CartWidget.integration.test.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description [TC-01~TC-08, EC-01~EC-04] CartWidget 통합 플로우, Mode A 자기 에코 차단 및 QueryClient 단위 동기화 채널 8대 회귀 시나리오(3지표 분리 검증), Mode A vs Mode B 대칭 비교, 비인증 차단 및 아키텍처 무결성 통합 테스트입니다.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { StrictMode } from 'react';
import * as remoteSharedUtils from 'remote_shared/utils';
import {
  CART_QUERY_KEY,
  MFE_EVENTS,
  createMfeEventSourceId,
  createMfeQueryClient,
  mfeEventBus,
  sharedQueryClient,
} from 'remote_shared/utils';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { CartWidget } from '../exposed/CartWidget';
import { CartWidgetView } from '../features/cart/ui/CartWidgetView';
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

describe('CartWidget & App 통합 테스트 (기존 회귀 + Study 12 8대 매트릭스)', () => {
  it('TC-05(기존): Mode A(mode-a-event)에서는 외부 mfe:cart-updated 수신 시 재조회하고 삭제 시 sourceId와 함께 이벤트만 발행한다', async () => {
    const user = userEvent.setup();
    const emitSpy = vi.spyOn(mfeEventBus, 'emit');
    const sharedInvalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries');

    render(<CartWidget userId="user-1" hostType="rspack" syncMode="mode-a-event" />);

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    expect(screen.getByText('213,000원')).toBeInTheDocument();
    expect(screen.getByText('수신 이벤트 0회')).toBeInTheDocument();

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
    expect(screen.getByText('수신 이벤트 1회')).toBeInTheDocument();

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
      expect.objectContaining({
        sourceId: expect.stringMatching(/^remote-cart:/),
      }),
    );
    // 자기 삭제 이벤트는 자기 에코 차단으로 수신 카운트가 1회 그대로 유지되어야 함
    expect(screen.getByText('수신 이벤트 1회')).toBeInTheDocument();
    expect(sharedInvalidateSpy).not.toHaveBeenCalled();

    emitSpy.mockRestore();
    sharedInvalidateSpy.mockRestore();
  });

  it('TC-05(기존): Mode B(mode-b-query)에서는 createMfeQueryClient를 호출하지 않고 sharedQueryClient 캐시 무효화만으로 자동 동기화한다', async () => {
    const user = userEvent.setup();
    const createClientSpy = vi.spyOn(remoteSharedUtils, 'createMfeQueryClient');
    const emitSpy = vi.spyOn(mfeEventBus, 'emit');
    const cancelSpy = vi.spyOn(sharedQueryClient, 'cancelQueries');
    const invalidateSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries');

    render(<CartWidget userId="user-1" hostType="rspack" syncMode="mode-b-query" />);

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    expect(createClientSpy).not.toHaveBeenCalled();

    // 외부(remote-products)가 기존 ['cart'] prefix로 무효화해도 정렬된 쿼리 키가 100% 하위 호환으로 자동 재조회해야 함
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

    // [+1] 수량 증가 클릭 시 사용자 단위 ['cart', 'user-1'] cancelQueries + invalidateQueries 1회만 호출되고 CustomEvent는 0회
    const [firstIncrementBtn] = screen.getAllByRole('button', { name: /\+1/i });
    expect(firstIncrementBtn).toBeDefined();
    if (firstIncrementBtn) {
      await user.click(firstIncrementBtn);
    }

    await waitFor(() => {
      expect(cancelSpy).toHaveBeenCalledWith({ queryKey: [...CART_QUERY_KEY, 'user-1'] });
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [...CART_QUERY_KEY, 'user-1'] });
    });
    expect(emitSpy).not.toHaveBeenCalled();

    createClientSpy.mockRestore();
    emitSpy.mockRestore();
    cancelSpy.mockRestore();
    invalidateSpy.mockRestore();
  });

  it('매트릭스 #1 (TC-01): 단일 위젯 자기 뮤테이션(Mode A) 시 수신 이벤트 0회, invalidateQueries 1회, 실제 GET 총 2회(초기 1 + 재조회 1)를 보장한다', async () => {
    const user = userEvent.setup();
    let getCartCount = 0;
    const qc = createMfeQueryClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    server.use(
      http.get('http://localhost:4000/api/cart', ({ request }) => {
        getCartCount += 1;
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
                    quantity: getCartCount >= 2 ? 2 : 1,
                    addedFromHost: 'vite',
                    createdAt: '2026-11-24 17:00:00',
                  },
                ]
              : [],
        });
      }),
    );

    render(
      <QueryClientProvider client={qc}>
        <CartWidgetView
          userId="user-1"
          hostType="rspack"
          syncMode="mode-a-event"
          simulateDelay={false}
        />
      </QueryClientProvider>,
    );

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    expect(getCartCount).toBe(1);
    invalidateSpy.mockClear();

    await user.click(screen.getByRole('button', { name: /\+1/i }));

    await waitFor(() => {
      expect(screen.getByText(/단가 129,000원 × 2개/)).toBeInTheDocument();
    });

    // 자기 에코로 인한 지연 중복 호출 여부를 포함해 잠시 대기 후 3지표 최종 검증
    await new Promise((r) => setTimeout(r, 40));

    expect(screen.getByText('수신 이벤트 0회')).toBeInTheDocument();
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['cart', 'user-1'] });
    expect(getCartCount).toBe(2);

    invalidateSpy.mockRestore();
  });

  it('매트릭스 #2 (TC-02): 동일 QueryClient 공유 위젯 2개(Mode A)에 외부 이벤트 1회 발행 시 두 위젯 모두 수신 1회, invalidateQueries 1회, 실제 GET 총 2회를 보장한다', async () => {
    let getCartCount = 0;
    const sharedLocalQc = createMfeQueryClient();
    const invalidateSpy = vi.spyOn(sharedLocalQc, 'invalidateQueries');

    server.use(
      http.get('http://localhost:4000/api/cart', () => {
        getCartCount += 1;
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
              quantity: getCartCount,
              addedFromHost: 'vite',
              createdAt: '2026-11-24 17:00:00',
            },
          ],
        });
      }),
    );

    render(
      <QueryClientProvider client={sharedLocalQc}>
        <CartWidgetView
          userId="user-1"
          hostType="rspack"
          syncMode="mode-a-event"
          simulateDelay={false}
        />
        <CartWidgetView
          userId="user-1"
          hostType="rspack"
          syncMode="mode-a-event"
          simulateDelay={false}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText('기계식 무선 키보드 Pro')).toHaveLength(2);
    });
    expect(getCartCount).toBe(1);
    invalidateSpy.mockClear();

    act(() => {
      mfeEventBus.emit(
        MFE_EVENTS.CART_UPDATED,
        {
          action: 'add',
          userId: 'user-1',
          productId: 1,
          productName: '기계식 무선 키보드 Pro',
          quantity: 1,
          sourceHost: 'vite',
          timestamp: new Date().toISOString(),
        },
        { sourceId: createMfeEventSourceId('remote-products') },
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText('수신 이벤트 1회')).toHaveLength(2);
      expect(getCartCount).toBe(2);
    });

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    invalidateSpy.mockRestore();
  });

  it('매트릭스 #3 (TC-03): 독립 QueryClient 위젯 A·B(Mode A) 중 A가 [+1] 클릭 시 A=0회, B=1회, 실제 GET 총 4회(초기 2 + A 1 + B 1)를 보장한다', async () => {
    const user = userEvent.setup();
    let getCartCount = 0;
    let quantity = 1;

    server.use(
      http.get('http://localhost:4000/api/cart', () => {
        getCartCount += 1;
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
              quantity,
              addedFromHost: 'vite',
              createdAt: '2026-11-24 17:00:00',
            },
          ],
        });
      }),
      http.post('http://localhost:4000/api/cart', () => {
        quantity += 1;
        return HttpResponse.json({
          success: true,
          data: {
            id: 1,
            userId: 'user-1',
            productId: 1,
            productName: '기계식 무선 키보드 Pro',
            price: 129000,
            category: 'electronics',
            quantity,
            addedFromHost: 'rspack',
            createdAt: '2026-11-24 17:10:00',
          },
        });
      }),
    );

    render(
      <div>
        <div data-testid="widget-a">
          <CartWidget userId="user-1" hostType="rspack" syncMode="mode-a-event" />
        </div>
        <div data-testid="widget-b">
          <CartWidget userId="user-1" hostType="rspack" syncMode="mode-a-event" />
        </div>
      </div>,
    );

    await waitFor(() => {
      expect(getCartCount).toBe(2);
    });

    // 위젯 A의 [+1] 버튼 클릭
    const [widgetAIncrementBtn] = screen.getAllByRole('button', { name: /\+1/i });
    expect(widgetAIncrementBtn).toBeDefined();
    if (widgetAIncrementBtn) {
      await user.click(widgetAIncrementBtn);
    }

    await waitFor(() => {
      expect(screen.getAllByText(/단가 129,000원 × 2개/)).toHaveLength(2);
    });
    await new Promise((r) => setTimeout(r, 40));

    expect(screen.getByTestId('widget-a')).toHaveTextContent('수신 이벤트 0회');
    expect(screen.getByTestId('widget-b')).toHaveTextContent('수신 이벤트 1회');
    expect(getCartCount).toBe(4);
  });

  it('매트릭스 #4 (TC-04): 동일 QueryClient 공유 위젯 2개 중 1개 언마운트 후에도 남은 위젯이 정상 수신하고, 모두 언마운트 후에는 GET 0회를 보장한다', async () => {
    let getCartCount = 0;
    const sharedLocalQc = createMfeQueryClient();
    const invalidateSpy = vi.spyOn(sharedLocalQc, 'invalidateQueries');

    server.use(
      http.get('http://localhost:4000/api/cart', () => {
        getCartCount += 1;
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
              quantity: getCartCount,
              addedFromHost: 'vite',
              createdAt: '2026-11-24 17:00:00',
            },
          ],
        });
      }),
    );

    const { rerender, unmount } = render(
      <QueryClientProvider client={sharedLocalQc}>
        <CartWidgetView
          userId="user-1"
          hostType="rspack"
          syncMode="mode-a-event"
          simulateDelay={false}
        />
        <CartWidgetView
          userId="user-1"
          hostType="rspack"
          syncMode="mode-a-event"
          simulateDelay={false}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(getCartCount).toBe(1);
    });

    // 1개 언마운트
    rerender(
      <QueryClientProvider client={sharedLocalQc}>
        <CartWidgetView
          userId="user-1"
          hostType="rspack"
          syncMode="mode-a-event"
          simulateDelay={false}
        />
      </QueryClientProvider>,
    );
    invalidateSpy.mockClear();

    act(() => {
      mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, {
        action: 'add',
        userId: 'user-1',
        productId: 1,
        sourceHost: 'vite',
        timestamp: new Date().toISOString(),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('수신 이벤트 1회')).toBeInTheDocument();
      expect(getCartCount).toBe(2);
    });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);

    // 나머지 1개도 언마운트 후 추가 이벤트 발행 시 재조회 0회
    unmount();
    invalidateSpy.mockClear();

    act(() => {
      mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, {
        action: 'add',
        userId: 'user-1',
        productId: 1,
        sourceHost: 'vite',
        timestamp: new Date().toISOString(),
      });
    });

    await new Promise((r) => setTimeout(r, 30));
    expect(invalidateSpy).not.toHaveBeenCalled();
    expect(getCartCount).toBe(2);

    invalidateSpy.mockRestore();
  });

  it('매트릭스 #5 (TC-05): React 19 <StrictMode> 이중 마운트 환경에서도 외부 이벤트 1회당 수신 1회·재조회 1회(좀비 리스너 0)를 보장한다', async () => {
    let getCartCount = 0;
    const qc = createMfeQueryClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    server.use(
      http.get('http://localhost:4000/api/cart', () => {
        getCartCount += 1;
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
              quantity: getCartCount,
              addedFromHost: 'vite',
              createdAt: '2026-11-24 17:00:00',
            },
          ],
        });
      }),
    );

    render(
      <StrictMode>
        <QueryClientProvider client={qc}>
          <CartWidgetView
            userId="user-1"
            hostType="rspack"
            syncMode="mode-a-event"
            simulateDelay={false}
          />
        </QueryClientProvider>
      </StrictMode>,
    );

    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    const countAfterInit = getCartCount;
    invalidateSpy.mockClear();

    act(() => {
      mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, {
        action: 'add',
        userId: 'user-1',
        productId: 1,
        sourceHost: 'vite',
        timestamp: new Date().toISOString(),
      });
    });

    await waitFor(() => {
      expect(screen.getByText('수신 이벤트 1회')).toBeInTheDocument();
      expect(getCartCount).toBe(countAfterInit + 1);
    });

    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    invalidateSpy.mockRestore();
  });

  it('매트릭스 #6 (TC-06): 위젯 A 뮤테이션 발행 중 외부 리스너가 다른 sourceId로 동기 중첩 이벤트를 발행하면 위젯 A가 정상 수신·재조회한다', async () => {
    const user = userEvent.setup();
    const externalSourceId = createMfeEventSourceId('remote-products-nested');
    let nestedEmitted = false;

    const unsubExternal = mfeEventBus.subscribe(
      MFE_EVENTS.CART_UPDATED,
      () => {
        if (!nestedEmitted) {
          nestedEmitted = true;
          seedExtraMockCartItem({
            userId: 'user-1',
            productId: 4,
            productName: '모션 데스크 스탠딩 책상',
            price: 450000,
            category: 'office',
            quantity: 1,
            addedFromHost: 'vite',
            createdAt: '2026-11-24 17:20:00',
          });
          mfeEventBus.emit(
            MFE_EVENTS.CART_UPDATED,
            {
              action: 'add',
              userId: 'user-1',
              productId: 4,
              productName: '모션 데스크 스탠딩 책상',
              quantity: 1,
              sourceHost: 'vite',
              timestamp: new Date().toISOString(),
            },
            { sourceId: externalSourceId },
          );
        }
      },
      { ignoreSourceId: externalSourceId },
    );

    render(<CartWidget userId="user-1" hostType="rspack" syncMode="mode-a-event" />);
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    const [firstIncrementBtn] = screen.getAllByRole('button', { name: /\+1/i });
    expect(firstIncrementBtn).toBeDefined();
    if (firstIncrementBtn) {
      await user.click(firstIncrementBtn);
    }

    expect(await screen.findByText('모션 데스크 스탠딩 책상')).toBeInTheDocument();
    expect(screen.getByText('수신 이벤트 1회')).toBeInTheDocument();

    unsubExternal();
  });

  it('매트릭스 #7 (TC-07): 빠른 연속 뮤테이션([+1] 직후 [삭제], 1차 재조회 지연 응답 엇갈림)에서도 최종 화면이 서버 최종 상태와 일치한다', async () => {
    const user = userEvent.setup();
    let getAttempt = 0;
    const delayedGate: { release: (() => void) | null } = { release: null };
    let deletedItem1 = false;
    let item1Qty = 1;

    server.use(
      http.get('http://localhost:4000/api/cart', async () => {
        getAttempt += 1;
        const currentAttempt = getAttempt;

        // 2번째 GET([+1] 직후 재조회)을 지연시켜 3번째 GET([삭제] 직후 재조회)보다 늦게 도착하는 역전 상황 연출
        if (currentAttempt === 2) {
          const staleSnapshot = [
            {
              id: 1,
              userId: 'user-1',
              productId: 1,
              productName: '기계식 무선 키보드 Pro',
              price: 129000,
              category: 'electronics',
              quantity: 2,
              addedFromHost: 'rspack',
              createdAt: '2026-11-24 17:01:00',
            },
          ];
          await new Promise<void>((resolvePromise) => {
            delayedGate.release = resolvePromise;
          });
          return HttpResponse.json({ success: true, data: staleSnapshot });
        }

        return HttpResponse.json({
          success: true,
          data: deletedItem1
            ? []
            : [
                {
                  id: 1,
                  userId: 'user-1',
                  productId: 1,
                  productName: '기계식 무선 키보드 Pro',
                  price: 129000,
                  category: 'electronics',
                  quantity: item1Qty,
                  addedFromHost: 'vite',
                  createdAt: '2026-11-24 17:00:00',
                },
              ],
        });
      }),
      http.post('http://localhost:4000/api/cart', () => {
        item1Qty += 1;
        return HttpResponse.json({
          success: true,
          data: {
            id: 1,
            userId: 'user-1',
            productId: 1,
            productName: '기계식 무선 키보드 Pro',
            price: 129000,
            category: 'electronics',
            quantity: item1Qty,
            addedFromHost: 'rspack',
            createdAt: '2026-11-24 17:01:00',
          },
        });
      }),
      http.delete('http://localhost:4000/api/cart/:id', () => {
        deletedItem1 = true;
        return HttpResponse.json({
          success: true,
          data: { deletedId: 1, deletedCount: 1 },
        });
      }),
    );

    render(<CartWidget userId="user-1" hostType="rspack" syncMode="mode-a-event" />);
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    // 1) [+1] 클릭 → 2번째 GET이 지연 상태로 대기
    await user.click(screen.getByRole('button', { name: /\+1/i }));
    await waitFor(() => {
      expect(delayedGate.release).not.toBeNull();
    });

    // 2) 곧바로 [장바구니 비우기] 클릭 → cancelQueries로 2번째 지연 GET을 취소하고 최신 빈 상태를 반영
    await user.click(screen.getByRole('button', { name: /장바구니 비우기/i }));
    await waitFor(() => {
      expect(screen.getByText(/장바구니가 비어 있습니다/i)).toBeInTheDocument();
    });

    // 3) 뒤늦게 지연된 구버전 2번째 GET 응답이 도착해도 최신 화면(빈 장바구니)을 덮어쓰지 않아야 함
    delayedGate.release?.();
    await new Promise((r) => setTimeout(r, 40));

    expect(screen.getByText(/장바구니가 비어 있습니다/i)).toBeInTheDocument();
    expect(screen.queryByText('기계식 무선 키보드 Pro')).not.toBeInTheDocument();
    expect(screen.getByText('수신 이벤트 0회')).toBeInTheDocument();
  });

  it('매트릭스 #8 (TC-08): Mode A → Mode B 전환 후 외부 이벤트 시 GET 0회 및 자기 뮤테이션 시 emit 0회를 보장한다', async () => {
    const user = userEvent.setup();
    let getCartCount = 0;
    const emitSpy = vi.spyOn(mfeEventBus, 'emit');
    const sharedInvSpy = vi.spyOn(sharedQueryClient, 'invalidateQueries');

    server.use(
      http.get('http://localhost:4000/api/cart', () => {
        getCartCount += 1;
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
              createdAt: '2026-11-24 17:00:00',
            },
          ],
        });
      }),
    );

    const { rerender } = render(
      <CartWidget userId="user-1" hostType="rspack" syncMode="mode-a-event" />,
    );
    expect(await screen.findByText('기계식 무선 키보드 Pro')).toBeInTheDocument();

    // Mode B로 전환
    rerender(<CartWidget userId="user-1" hostType="rspack" syncMode="mode-b-query" />);
    await waitFor(() => {
      expect(screen.getByText('Mode B (Shared Query)')).toBeInTheDocument();
    });

    const countBeforeExternalEvent = getCartCount;
    sharedInvSpy.mockClear();
    emitSpy.mockClear();

    // Mode B에서 외부 CustomEvent 발행 시 재조회 0회
    act(() => {
      mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, {
        action: 'add',
        userId: 'user-1',
        productId: 1,
        sourceHost: 'vite',
        timestamp: new Date().toISOString(),
      });
    });

    await new Promise((r) => setTimeout(r, 30));
    expect(getCartCount).toBe(countBeforeExternalEvent);
    expect(sharedInvSpy).not.toHaveBeenCalled();

    // Mode B에서 자기 뮤테이션 클릭 시 sharedQueryClient 1회 무효화, emit 0회
    emitSpy.mockClear();
    await user.click(screen.getByRole('button', { name: /\+1/i }));

    await waitFor(() => {
      expect(sharedInvSpy).toHaveBeenCalledTimes(1);
      expect(sharedInvSpy).toHaveBeenCalledWith({ queryKey: ['cart', 'user-1'] });
    });
    expect(emitSpy).not.toHaveBeenCalled();

    emitSpy.mockRestore();
    sharedInvSpy.mockRestore();
  });

  it('EC-01(기존): 비로그인(userId 미전달/null) 시 GET /api/cart를 0회 차단하고 mfe:auth-changed 수신 시 정상 조회한다', async () => {
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

  it('EC-02(기존): 수량 [+1] 증가 시 백엔드 400 OUT_OF_STOCK 에러를 인라인 role="alert" 배너로 안전하게 표시한다', async () => {
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

  it('EC-03(기존): 빈 장바구니(user-2) 안내와 GET /api/cart 500 장애 시 [다시 시도] 복구를 검증한다', async () => {
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

  it('EC-04(기존): Mode A에서 컴포넌트 언마운트 후 mfe:cart-updated 이벤트를 발행해도 추가 조회가 0회다 (좀비 리스너 차단)', async () => {
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

  it('TC-06(기존): 지연 스켈레톤, 단독 실행 쇼케이스(App) 및 5대 아키텍처 무결성을 검증한다', async () => {
    const { unmount } = render(
      <CartWidget userId="user-1" syncMode="mode-a-event" simulateDelay={true} delayMs={40} />,
    );

    expect(screen.getByTestId('cart-skeleton')).toBeInTheDocument();
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
