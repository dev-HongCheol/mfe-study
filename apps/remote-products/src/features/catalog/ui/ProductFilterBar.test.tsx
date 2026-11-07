/**
 * @file ProductFilterBar.test.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description [TC-03, EC-01] ProductFilterBar 카테고리 선택 및 React Hook Form + Zod 검색 폼 테스트입니다.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductFilterBar } from './ProductFilterBar.js';

describe('ProductFilterBar (TC-03, EC-01)', () => {
  it('TC-03: 카테고리 Select 변경 시 즉시 onFilterChange가 호출된다', async () => {
    const onFilterChange = vi.fn();
    const onReset = vi.fn();

    render(
      <ProductFilterBar
        filter={{ category: 'all', search: '' }}
        totalCount={6}
        onFilterChange={onFilterChange}
        onReset={onReset}
      />,
    );

    const categorySelect = screen.getByLabelText('상품 카테고리 선택');
    fireEvent.change(categorySelect, { target: { value: 'electronics' } });

    expect(onFilterChange).toHaveBeenCalledWith({
      category: 'electronics',
      search: '',
    });
  });

  it('TC-03: 키워드 입력 후 검색 제출 시 공백이 제거된 검색어로 onFilterChange가 호출되고 초기화 버튼이 동작한다', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const onReset = vi.fn();

    render(
      <ProductFilterBar
        filter={{ category: 'electronics', search: '기존검색어' }}
        totalCount={2}
        onFilterChange={onFilterChange}
        onReset={onReset}
      />,
    );

    const searchInput = screen.getByLabelText('상품 검색어 입력');
    await user.clear(searchInput);
    await user.type(searchInput, '  마우스  ');
    await user.click(screen.getByRole('button', { name: '검색' }));

    await waitFor(() => {
      expect(onFilterChange).toHaveBeenCalledWith({
        category: 'electronics',
        search: '마우스',
      });
    });

    await user.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('EC-01: 50자 초과 검색어 제출 시 Zod 검증 에러 메시지를 표시하고 onFilterChange를 호출하지 않는다', async () => {
    const user = userEvent.setup();
    const onFilterChange = vi.fn();
    const onReset = vi.fn();

    render(
      <ProductFilterBar
        filter={{ category: 'all', search: '' }}
        totalCount={6}
        onFilterChange={onFilterChange}
        onReset={onReset}
      />,
    );

    const searchInput = screen.getByLabelText('상품 검색어 입력');
    fireEvent.change(searchInput, { target: { value: '가'.repeat(51) } });
    await user.click(screen.getByRole('button', { name: '검색' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('최대 50자');
    expect(onFilterChange).not.toHaveBeenCalled();
  });
});
