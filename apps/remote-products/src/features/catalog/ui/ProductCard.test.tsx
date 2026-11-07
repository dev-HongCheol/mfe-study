/**
 * @file ProductCard.test.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description [TC-04] ProductCard 상품 렌더링, 품절 비활성화 및 로딩 중 중복 클릭 차단 단위 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MOCK_PRODUCTS_SEED } from '../../../testing/msw/handlers.js';
import { ProductCard } from './ProductCard.js';

describe('ProductCard (TC-04)', () => {
  const normalProduct = MOCK_PRODUCTS_SEED[0] as (typeof MOCK_PRODUCTS_SEED)[number];
  const soldOutProduct = MOCK_PRODUCTS_SEED[5] as (typeof MOCK_PRODUCTS_SEED)[number];

  it('TC-04: 정상 재고 상품은 원화 포맷 가격과 재고 수량을 표시하고 클릭 시 onAddToCart를 1회 호출한다', async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();

    render(<ProductCard product={normalProduct} isAdding={false} onAddToCart={onAddToCart} />);

    expect(screen.getByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    expect(screen.getByText('129,000원')).toBeInTheDocument();
    expect(screen.getByText(/재고 15개/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /장바구니 담기/ }));
    expect(onAddToCart).toHaveBeenCalledTimes(1);
    expect(onAddToCart).toHaveBeenCalledWith(normalProduct);
  });

  it('TC-04: isAdding=true(요청 진행 중)일 때는 버튼이 disabled 및 aria-busy="true"가 되어 연타해도 호출되지 않는다', async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();

    render(<ProductCard product={normalProduct} isAdding={true} onAddToCart={onAddToCart} />);

    const addBtn = screen.getByRole('button', { name: /담는 중/ });
    expect(addBtn).toBeDisabled();
    expect(addBtn).toHaveAttribute('aria-busy', 'true');

    await user.click(addBtn);
    await user.click(addBtn);
    expect(onAddToCart).not.toHaveBeenCalled();
  });

  it('TC-04: 재고가 0개인 품절 상품은 품절 배지를 표시하고 담기 버튼을 비활성화한다', () => {
    const onAddToCart = vi.fn();

    render(<ProductCard product={soldOutProduct} isAdding={false} onAddToCart={onAddToCart} />);

    expect(screen.getByText('품절')).toBeInTheDocument();
    const soldOutBtn = screen.getByRole('button', { name: '품절된 상품' });
    expect(soldOutBtn).toBeDisabled();
  });
});
