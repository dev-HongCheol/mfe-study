/**
 * @file CartContent.test.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description [TC-04] CartContent의 5대 상태(비로그인 · 로딩 스켈레톤 · 조회 에러 · 빈 장바구니 · 항목 목록) Early Return 분기 단위 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CartContent } from './CartContent';

const BASE_PROPS = {
  isAuthenticated: true,
  isLoading: false,
  errorReport: null,
  items: [],
  mutatingItemId: null,
  isClearing: false,
  onRetry: vi.fn(),
  onIncrement: vi.fn(),
  onDelete: vi.fn(),
  onClearAll: vi.fn(),
};

describe('CartContent (TC-04)', () => {
  it('TC-04: 비로그인 상태에서는 로그인 필요 안내 UI를 렌더링한다', () => {
    render(<CartContent {...BASE_PROPS} isAuthenticated={false} />);
    expect(screen.getByText(/로그인 후 장바구니를 확인할 수 있습니다/i)).toBeInTheDocument();
  });

  it('TC-04: 로딩 상태에서는 CLS 방지 스켈레톤(CartSkeleton)을 렌더링한다', () => {
    render(<CartContent {...BASE_PROPS} isLoading={true} />);
    expect(screen.getByTestId('cart-skeleton')).toBeInTheDocument();
  });

  it('TC-04: 에러 상태에서는 에러 배너와 [다시 시도] 버튼을 렌더링한다', () => {
    render(
      <CartContent
        {...BASE_PROPS}
        errorReport={{
          code: 'INTERNAL_ERROR',
          userMessage: '장바구니를 불러오지 못했습니다.',
          devDetails: [],
        }}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('장바구니를 불러오지 못했습니다.');
    expect(screen.getByRole('button', { name: /다시 시도/i })).toBeInTheDocument();
  });

  it('TC-04: 빈 목록에서는 빈 장바구니 안내를, 정상 목록에서는 항목 행과 요약 카드를 렌더링한다', () => {
    const { rerender } = render(<CartContent {...BASE_PROPS} items={[]} />);
    expect(screen.getByText(/장바구니가 비어 있습니다/i)).toBeInTheDocument();

    rerender(
      <CartContent
        {...BASE_PROPS}
        items={[
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
        ]}
      />,
    );

    expect(screen.getByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /장바구니 비우기/i })).toBeInTheDocument();
  });
});
