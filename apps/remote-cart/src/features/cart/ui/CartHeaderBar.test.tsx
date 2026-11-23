/**
 * @file CartHeaderBar.test.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description [TC-04] CartHeaderBar의 동기화 모드 배지, 호스트 출처, CSS 격리 경고 배지 및 이벤트 카운터 표시 단위 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CartHeaderBar } from './CartHeaderBar';

describe('CartHeaderBar (TC-04)', () => {
  it('TC-04: Mode A와 CSS 격리 활성화 상태를 배지로 정확히 표시한다', () => {
    render(
      <CartHeaderBar
        syncMode="mode-a-event"
        hostType="vite"
        cssIsolated={true}
        receivedEventCount={3}
        userId="user-1"
      />,
    );

    expect(screen.getByText('Mode A (CustomEvent)')).toBeInTheDocument();
    expect(screen.getByText(/CSS 격리 활성/i)).toBeInTheDocument();
    expect(screen.getByText(/수신 이벤트 3회/i)).toBeInTheDocument();
  });

  it('TC-04: Mode B와 CSS 비격리 오염 실험 상태를 경고 배지로 구분 표시한다', () => {
    render(
      <CartHeaderBar
        syncMode="mode-b-query"
        hostType="rspack"
        cssIsolated={false}
        receivedEventCount={0}
        userId={null}
      />,
    );

    expect(screen.getByText('Mode B (Shared Query)')).toBeInTheDocument();
    expect(screen.getByText(/CSS 비격리 오염 실험/i)).toBeInTheDocument();
    expect(screen.getByText(/비로그인/i)).toBeInTheDocument();
  });
});
