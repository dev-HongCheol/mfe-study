/**
 * @file event-bus.test.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-01 / EC-01] mfeEventBus 커스텀 이벤트 발행·구독 및 오염된 페이로드 Zod 차단 단위 테스트입니다.
 */
import { describe, expect, it, vi } from 'vitest';
import { MFE_EVENTS, mfeEventBus } from './event-bus.js';

describe('mfeEventBus (TC-01 & EC-01)', () => {
  it('TC-01: 유효한 페이로드로 이벤트를 발행하면 구독 핸들러에 검증된 데이터가 전달되고 unsubscribe 후에는 호출되지 않는다', () => {
    const handler = vi.fn();
    const unsubscribe = mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, handler);

    const payload = {
      action: 'add' as const,
      userId: 'user-1',
      productId: 1,
      productName: '기계식 무선 키보드 Pro',
      quantity: 2,
      sourceHost: 'vite' as const,
      timestamp: '2026-11-02T10:00:00.000Z',
    };

    const emitted = mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload);
    expect(emitted).toBe(true);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);

    unsubscribe();
    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('EC-01: 오염된 CustomEvent 페이로드가 디스패치되거나 발행될 때 Zod safeParse로 차단하고 핸들러 크래시를 막는다', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handler = vi.fn();
    const unsubscribe = mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, handler);

    // 1) 외부 스크립트가 필수 필드가 누락된 오염된 CustomEvent를 직접 window에 디스패치한 경우
    window.dispatchEvent(
      new CustomEvent(MFE_EVENTS.CART_UPDATED, {
        detail: { action: 'invalid-action', broken: true },
      }),
    );

    // 2) 잘못된 페이로드로 emit을 시도한 경우
    const emitted = mfeEventBus.emit(
      MFE_EVENTS.CART_UPDATED,
      // @ts-expect-error 런타임 오염 시뮬레이션
      { action: 'hack' },
    );

    expect(emitted).toBe(false);
    expect(handler).not.toHaveBeenCalled();

    unsubscribe();
    warnSpy.mockRestore();
  });
});
