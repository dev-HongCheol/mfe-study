/**
 * @file Tabs.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-04, TC-07, EC-03] 경계 캡슐화된 Tabs 레이아웃의 비제어/제어 모드 전환, orientation 및 lazyMount 경계 테스트입니다.
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Tabs } from './Tabs';

describe('Tabs (TC-04, TC-07, EC-03)', () => {
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

  it('TC-04: 제어 모드(value)와 orientation="vertical"이 정상 동작한다', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const items = [
      { value: 'events', label: '이벤트 로그', content: <div>이벤트 로그 본문</div> },
      { value: 'schema', label: 'DB 스키마', content: <div>스키마 사전 본문</div> },
    ];

    const { rerender } = render(
      <Tabs
        value="events"
        orientation="vertical"
        onChange={onChange}
        data-testid="controlled-tabs"
        items={items}
      />,
    );

    expect(screen.getByTestId('controlled-tabs')).toHaveAttribute('data-orientation', 'vertical');

    await user.click(screen.getByRole('tab', { name: 'DB 스키마' }));
    expect(onChange).toHaveBeenCalledWith('schema');

    rerender(
      <Tabs
        value="schema"
        orientation="vertical"
        onChange={onChange}
        data-testid="controlled-tabs"
        items={items}
      />,
    );
    await waitFor(() => {
      expect(screen.getByText('스키마 사전 본문')).toBeVisible();
    });
  });

  it('EC-03: lazyMount={true}일 때 비활성 탭 콘텐츠는 최초 활성화 전 DOM에 마운트되지 않고 클릭 후 마운트된다', async () => {
    const user = userEvent.setup();

    render(
      <Tabs
        defaultValue="first"
        lazyMount
        items={[
          { value: 'first', label: '첫 번째', content: <div>첫 번째 본문</div> },
          { value: 'second', label: '두 번째', content: <div>지연 마운트 본문</div> },
        ]}
      />,
    );

    expect(screen.getByText('첫 번째 본문')).toBeVisible();
    expect(screen.queryByText('지연 마운트 본문')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: '두 번째' }));
    expect(screen.getByText('지연 마운트 본문')).toBeVisible();
  });
});
