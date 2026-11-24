/**
 * @file event-bus.test.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-01, TC-03, EC-01, EC-02] mfeEventBus 커스텀 이벤트 발행·구독, 표준 4종 계약 정합성, sourceId 자기 에코 차단, createMfeEventSourceId 및 오염·폐기 이벤트 Zod/런타임 차단 단위 테스트입니다.
 */
import { describe, expect, it, vi } from 'vitest';
import * as exposedUtils from '../../../exposed/utils';
import { MFE_EVENT_SCHEMAS } from './contracts';
import { MFE_EVENTS, createMfeEventSourceId, mfeEventBus } from './event-bus';

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

  it('TC-01(계약 정리): MFE_EVENTS와 MFE_EVENT_SCHEMAS는 표준 4종만 유지하고 폐기된 CSS_ISOLATION_CHANGED는 포함하지 않는다', () => {
    const expectedKeys = ['CART_UPDATED', 'AUTH_CHANGED', 'THEME_CHANGED', 'SYNC_MODE_CHANGED'];
    const expectedValues = [
      'mfe:cart-updated',
      'mfe:auth-changed',
      'mfe:theme-changed',
      'mfe:sync-mode-changed',
    ];

    expect(Object.keys(MFE_EVENTS)).toEqual(expectedKeys);
    expect(Object.values(MFE_EVENTS)).toEqual(expectedValues);
    expect(Object.keys(MFE_EVENT_SCHEMAS)).toEqual(expectedValues);
    expect(Object.keys(MFE_EVENTS)).not.toContain('CSS_ISOLATION_CHANGED');
    expect(Object.values(MFE_EVENTS)).not.toContain('mfe:css-isolation-changed');
    expect('cssIsolationChangedEventSchema' in exposedUtils).toBe(false);
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

  it('EC-01(폐기 이벤트 방어): 미등록 또는 폐기된 이벤트 이름으로 런타임 emit/subscribe를 호출해도 크래시하지 않고 안전하게 차단한다', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const handler = vi.fn();

    const deprecatedEvent = 'mfe:css-isolation-changed' as never;
    const emitted = mfeEventBus.emit(deprecatedEvent, {
      cssIsolated: true,
      timestamp: '2026-11-23T15:00:00.000Z',
    } as never);
    const unsubscribe = mfeEventBus.subscribe(deprecatedEvent, handler);

    expect(emitted).toBe(false);
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
    expect(handler).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });

  it('TC-01(sourceId 자기 에코 차단): emit 시 sourceId를 지정하면 동일 ignoreSourceId 구독자는 차단되고 다른 구독자에게만 순수 payload와 meta가 전달된다', () => {
    const selfHandler = vi.fn();
    const peerHandler = vi.fn();
    const inspectorHandler = vi.fn();

    const unsubSelf = mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, selfHandler, {
      ignoreSourceId: 'remote-cart:client-a',
    });
    const unsubPeer = mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, peerHandler, {
      ignoreSourceId: 'remote-cart:client-b',
    });
    const unsubInspector = mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, inspectorHandler);

    const payload = {
      action: 'add' as const,
      userId: 'user-1',
      productId: 1,
      productName: '기계식 무선 키보드 Pro',
      quantity: 1,
      sourceHost: 'rspack' as const,
      timestamp: '2026-11-24T13:00:00.000Z',
    };

    const emitted = mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload, {
      sourceId: 'remote-cart:client-a',
    });

    expect(emitted).toBe(true);
    expect(selfHandler).not.toHaveBeenCalled();
    expect(peerHandler).toHaveBeenCalledTimes(1);
    expect(peerHandler).toHaveBeenCalledWith(payload, { sourceId: 'remote-cart:client-a' });
    expect(inspectorHandler).toHaveBeenCalledTimes(1);
    expect(inspectorHandler).toHaveBeenCalledWith(payload, { sourceId: 'remote-cart:client-a' });

    // 핸들러에 전달된 순수 도메인 payload에는 내부 예약 키(__mfeSourceId)가 누출되지 않아야 함
    const receivedPayload = peerHandler.mock.calls[0]?.[0] as Record<string, unknown>;
    expect('__mfeSourceId' in receivedPayload).toBe(false);

    unsubSelf();
    unsubPeer();
    unsubInspector();
  });

  it('TC-03(createMfeEventSourceId): 필수 prefix 정규화, 고유 발신자 ID 생성, 빈 prefix 예외 차단 및 exposed/utils 재노출을 검증한다', () => {
    const idA = createMfeEventSourceId('remote-cart');
    const idB = createMfeEventSourceId('remote-cart');
    const trimmedId = createMfeEventSourceId('  host-vite  ');

    expect(idA.startsWith('remote-cart:')).toBe(true);
    expect(idB.startsWith('remote-cart:')).toBe(true);
    expect(idA).not.toBe(idB);
    expect(trimmedId.startsWith('host-vite:')).toBe(true);
    expect(() => createMfeEventSourceId('')).toThrow(/prefix/);
    expect(() => createMfeEventSourceId('   ')).toThrow(/prefix/);
    expect(typeof exposedUtils.createMfeEventSourceId).toBe('function');
  });

  it('EC-01(하위 호환): sourceId 없는 기존 2인자 emit 및 외부 평문 CustomEvent는 ignoreSourceId 구독자에게도 인자 1개로 정상 전달된다', () => {
    const scopedHandler = vi.fn();
    const plainHandler = vi.fn();

    const unsubScoped = mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, scopedHandler, {
      ignoreSourceId: 'remote-cart:client-a',
    });
    const unsubPlain = mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, plainHandler);

    const payload = {
      action: 'add' as const,
      userId: 'user-1',
      productId: 3,
      quantity: 1,
      sourceHost: 'vite' as const,
      timestamp: '2026-11-24T13:05:00.000Z',
    };

    // 1) 기존 2인자 emit
    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload);
    // 2) 외부 스크립트의 평문 CustomEvent 직접 디스패치
    window.dispatchEvent(new CustomEvent(MFE_EVENTS.CART_UPDATED, { detail: payload }));

    expect(scopedHandler).toHaveBeenCalledTimes(2);
    expect(plainHandler).toHaveBeenCalledTimes(2);
    // 기존 1인자 계약 보존(toHaveBeenCalledWith(payload) 무깨짐)
    expect(scopedHandler).toHaveBeenNthCalledWith(1, payload);
    expect(plainHandler).toHaveBeenNthCalledWith(1, payload);
    expect(scopedHandler.mock.calls[0]?.length).toBe(1);

    unsubScoped();
    unsubPlain();
  });

  it('EC-02(경계값 방어): 공백 문자열 sourceId/ignoreSourceId 및 비정상 타입 __mfeSourceId는 안전하게 무시되고 정상 전달된다', () => {
    const handler = vi.fn();
    const unsubscribe = mfeEventBus.subscribe(MFE_EVENTS.CART_UPDATED, handler, {
      ignoreSourceId: '   ',
    });

    const payload = {
      action: 'remove' as const,
      userId: 'user-2',
      productId: 5,
      quantity: 1,
      sourceHost: 'standalone' as const,
      timestamp: '2026-11-24T13:10:00.000Z',
    };

    // 1) 공백 sourceId는 undefined로 정규화되어 오차단 없이 1인자 전달
    mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload, { sourceId: '   ' });
    // 2) 비정상 타입(__mfeSourceId: number)이 섞인 외부 CustomEvent도 크래시 없이 순수 payload만 전달
    window.dispatchEvent(
      new CustomEvent(MFE_EVENTS.CART_UPDATED, {
        detail: { ...payload, __mfeSourceId: 12345 },
      }),
    );

    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler).toHaveBeenNthCalledWith(1, payload);
    expect(handler).toHaveBeenNthCalledWith(2, payload);

    unsubscribe();
  });
});
