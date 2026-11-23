/**
 * @file CartSummaryCard.test.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description [TC-03] CartSummaryCard의 총 품목 수·총 수량·원화 총액 렌더링 및 [전체 비우기] 버튼 동작 단위 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CartSummaryCard } from './CartSummaryCard';

describe('CartSummaryCard (TC-03)', () => {
  it('TC-03: 총 수량과 포맷된 총액을 표시하고 [장바구니 비우기] 클릭 시 onClearAll을 호출한다', async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();

    render(
      <CartSummaryCard
        totals={{ itemCount: 2, totalQuantity: 3, totalPrice: 213000 }}
        isClearing={false}
        onClearAll={onClearAll}
      />,
    );

    expect(screen.getByText(/2종/)).toBeInTheDocument();
    expect(screen.getByText(/3개/)).toBeInTheDocument();
    expect(screen.getByText('213,000원')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /장바구니 비우기/i }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it('TC-03: 항목이 0개이거나 isClearing=true이면 [장바구니 비우기] 버튼이 비활성화된다', () => {
    const { rerender } = render(
      <CartSummaryCard
        totals={{ itemCount: 0, totalQuantity: 0, totalPrice: 0 }}
        isClearing={false}
        onClearAll={vi.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /장바구니 비우기/i })).toBeDisabled();

    rerender(
      <CartSummaryCard
        totals={{ itemCount: 1, totalQuantity: 1, totalPrice: 10000 }}
        isClearing={true}
        onClearAll={vi.fn()}
      />,
    );

    const button = screen.getByRole('button', { name: /비우는 중|장바구니 비우기/i });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });
});
