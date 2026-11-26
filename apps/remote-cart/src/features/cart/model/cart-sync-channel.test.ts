/**
 * @file cart-sync-channel.test.ts
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description [TC-01~TC-06, EC-01~EC-04] QueryClient 단위 장바구니 동기화 채널(cart-sync-channel.ts)의 자기 에코 차단, Ref-Counting 단일 리스너, 멱등 클린업, 외부 리스너 예외 격리, 중첩 동기 이벤트 처리 및 Mode B·비로그인 완전 격리 단위 테스트입니다.
 */
import { renderHook } from '@testing-library/react';
import * as remoteSharedUtils from 'remote_shared/utils';
import {
  CART_QUERY_KEY,
  type CartUpdatedEventPayload,
  MFE_EVENTS,
  createMfeEventSourceId,
  createMfeQueryClient,
  mfeEventBus,
} from 'remote_shared/utils';
import { describe, expect, it, vi } from 'vitest';
import {
  buildCartUserQueryKey,
  getCartSyncReceivedCount,
  getCartSyncSourceId,
  subscribeCartSync,
  syncCartAfterMutation,
  useCartSyncChannel,
} from './cart-sync-channel';

/**
 * 테스트용 장바구니 변경 이벤트 페이로드를 생성합니다.
 *
 * @param overrides - 덮어쓸 페이로드 필드
 * @returns 표준 CartUpdatedEventPayload
 */
function createCartEventPayload(
  overrides: Partial<CartUpdatedEventPayload> = {},
): CartUpdatedEventPayload {
  return {
    action: 'add',
    userId: 'user-1',
    productId: 1,
    productName: '기계식 무선 키보드 Pro',
    quantity: 1,
    sourceHost: 'rspack',
    timestamp: '2026-11-24T17:40:00.000Z',
    ...overrides,
  };
}

