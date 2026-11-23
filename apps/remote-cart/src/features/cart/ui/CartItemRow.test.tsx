/**
 * @file CartItemRow.test.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description [TC-03] CartItemRow의 상품 정보·담은 시각·출처 배지·금액 포맷 렌더링 및 중복 클릭 방지(isMutating) 단위 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CartItemView } from '../model/cart-schema';
import { CartItemRow } from './CartItemRow';

const SAMPLE_ITEM: CartItemView = {
  id: 1,
  userId: 'user-1',
  productId: 1,
  productName: '기계식 무선 키보드 Pro',
  price: 129000,
  category: 'electronics',
  quantity: 2,
  addedFromHost: 'vite',
  createdAt: '2026-11-23 14:00:00',
};

describe('CartItemRow (TC-03)', () => {
  it('TC-03: 상품명, 출처 배지, 단가·소계, 담은 시각을 표시하고 [+1]/[삭제] 클릭 시 콜백을 1회 호출한다', async () => {
    const user = userEvent.setup();
    const onIncrement = vi.fn();
    const onDelete = vi.fn();

    render(
      <CartItemRow
        item={SAMPLE_ITEM}
        isMutating={false}
        onIncrement={onIncrement}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    expect(screen.getByText('258,000원')).toBeInTheDocument();
    expect(screen.getByText(/vite/i)).toBeInTheDocument();
    expect(screen.getByText(/2026\.11\.23/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /\+1/i }));
    await user.click(screen.getByRole('button', { name: /삭제/i }));

    expect(onIncrement).toHaveBeenCalledTimes(1);
    expect(onIncrement).toHaveBeenCalledWith(SAMPLE_ITEM);
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(SAMPLE_ITEM);
  });

  it('TC-03: isMutating=true 상태에서는 [+1]과 [삭제] 버튼이 잠겨 중복 클릭이 차단된다', async () => {
    const user = userEvent.setup();
    const onIncrement = vi.fn();
    const onDelete = vi.fn();

    render(
      <CartItemRow
        item={SAMPLE_ITEM}
        isMutating={true}
        onIncrement={onIncrement}
        onDelete={onDelete}
      />,
    );

    const incrementBtn = screen.getByRole('button', { name: /\+1/i });
    const deleteBtn = screen.getByRole('button', { name: /삭제/i });

    expect(incrementBtn).toBeDisabled();
    expect(deleteBtn).toBeDisabled();

    await user.click(incrementBtn);
    await user.click(deleteBtn);

    expect(onIncrement).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();
  });
});
