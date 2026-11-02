/**
 * @file UseMfeEvent.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-01] useMfeEvent 커스텀 훅의 컴포넌트 언마운트 시 리스너 자동 해제(좀비 리스너 방지) 테스트입니다.
 */
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CartUpdatedEventPayload } from './contracts.js';
import { MFE_EVENTS, mfeEventBus, useMfeEvent } from './event-bus.js';

/**
 * useMfeEvent 훅을 구독하는 테스트용 리스너 컴포넌트
 *
 * @param props - 이벤트 수신 시 호출할 스파이 콜백
 * @returns 테스트 마커 엘리먼트
 */
function EventListenerHarness({
  onEvent,
}: {
  /** 수신된 페이로드를 전달받는 콜백 */
  onEvent: (payload: CartUpdatedEventPayload) => void;
}) {
  useMfeEvent(MFE_EVENTS.CART_UPDATED, onEvent);
  return <div data-testid="listener-mounted">Listening</div>;
}

describe('useMfeEvent (TC-01)', () => {
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
});
