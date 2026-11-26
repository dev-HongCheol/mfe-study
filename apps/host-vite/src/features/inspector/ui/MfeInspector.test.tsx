/**
 * @file MfeInspector.test.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description [TC-04, TC-05] MfeInspector의 Mode A <-> Mode B 전환 스위치, 4대 이벤트 로그 탭, 연결 리모트 3종 메타 카드 및 sharedQueryClient 캐시 스냅샷 관찰 단위 테스트입니다.
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MFE_EVENTS, mfeEventBus, sharedQueryClient } from 'remote_shared/utils';
import { describe, expect, it, vi } from 'vitest';
import { MfeInspector } from './MfeInspector';

describe('MfeInspector 단위 테스트 (TC-04, TC-05)', () => {
  it('TC-04 / TC-05: 동기화 모드 전환, 실시간 이벤트 스트림 기록·비우기 및 런타임·캐시 탭 스냅샷을 표시한다', async () => {
    const user = userEvent.setup();
    const onChangeSyncMode = vi.fn();

    render(
      <MfeInspector
        syncMode="mode-a-event"
        hostSourceId="host-vite:inspector-test"
        onChangeSyncMode={onChangeSyncMode}
      />,
    );

    // 1. Mode B 전환 스위치 클릭
    await user.click(screen.getByRole('button', { name: /Mode B/ }));
    expect(onChangeSyncMode).toHaveBeenCalledWith('mode-b-query');

    // 2. 외부 이벤트 발행 및 로그 표시 -> 비우기 검증
    act(() => {
      mfeEventBus.emit(
        MFE_EVENTS.CART_UPDATED,
        {
          action: 'add',
          userId: 'user-1',
          productId: 2,
          productName: '초경량 버티컬 마우스 Air',
          quantity: 1,
          sourceHost: 'vite',
          timestamp: '2026-11-27T00:12:00.000Z',
        },
        { sourceId: 'remote-products:unit-1' },
      );
    });

    expect(screen.getByText(/초경량 버티컬 마우스 Air/)).toBeInTheDocument();
    expect(screen.getByText(/remote-products:unit-1/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /로그 비우기/ }));
    expect(screen.queryByText(/초경량 버티컬 마우스 Air/)).not.toBeInTheDocument();

    // 3. 런타임 · 캐시 상태 탭으로 전환해 3대 리모트 메타 카드 및 sharedQueryClient 캐시 스냅샷 확인
    await user.click(screen.getByRole('tab', { name: /런타임 · 캐시 상태/ }));
    expect(screen.getByText(/remote_shared/)).toBeInTheDocument();
    expect(screen.getByText(/remote_products/)).toBeInTheDocument();
    expect(screen.getByText(/remote_cart/)).toBeInTheDocument();

    act(() => {
      sharedQueryClient.setQueryData(['cart', 'user-1'], [{ id: 1 }]);
    });

    expect(screen.getByText(/\["cart","user-1"\]/)).toBeInTheDocument();
    expect(screen.getByText('success')).toBeInTheDocument();
  });
});
