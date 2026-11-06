/**
 * @file Button.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-06] Button 컴포넌트의 HTMLArkProps 상속 투과, 변형 클래스 및 isLoading 잠금(disabled + aria-busy) 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './Button.js';

describe('Button (TC-06)', () => {
  it('기본 클릭 이벤트와 HTMLArkProps(type, data-*) 속성을 정상 투과하고 isLoading일 때 disabled 및 aria-busy를 강제한다', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    const { rerender } = render(
      <Button variant="primary" size="lg" onClick={onClick} data-custom="ark-btn">
        장바구니 담기
      </Button>,
    );

    const btn = screen.getByRole('button', { name: '장바구니 담기' });
    expect(btn).toHaveAttribute('data-custom', 'ark-btn');
    expect(btn).not.toBeDisabled();

    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);

    // isLoading 활성화 시 중복 클릭 차단 및 aria-busy="true" 검증
    rerender(
      <Button isLoading onClick={onClick}>
        처리 중
      </Button>,
    );

    const loadingBtn = screen.getByRole('button', { name: /처리 중/ });
    expect(loadingBtn).toBeDisabled();
    expect(loadingBtn).toHaveAttribute('aria-busy', 'true');

    await user.click(loadingBtn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
