/**
 * @file ProductCatalogContent.test.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description [TC-04, TC-06, EC-03] ProductCatalogContent 본문 4단 상태(로딩/에러/빈 결과/그리드) 분기 렌더링 단위 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MOCK_PRODUCTS_SEED } from '../../../testing/msw/handlers';
import { ProductCatalogContent } from './ProductCatalogContent';

describe('ProductCatalogContent (TC-04, TC-06, EC-03)', () => {
  const sampleProducts = MOCK_PRODUCTS_SEED.slice(0, 2);

  it('TC-06: isLoading=true일 때 6-카드 스켈레톤 그리드를 렌더링한다', () => {
    render(
      <ProductCatalogContent
        isLoading={true}
        queryError={null}
        products={[]}
        addingProductId={null}
        isMutationPending={false}
        isAuthenticated={true}
        onRetry={vi.fn()}
        onResetFilter={vi.fn()}
        onAddToCart={vi.fn()}
      />,
    );

    expect(screen.getByTestId('product-grid-skeleton')).toBeInTheDocument();
  });

  it('EC-03: queryError가 존재할 때 에러 배너와 다시 시도 버튼을 렌더링하고 클릭 시 onRetry를 호출한다', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <ProductCatalogContent
        isLoading={false}
        queryError={{
          code: 'DB_ERROR',
          userMessage: '조회 실패',
          devDetails: [],
        }}
        products={[]}
        addingProductId={null}
        isMutationPending={false}
        isAuthenticated={true}
        onRetry={onRetry}
        onResetFilter={vi.fn()}
        onAddToCart={vi.fn()}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      '상품 목록 조회 실패 (DB_ERROR): 조회 실패',
    );
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('EC-03: products가 빈 배열일 때 빈 상태 안내와 전체 상품 다시 보기 버튼을 렌더링한다', async () => {
    const user = userEvent.setup();
    const onResetFilter = vi.fn();

    render(
      <ProductCatalogContent
        isLoading={false}
        queryError={null}
        products={[]}
        addingProductId={null}
        isMutationPending={false}
        isAuthenticated={true}
        onRetry={vi.fn()}
        onResetFilter={onResetFilter}
        onAddToCart={vi.fn()}
      />,
    );

    expect(screen.getByText('조건에 일치하는 상품이 없습니다.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '전체 상품 다시 보기' }));
    expect(onResetFilter).toHaveBeenCalledTimes(1);
  });

  it('TC-04: 정상 조회 완료 시 상품 카드 목록을 렌더링하고 담기 클릭 시 onAddToCart를 호출한다', async () => {
    const user = userEvent.setup();
    const onAddToCart = vi.fn();

    render(
      <ProductCatalogContent
        isLoading={false}
        queryError={null}
        products={sampleProducts}
        addingProductId={null}
        isMutationPending={false}
        isAuthenticated={true}
        onRetry={vi.fn()}
        onResetFilter={vi.fn()}
        onAddToCart={onAddToCart}
      />,
    );

    expect(screen.getByText('기계식 무선 키보드 Pro')).toBeInTheDocument();
    const addButtons = screen.getAllByRole('button', { name: /장바구니 담기/ });
    await user.click(addButtons[0] as HTMLElement);
    expect(onAddToCart).toHaveBeenCalledWith(sampleProducts[0]);
  });
});
