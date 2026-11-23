/**
 * @file CartHeaderBar.test.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description [TC-04] CartHeaderBar의 동기화 모드 배지, 호스트 출처, 계정 상태 및 이벤트 카운터 표시 단위 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CartHeaderBar } from './CartHeaderBar';

describe('CartHeaderBar (TC-04)', () => {
  it('TC-04: Mode A 상태와 수신 이벤트 횟수 및 로그인 계정을 배지로 정확히 표시한다', () => {
    render(
      <CartHeaderBar
        syncMode="mode-a-event"
        hostType="vite"
        receivedEventCount={3}
        userId="user-1"
      />,
    );

    expect(screen.getByText('Mode A (CustomEvent)')).toBeInTheDocument();
    expect(screen.getByText('Host: vite')).toBeInTheDocument();
    expect(screen.getByText('계정: user-1')).toBeInTheDocument();
    expect(screen.getByText(/수신 이벤트 3회/i)).toBeInTheDocument();
  });

  it('TC-04: Mode B에서는 이벤트 카운터 배지를 숨기고 비로그인 상태를 경고 배지로 표시한다', () => {
    render(
      <CartHeaderBar
        syncMode="mode-b-query"
        hostType="rspack"
        receivedEventCount={0}
        userId={null}
      />,
    );

    expect(screen.getByText('Mode B (Shared Query)')).toBeInTheDocument();
    expect(screen.getByText('Host: rspack')).toBeInTheDocument();
    expect(screen.getByText(/비로그인/i)).toBeInTheDocument();
    expect(screen.queryByText(/수신 이벤트/i)).not.toBeInTheDocument();
  });
});
