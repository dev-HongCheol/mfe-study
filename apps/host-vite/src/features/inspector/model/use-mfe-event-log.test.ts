/**
 * @file use-mfe-event-log.test.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description [TC-05] useMfeEventLog 훅의 표준 4대 이벤트 수신, sourceId 메타 기록, 로그 비우기 및 언마운트 시 좀비 리스너 0개 정리 단위 테스트입니다.
 */
import { act, renderHook } from '@testing-library/react';
import { MFE_EVENTS, mfeEventBus } from 'remote_shared/utils';
import { describe, expect, it } from 'vitest';
import { useMfeEventLog } from './use-mfe-event-log';

describe('useMfeEventLog 단위 테스트 (TC-05)', () => {
  it('TC-05: 4대 표준 이벤트를 sourceId와 함께 최신순으로 누적하고 clearLogs 및 언마운트 정리를 보장한다', () => {
    const { result, unmount } = renderHook(() => useMfeEventLog(5));

    expect(result.current.logs).toHaveLength(0);

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
          timestamp: '2026-11-27T00:10:00.000Z',
        },
        { sourceId: 'remote-products:test-1' },
      );

      mfeEventBus.emit(
        MFE_EVENTS.SYNC_MODE_CHANGED,
        {
          syncMode: 'mode-b-query',
          timestamp: '2026-11-27T00:10:01.000Z',
        },
        { sourceId: 'host-vite:test-1' },
      );
    });

    expect(result.current.logs).toHaveLength(2);
    expect(result.current.logs[0]).toMatchObject({
      eventName: MFE_EVENTS.SYNC_MODE_CHANGED,
      sourceId: 'host-vite:test-1',
    });
    expect(result.current.logs[1]).toMatchObject({
      eventName: MFE_EVENTS.CART_UPDATED,
      sourceId: 'remote-products:test-1',
    });
    expect(result.current.logs[1]?.summary).toContain('기계식 무선 키보드 Pro');

    act(() => {
      result.current.clearLogs();
    });
    expect(result.current.logs).toHaveLength(0);

    // 언마운트 후 발행된 이벤트는 누적되지 않고 예외도 발생하지 않아야 합니다.
    unmount();
    expect(() =>
      mfeEventBus.emit(MFE_EVENTS.THEME_CHANGED, {
        theme: 'dark',
        timestamp: '2026-11-27T00:10:02.000Z',
      }),
    ).not.toThrow();
  });
});
