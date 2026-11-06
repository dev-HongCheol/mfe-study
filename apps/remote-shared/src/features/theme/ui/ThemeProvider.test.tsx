/**
 * @file ThemeProvider.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-05] ThemeProvider 및 useTheme 훅의 실시간 4종 테마 전환, 루트 CSS 변수 주입, 이벤트 동기화 테스트입니다.
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { MFE_EVENTS, mfeEventBus } from '../../utils/model/event-bus.js';
import { Z_INDEX_TOKENS } from '../model/tokens.js';
import { ThemeProvider, useTheme } from './ThemeProvider.js';

/**
 * ThemeProvider 상태를 읽고 변경하는 테스트용 소비자 컴포넌트
 *
 * @returns 테마 상태 확인 및 변경 버튼 UI
 */
function ThemeConsumerHarness() {
  const { theme, setTheme, availableThemes } = useTheme();
  return (
    <div>
      <span data-testid="current-theme">{theme}</span>
      <span data-testid="theme-count">{availableThemes.length}</span>
      <button type="button" onClick={() => setTheme('dark')}>
        Switch Dark
      </button>
    </div>
  );
}

describe('ThemeProvider & useTheme (TC-05)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-mfe-theme');
  });

  it('기본 테마(indigo)와 Z_INDEX_TOKENS를 루트에 주입하고 setTheme 호출 및 외부 mfe:theme-changed 이벤트와 양방향 동기화된다', async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <ThemeConsumerHarness />
      </ThemeProvider>,
    );

    // 1) 초기 상태 검증
    expect(screen.getByTestId('current-theme')).toHaveTextContent('indigo');
    expect(screen.getByTestId('theme-count')).toHaveTextContent('4');
    expect(document.documentElement.getAttribute('data-mfe-theme')).toBe('indigo');
    expect(document.documentElement.style.getPropertyValue('--mfe-z-dropdown')).toBe(
      String(Z_INDEX_TOKENS.dropdown),
    );

    // 2) setTheme('dark') 클릭 시 DOM 속성 및 localStorage 동기화 검증
    await user.click(screen.getByRole('button', { name: 'Switch Dark' }));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-mfe-theme')).toBe('dark');
    expect(window.localStorage.getItem('mfe:shared:theme')).toBe(JSON.stringify('dark'));

    // 3) 외부 마이크로 앱이 mfe:theme-changed 이벤트를 발행했을 때 자동 반영 검증
    act(() => {
      mfeEventBus.emit(MFE_EVENTS.THEME_CHANGED, {
        theme: 'emerald',
        timestamp: '2026-11-02T15:00:00.000Z',
      });
    });

    expect(screen.getByTestId('current-theme')).toHaveTextContent('emerald');
    expect(document.documentElement.getAttribute('data-mfe-theme')).toBe('emerald');
  });
});
