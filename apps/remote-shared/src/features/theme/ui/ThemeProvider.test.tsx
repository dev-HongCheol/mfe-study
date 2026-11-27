/**
 * @file ThemeProvider.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-01, TC-02, TC-05, EC-01] ThemeProvider 및 useTheme 훅의 실시간 4종 테마 전환, sourceId 발신자 식별, 자기 에코 차단 및 ThemeContext 기본값 폴백 테스트입니다.
 */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ThemeMode } from '../../utils/model/contracts';
import { MFE_EVENTS, mfeEventBus } from '../../utils/model/event-bus';
import { Z_INDEX_TOKENS } from '../model/tokens';
import { ThemeProvider, useTheme } from './ThemeProvider';

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
      <button type="button" onClick={() => setTheme('rose')}>
        Switch Rose
      </button>
      <button type="button" onClick={() => setTheme('emerald')}>
        Switch Emerald
      </button>
      <button type="button" onClick={() => setTheme('invalid-theme' as ThemeMode)}>
        Switch Invalid
      </button>
    </div>
  );
}

describe('ThemeProvider & useTheme (TC-01, TC-02, TC-05, EC-01)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute('data-mfe-theme');
  });

  it('TC-05: 기본 테마(indigo)와 Z_INDEX_TOKENS를 루트에 주입하고 setTheme 호출 및 외부 mfe:theme-changed 이벤트와 양방향 동기화된다', async () => {
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

  it('TC-01: setTheme 호출 시 remote-shared-theme:<uuid> sourceId를 첨부하며 동일 마운트에서는 ID를 유지하고 별도 인스턴스는 고유 ID를 발급한다', async () => {
    const user = userEvent.setup();
    const inspectorSpy = vi.fn();
    const unsubscribe = mfeEventBus.subscribe(MFE_EVENTS.THEME_CHANGED, inspectorSpy);

    const firstMount = render(
      <ThemeProvider>
        <ThemeConsumerHarness />
      </ThemeProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Switch Dark' }));
    await user.click(screen.getByRole('button', { name: 'Switch Rose' }));

    expect(inspectorSpy).toHaveBeenCalledTimes(2);
    const firstSourceId = inspectorSpy.mock.calls[0]?.[1]?.sourceId as string | undefined;
    const secondSourceId = inspectorSpy.mock.calls[1]?.[1]?.sourceId as string | undefined;

    expect(firstSourceId).toMatch(/^remote-shared-theme:.+/);
    expect(secondSourceId).toBe(firstSourceId);

    firstMount.unmount();

    // 새 ThemeProvider 마운트 인스턴스는 이전 인스턴스와 구별되는 고유 sourceId를 발급해야 함
    render(
      <ThemeProvider>
        <ThemeConsumerHarness />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Switch Emerald' }));

    expect(inspectorSpy).toHaveBeenCalledTimes(3);
    const nextInstanceSourceId = inspectorSpy.mock.calls[2]?.[1]?.sourceId as string | undefined;
    expect(nextInstanceSourceId).toMatch(/^remote-shared-theme:.+/);
    expect(nextInstanceSourceId).not.toBe(firstSourceId);

    unsubscribe();
  });

  it('TC-02: ThemeProvider는 자기 sourceId와 일치하는 이벤트(Self-Echo)를 차단하고 외부 sourceId 및 레거시 이벤트만 정상 동기화한다', async () => {
    const user = userEvent.setup();
    const inspectorSpy = vi.fn();
    const unsubscribe = mfeEventBus.subscribe(MFE_EVENTS.THEME_CHANGED, inspectorSpy);
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(
      <ThemeProvider>
        <ThemeConsumerHarness />
      </ThemeProvider>,
    );

    // 1) setTheme('dark') 발행 및 sourceId 포착 (자기 에코로 인한 중복 저장 없이 1회만 기록)
    await user.click(screen.getByRole('button', { name: 'Switch Dark' }));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(setItemSpy).toHaveBeenCalledTimes(1);

    const ownSourceId = inspectorSpy.mock.calls[0]?.[1]?.sourceId as string | undefined;
    expect(ownSourceId).toMatch(/^remote-shared-theme:.+/);

    // 2) 자기 자신의 sourceId로 다른 테마('rose')를 발행해도 ignoreSourceId로 즉시 차단되어 'dark'가 유지되어야 함
    act(() => {
      mfeEventBus.emit(
        MFE_EVENTS.THEME_CHANGED,
        {
          theme: 'rose',
          timestamp: '2026-11-28T00:50:00.000Z',
        },
        { sourceId: ownSourceId },
      );
    });
    expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
    expect(setItemSpy).toHaveBeenCalledTimes(1);

    // 3) 외부 앱의 sourceId로 발행된 이벤트는 정상 수신 및 동기화됨
    act(() => {
      mfeEventBus.emit(
        MFE_EVENTS.THEME_CHANGED,
        {
          theme: 'emerald',
          timestamp: '2026-11-28T00:51:00.000Z',
        },
        { sourceId: 'host-vite:peer-1' },
      );
    });
    expect(screen.getByTestId('current-theme')).toHaveTextContent('emerald');
    expect(document.documentElement.getAttribute('data-mfe-theme')).toBe('emerald');

    // 4) 구버전 2인자(sourceId 미첨부) 레거시 이벤트도 하위 호환으로 정상 동기화됨
    act(() => {
      mfeEventBus.emit(MFE_EVENTS.THEME_CHANGED, {
        theme: 'rose',
        timestamp: '2026-11-28T00:52:00.000Z',
      });
    });
    expect(screen.getByTestId('current-theme')).toHaveTextContent('rose');

    setItemSpy.mockRestore();
    unsubscribe();
  });

  it('EC-01: 잘못된 테마 문자열을 차단하고 ThemeProvider 외부 기본 컨텍스트 setTheme에서도 폴백 sourceId를 첨부한다', async () => {
    const user = userEvent.setup();
    const inspectorSpy = vi.fn();
    const unsubscribe = mfeEventBus.subscribe(MFE_EVENTS.THEME_CHANGED, inspectorSpy);

    // 1) ThemeProvider 내부에서 잘못된 테마 호출 시 상태 변화 및 이벤트 발행 0회
    const providerMount = render(
      <ThemeProvider>
        <ThemeConsumerHarness />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Switch Invalid' }));
    expect(screen.getByTestId('current-theme')).toHaveTextContent('indigo');
    expect(inspectorSpy).not.toHaveBeenCalled();
    providerMount.unmount();

    // 2) ThemeProvider 없이 기본 ThemeContext.setTheme 호출 시에도 폴백 sourceId가 첨부되고 무효 테마는 차단됨
    render(<ThemeConsumerHarness />);
    await user.click(screen.getByRole('button', { name: 'Switch Invalid' }));
    expect(inspectorSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Switch Emerald' }));
    expect(inspectorSpy).toHaveBeenCalledTimes(1);
    const fallbackSourceId = inspectorSpy.mock.calls[0]?.[1]?.sourceId as string | undefined;
    expect(fallbackSourceId).toMatch(/^remote-shared-theme-fallback:.+/);

    unsubscribe();
  });
});
