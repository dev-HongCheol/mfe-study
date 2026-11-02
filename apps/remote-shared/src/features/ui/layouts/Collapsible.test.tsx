/**
 * @file Collapsible.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-07] ArkCollapsible.RootProps를 Omit 상속한 Collapsible 레이아웃의 접기/펴기 및 boolean onOpenChange 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Collapsible } from './Collapsible.js';

describe('Collapsible (TC-07)', () => {
  it('트리거 버튼 클릭 시 본문 영역을 펼치고 boolean 값으로 onOpenChange를 호출한다', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Collapsible title="MfeInspector 디버거 열기" onOpenChange={onOpenChange}>
        <div>디버거 상세 정보</div>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button', { name: /MfeInspector 디버거 열기/ });
    await user.click(trigger);

    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(screen.getByText('디버거 상세 정보')).toBeVisible();
  });
});
