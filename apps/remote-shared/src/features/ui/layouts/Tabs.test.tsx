/**
 * @file Tabs.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-07] ArkTabs.RootProps를 Omit 상속한 Tabs 레이아웃의 탭 전환 및 onChange 콜백 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs.js';

describe('Tabs (TC-07)', () => {
  it('탭 트리거 클릭 시 활성 패널 콘텐츠를 전환하고 단일 문자열 값으로 onChange를 호출한다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <Tabs
        defaultValue="events"
        onChange={onChange}
        items={[
          { value: 'events', label: '이벤트 로그', content: <div>이벤트 로그 본문</div> },
          { value: 'schema', label: 'DB 스키마', content: <div>스키마 사전 본문</div> },
        ]}
      />,
    );

    expect(screen.getByText('이벤트 로그 본문')).toBeVisible();

    await user.click(screen.getByRole('tab', { name: 'DB 스키마' }));
    expect(onChange).toHaveBeenCalledWith('schema');
    expect(screen.getByText('스키마 사전 본문')).toBeVisible();
  });
});
