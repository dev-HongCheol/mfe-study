/**
 * @file Select.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-06] Ark UI Select.RootProps를 Omit 상속한 Select 컴포넌트의 포털 렌더링 및 단일 문자열 onChange 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select.js';

describe('Select (TC-06)', () => {
  it('트리거 클릭 시 포털 드롭다운 옵션을 표시하고 항목 선택 시 단일 문자열 값으로 onChange를 호출한다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Select
        ariaLabel="사용자 전환"
        label="테스트 계정"
        value="user-1"
        options={[
          { label: '홍길동 (VIP)', value: 'user-1' },
          { label: '이순신 (일반)', value: 'user-2' },
        ]}
        onChange={onChange}
      />,
    );

    const trigger = screen.getByRole('combobox', { name: '사용자 전환' });
    await user.click(trigger);

    const option2 = await screen.findByRole('option', { name: /이순신 \(일반\)/ });
    await user.click(option2);

    expect(onChange).toHaveBeenCalledWith('user-2');
  });
});
