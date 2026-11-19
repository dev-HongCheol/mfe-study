/**
 * @file Select.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-02, TC-06, EC-01] 경계 캡슐화된 Select 컴포넌트의 포털 렌더링, 폼 속성 투과, 단일 문자열 onChange 및 disabled 차단 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

describe('Select (TC-02, TC-06, EC-01)', () => {
  it('TC-02: 트리거 클릭 시 포털 드롭다운 옵션을 표시하고 폼 속성(name, required, invalid, data-testid) 투과 및 단일 문자열 onChange를 동작시킨다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Select
        ariaLabel="사용자 전환"
        label="테스트 계정"
        name="userId"
        required
        invalid
        data-testid="user-select"
        value="user-1"
        options={[
          { label: '홍길동 (VIP)', value: 'user-1' },
          { label: '이순신 (일반)', value: 'user-2' },
        ]}
        onChange={onChange}
      />,
    );

    const root = screen.getByTestId('user-select');
    expect(root).toHaveAttribute('data-invalid', '');

    const hiddenSelect = root.querySelector('select[name="userId"]');
    expect(hiddenSelect).not.toBeNull();

    const trigger = screen.getByRole('combobox', { name: '사용자 전환' });
    await user.click(trigger);

    const option2 = await screen.findByRole('option', { name: /이순신 \(일반\)/ });
    await user.click(option2);

    expect(onChange).toHaveBeenCalledWith('user-2');
  });

  it('EC-01: disabled={true}일 때 트리거가 비활성화되고 클릭해도 드롭다운이 열리지 않으며 onChange가 호출되지 않는다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Select
        ariaLabel="비활성 선택"
        disabled
        value="user-1"
        options={[
          { label: '홍길동 (VIP)', value: 'user-1' },
          { label: '이순신 (일반)', value: 'user-2' },
        ]}
        onChange={onChange}
      />,
    );

    const trigger = screen.getByRole('combobox', { name: '비활성 선택' });
    expect(trigger).toBeDisabled();

    await user.click(trigger);
    expect(screen.queryByRole('option', { name: /이순신 \(일반\)/ })).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });
});
