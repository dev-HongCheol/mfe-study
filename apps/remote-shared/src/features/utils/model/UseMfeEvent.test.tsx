/**
 * @file UseMfeEvent.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-01] useMfeEvent 커스텀 훅의 컴포넌트 언마운트 시 리스너 자동 해제(좀비 리스너 방지) 테스트입니다.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CartUpdatedEventPayload } from './contracts';
import { MFE_EVENTS, type MfeEventMeta, mfeEventBus, useMfeEvent } from './event-bus';

/**
 * useMfeEvent 훅을 구독하는 테스트용 리스너 컴포넌트
 *
 * @param props - 이벤트 수신 시 호출할 스파이 콜백 및 선택적 자기 에코 차단 sourceId
 * @returns 테스트 마커 엘리먼트
 */
function EventListenerHarness({
  onEvent,
  ignoreSourceId,
}: {
  /** 수신된 페이로드와 선택적 발신 메타데이터를 전달받는 콜백 */
  onEvent: (payload: CartUpdatedEventPayload, meta?: MfeEventMeta) => void;
  /** 자기 에코 차단을 테스트하기 위한 선택적 발신자 ID */
  ignoreSourceId?: string;
}) {
  useMfeEvent(MFE_EVENTS.CART_UPDATED, onEvent, { ignoreSourceId });
  return <div data-testid="listener-mounted">Listening</div>;
}

describe('useMfeEvent (TC-01 & TC-02)', () => {
  it('컴포넌트 마운트 중에는 이벤트를 수신하고 언마운트 직후에는 리스너가 자동 해제되어 추가 호출되지 않는다', () => {
    const spy = vi.fn();
    const { unmount } = render(<EventListenerHarness onEvent={spy} />);

    const validPayload: CartUpdatedEventPayload = {
      action: 'add',
      userId: 'user-1',
      productId: 2,
      quantity: 1,
      sourceHost: 'rspack',
      timestamp: '2026-11-02T12:00:00.000Z',
    };

    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, validPayload);
    expect(spy).toHaveBeenCalledTimes(1);

    // 언마운트 수행 후 재발행 시 호출되지 않아야 함 (Study 04 #09)
    unmount();
    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, validPayload);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('TC-02: ignoreSourceId와 일치하는 자기 에코는 차단하고, 옵션 변경 시 리스너를 재등록하지 않고 최신 ID를 반영한다', () => {
    const addListenerSpy = vi.spyOn(window, 'addEventListener');
    const spy = vi.fn();

    const { rerender, unmount } = render(
      <EventListenerHarness onEvent={spy} ignoreSourceId="remote-cart:alpha" />,
    );

    const cartListenerAddsBefore = addListenerSpy.mock.calls.filter(
      (call) => call[0] === MFE_EVENTS.CART_UPDATED,
    ).length;
    expect(cartListenerAddsBefore).toBe(1);

    const payload: CartUpdatedEventPayload = {
      action: 'add',
      userId: 'user-1',
      productId: 4,
      quantity: 1,
      sourceHost: 'vite',
      timestamp: '2026-11-24T13:15:00.000Z',
    };

    // 1) 자기 에코(alpha)는 차단되고 외부 이벤트(beta)만 meta와 함께 수신됨
    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload, { sourceId: 'remote-cart:alpha' });
    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload, { sourceId: 'remote-products:beta' });

    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(payload, { sourceId: 'remote-products:beta' });

    // 2) ignoreSourceId가 gamma로 변경되어도 window.addEventListener 재등록 없이 즉시 최신 ID로 필터링
    rerender(<EventListenerHarness onEvent={spy} ignoreSourceId="remote-cart:gamma" />);

    const cartListenerAddsAfter = addListenerSpy.mock.calls.filter(
      (call) => call[0] === MFE_EVENTS.CART_UPDATED,
    ).length;
    expect(cartListenerAddsAfter).toBe(1);

    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload, { sourceId: 'remote-cart:gamma' });
    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload, { sourceId: 'remote-cart:alpha' });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(2, payload, { sourceId: 'remote-cart:alpha' });

    unmount();
    addListenerSpy.mockRestore();
  });
});