describe('cart-sync-channel 단위 테스트 (TC-01~TC-06, EC-01~EC-04)', () => {
  it('buildCartUserQueryKey와 getCartSyncSourceId: QueryClient별 고유 sourceId를 발급하고 사용자 쿼리 키를 정렬한다', () => {
    const qcA = createMfeQueryClient();
    const qcB = createMfeQueryClient();

    expect(buildCartUserQueryKey('user-1')).toEqual([...CART_QUERY_KEY, 'user-1']);

    const sourceA1 = getCartSyncSourceId(qcA);
    const sourceA2 = getCartSyncSourceId(qcA);
    const sourceB = getCartSyncSourceId(qcB);

    expect(sourceA1).toMatch(/^remote-cart:/);
    expect(sourceA1).toBe(sourceA2);
    expect(sourceA1).not.toBe(sourceB);
  });

  it('TC-01: Mode A syncCartAfterMutation은 자기 에코를 차단해 receivedCount 0 유지 및 invalidateQueries 정확히 1회를 보장한다', async () => {
    const qc = createMfeQueryClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
    const emitSpy = vi.spyOn(mfeEventBus, 'emit');

    const cleanup = subscribeCartSync(qc, 'user-1');

    await syncCartAfterMutation(qc, 'mode-a-event', createCartEventPayload({ userId: 'user-1' }));

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy).toHaveBeenCalledWith(
      MFE_EVENTS.CART_UPDATED,
      expect.objectContaining({ userId: 'user-1', action: 'add' }),
      { sourceId: getCartSyncSourceId(qc) },
    );
    expect(getCartSyncReceivedCount(qc, 'user-1')).toBe(0);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['cart', 'user-1'] });

    cleanup();
    invalidateSpy.mockRestore();
    emitSpy.mockRestore();
  });

  it('TC-02: 동일 QueryClient에 2개 위젯이 구독해도 mfeEventBus.subscribe는 1회만 등록되고 외부 이벤트 1회에 invalidateQueries 1회만 호출된다', () => {
    const qc = createMfeQueryClient();
    const subscribeSpy = vi.spyOn(mfeEventBus, 'subscribe');
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const cleanup1 = subscribeCartSync(qc, 'user-1');
    const cleanup2 = subscribeCartSync(qc, 'user-1');

    expect(subscribeSpy).toHaveBeenCalledTimes(1);

    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, createCartEventPayload({ userId: 'user-1' }), {
      sourceId: createMfeEventSourceId('remote-products'),
    });

    expect(getCartSyncReceivedCount(qc, 'user-1')).toBe(1);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['cart', 'user-1'] });

    cleanup1();
    cleanup2();
    subscribeSpy.mockRestore();
    invalidateSpy.mockRestore();
  });

  it('TC-03: 독립 QueryClient A·B 중 A가 뮤테이션을 수행하면 A는 자기 에코 0회, B는 외부 이벤트 1회 수신 및 각각 invalidateQueries 1회씩 수행한다', async () => {
    const qcA = createMfeQueryClient();
    const qcB = createMfeQueryClient();
    const invA = vi.spyOn(qcA, 'invalidateQueries');
    const invB = vi.spyOn(qcB, 'invalidateQueries');

    const cleanupA = subscribeCartSync(qcA, 'user-1');
    const cleanupB = subscribeCartSync(qcB, 'user-1');

    await syncCartAfterMutation(qcA, 'mode-a-event', createCartEventPayload({ userId: 'user-1' }));

    expect(getCartSyncReceivedCount(qcA, 'user-1')).toBe(0);
    expect(getCartSyncReceivedCount(qcB, 'user-1')).toBe(1);
    expect(invA).toHaveBeenCalledTimes(1);
    expect(invB).toHaveBeenCalledTimes(1);

    cleanupA();
    cleanupB();
    invA.mockRestore();
    invB.mockRestore();
  });

  it('TC-04 / EC-02: 부분 해제 및 멱등 중복 해제 시 남은 구독이 유지되고, 타 사용자 이벤트는 격리되며, 모두 해제되면 리스너가 완전 제거된다', () => {
    const qc = createMfeQueryClient();
    const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');

    const cleanup1 = subscribeCartSync(qc, 'user-1');
    const cleanup2 = subscribeCartSync(qc, 'user-1');

    // 1번 클린업을 2번 연속 호출해도 멱등 가드로 인해 2번 위젯의 참조 수가 훼손되지 않아야 함
    cleanup1();
    cleanup1();

    // 미구독 사용자(user-2) 이벤트는 무시되어야 함
    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, createCartEventPayload({ userId: 'user-2' }));
    expect(getCartSyncReceivedCount(qc, 'user-2')).toBe(0);
    expect(getCartSyncReceivedCount(qc, 'user-1')).toBe(0);
    expect(invalidateSpy).not.toHaveBeenCalled();

    // user-1 외부 이벤트는 남은 2번 위젯 덕분에 정상 수신되어야 함
    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, createCartEventPayload({ userId: 'user-1' }));
    expect(getCartSyncReceivedCount(qc, 'user-1')).toBe(1);
    expect(invalidateSpy).toHaveBeenCalledTimes(1);

    // 마지막 2번 위젯까지 해제하면 리스너가 완전 제거되어 추가 이벤트에 반응하지 않아야 함
    cleanup2();
    invalidateSpy.mockClear();

    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, createCartEventPayload({ userId: 'user-1' }));
    expect(getCartSyncReceivedCount(qc, 'user-1')).toBe(1);
    expect(invalidateSpy).not.toHaveBeenCalled();

    invalidateSpy.mockRestore();
  });

  it('TC-06: 중첩 동기 이벤트 발행(A 발행 중 외부 리스너가 다른 sourceId로 동기 emit) 시 A 채널이 중첩 이벤트를 정상 수신한다', async () => {
    const qcA = createMfeQueryClient();
    const invA = vi.spyOn(qcA, 'invalidateQueries');
    const externalSourceId = createMfeEventSourceId('external-listener');
    let nestedEmitted = false;

    const cleanupA = subscribeCartSync(qcA, 'user-1');
    const unsubExternal = mfeEventBus.subscribe(
      MFE_EVENTS.CART_UPDATED,
      () => {
        if (!nestedEmitted) {
          nestedEmitted = true;
          mfeEventBus.emit(
            MFE_EVENTS.CART_UPDATED,
            createCartEventPayload({ userId: 'user-1', productId: 99, productName: '중첩 상품' }),
            { sourceId: externalSourceId },
          );
        }
      },
      { ignoreSourceId: externalSourceId },
    );

    await syncCartAfterMutation(qcA, 'mode-a-event', createCartEventPayload({ userId: 'user-1' }));

    // A의 자기 이벤트는 차단되고, 외부 리스너가 동기 중첩 발행한 이벤트 1건은 정상 수신되어야 함
    expect(nestedEmitted).toBe(true);
    expect(getCartSyncReceivedCount(qcA, 'user-1')).toBe(1);
    // 중첩 이벤트로 인한 1회 + syncCartAfterMutation 본인의 최종 1회 = 2회
    expect(invA).toHaveBeenCalledTimes(2);

    unsubExternal();
    cleanupA();
    invA.mockRestore();
  });

  it('EC-01: Mode A syncCartAfterMutation 도중 mfeEventBus.emit이 동기 예외를 던져도 격리 후 로컬 invalidateQueries를 정상 1회 완료한다', async () => {
    const qc = createMfeQueryClient();
    const invSpy = vi.spyOn(qc, 'invalidateQueries');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const emitSpy = vi.spyOn(mfeEventBus, 'emit').mockImplementationOnce(() => {
      throw new Error('이벤트 발행 중 동기 예외 시뮬레이션');
    });

    await expect(
      syncCartAfterMutation(qc, 'mode-a-event', createCartEventPayload({ userId: 'user-1' })),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      '[remote-cart] mfe:cart-updated 이벤트 발행 중 외부 리스너 오류:',
      expect.any(Error),
    );
    expect(invSpy).toHaveBeenCalledTimes(1);
    expect(invSpy).toHaveBeenCalledWith({ queryKey: ['cart', 'user-1'] });

    emitSpy.mockRestore();
    invSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('EC-03 / EC-04: 비인증(null) 수신 카운트는 0이며 로컬 스텁 계약이 PR #15·#16 정본과 1:1 일치한다', () => {
    const qc = createMfeQueryClient();
    expect(getCartSyncReceivedCount(qc, null)).toBe(0);
    expect(getCartSyncReceivedCount(qc, 'user-1')).toBe(0);

    // PR #15: 폐기된 CSS_ISOLATION_CHANGED 키가 MFE_EVENTS에 존재하지 않아야 함
    expect('CSS_ISOLATION_CHANGED' in MFE_EVENTS).toBe(false);
    expect(Object.keys(MFE_EVENTS).sort()).toEqual([
      'AUTH_CHANGED',
      'CART_UPDATED',
      'SYNC_MODE_CHANGED',
      'THEME_CHANGED',
    ]);

    // PR #16: createMfeEventSourceId 공백 prefix 차단
    expect(() => createMfeEventSourceId('   ')).toThrow();
  });

  it('Mode B(enabled=false) 및 비로그인(userId=null)에서 useCartSyncChannel은 EventBus 구독뿐 아니라 빈 채널 생성과 내부 Store 구독도 0회로 완전 격리한다', () => {
    const qcModeB = createMfeQueryClient();
    const qcGuest = createMfeQueryClient();
    const subscribeSpy = vi.spyOn(mfeEventBus, 'subscribe');
    const createSourceIdSpy = vi.spyOn(remoteSharedUtils, 'createMfeEventSourceId');

    const modeBHook = renderHook(() => useCartSyncChannel(qcModeB, 'user-1', false));
    const guestHook = renderHook(() => useCartSyncChannel(qcGuest, null, true));

    expect(modeBHook.result.current).toBe(0);
    expect(guestHook.result.current).toBe(0);
    expect(subscribeSpy).not.toHaveBeenCalled();
    expect(createSourceIdSpy).not.toHaveBeenCalled();

    modeBHook.unmount();
    guestHook.unmount();
    subscribeSpy.mockRestore();
    createSourceIdSpy.mockRestore();
  });
});
