/**
 * @file CatalogErrorBanner.test.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description [EC-02, EC-03] CatalogErrorBanner 에러 메시지, 다시 시도 버튼 및 DEV 스키마 진단 블록 렌더링 단위 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { CatalogErrorReport } from '../model/catalog-schema';
import { CatalogErrorBanner } from './CatalogErrorBanner';

describe('CatalogErrorBanner (EC-02, EC-03)', () => {
  const baseReport: CatalogErrorReport = {
    code: 'OUT_OF_STOCK',
    userMessage: '선택하신 상품의 재고가 부족합니다.',
    devDetails: [],
  };

  it('EC-02: onRetry가 생략되면 에러 안내 문구만 표시하고 다시 시도 버튼은 렌더링하지 않는다', () => {
    render(<CatalogErrorBanner titlePrefix="장바구니 담기 실패" report={baseReport} />);

    const alertBox = screen.getByRole('alert');
    expect(alertBox).toHaveTextContent(
      '장바구니 담기 실패 (OUT_OF_STOCK): 선택하신 상품의 재고가 부족합니다.',
    );
    expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('dev-error-details')).not.toBeInTheDocument();
  });

  it('EC-03: onRetry가 전달되면 다시 시도 버튼을 렌더링하고 클릭 시 콜백을 호출한다', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <CatalogErrorBanner
        titlePrefix="상품 목록 조회 실패"
        report={{
          code: 'DB_ERROR',
          userMessage: '일시적인 상품 조회 오류가 발생했습니다.',
          devDetails: [],
        }}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      '상품 목록 조회 실패 (DB_ERROR): 일시적인 상품 조회 오류가 발생했습니다.',
    );

    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('EC-02: devDetails가 존재하면 DEV 상세 진단 블록을 함께 렌더링한다', () => {
    render(
      <CatalogErrorBanner
        titlePrefix="상품 목록 조회 실패"
        report={{
          code: 'RESPONSE_SCHEMA_INVALID',
          userMessage: '데이터 스키마 불일치가 발생했습니다.',
          devDetails: [
            {
              path: '[0].price',
              code: 'invalid_type',
              message: 'Expected number, received string',
            },
          ],
        }}
      />,
    );

    const devDetailsBox = screen.getByTestId('dev-error-details');
    expect(devDetailsBox).toBeInTheDocument();
    expect(devDetailsBox).toHaveTextContent('[0].price (invalid_type)');
  });
});
