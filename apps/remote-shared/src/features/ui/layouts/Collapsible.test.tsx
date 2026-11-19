/**
 * @file Collapsible.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-05, TC-07, EC-02] 경계 캡슐화된 Collapsible 레이아웃의 접기/펴기, defaultOpen 및 disabled 차단 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Collapsible } from './Collapsible';

describe('Collapsible (TC-05, TC-07, EC-02)', () => {
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

  it('TC-05: defaultOpen={true}일 때 초기 렌더링부터 본문이 표시되고 클릭 시 onOpenChange(false)를 호출한다', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Collapsible title="초기 펼침 패널" defaultOpen onOpenChange={onOpenChange}>
        <div>초기 본문</div>
      </Collapsible>,
    );

    expect(screen.getByText('초기 본문')).toBeVisible();

    await user.click(screen.getByRole('button', { name: /초기 펼침 패널/ }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('EC-02: disabled={true}일 때 트리거가 비활성화되고 클릭해도 onOpenChange가 호출되지 않는다', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <Collapsible title="잠긴 패널" disabled onOpenChange={onOpenChange}>
        <div>비공개 본문</div>
      </Collapsible>,
    );

    const trigger = screen.getByRole('button', { name: /잠긴 패널/ });
    expect(trigger).toBeDisabled();

    await user.click(trigger);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
