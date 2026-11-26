/**
 * @file HostHeader.test.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description [TC-01, TC-02, TC-03, EC-01] HostHeader의 호스트 식별 배지, 사용자 전환, 4종 테마 전환, 1.5초 지연 토글 및 인증 에러 배지 단위 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from 'remote_shared/theme';
import { describe, expect, it, vi } from 'vitest';
import { MOCK_USERS } from '../../../testing/msw/handlers';
import { HostHeader } from './HostHeader';

describe('HostHeader 단위 테스트 (TC-01, TC-02, TC-03, EC-01)', () => {
  it('TC-01~03: 호스트 식별 배지, 사용자 전환, 테마 전환, 1.5초 로딩 지연 토글 콜백이 정상 동작한다', async () => {
    const user = userEvent.setup();
    const onSelectUser = vi.fn();
    const onToggleDelay = vi.fn();

    render(
      <ThemeProvider defaultTheme="indigo">
        <HostHeader
          users={MOCK_USERS}
          activeUserId={null}
          isAuthPending={false}
          authErrorMessage={null}
          simulateDelay={false}
          onSelectUser={onSelectUser}
          onToggleDelay={onToggleDelay}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText(/Vite Host/)).toBeInTheDocument();
    expect(screen.getByText(/Port 3000/)).toBeInTheDocument();

    const userSelect = screen.getByLabelText('로그인 사용자 선택');
    await user.selectOptions(userSelect, 'user-1');
    expect(onSelectUser).toHaveBeenCalledWith('user-1');

    const themeSelect = screen.getByLabelText('실시간 테마 선택');
    await user.selectOptions(themeSelect, 'dark');
    expect(document.documentElement.dataset.mfeTheme).toBe('dark');

    await user.click(screen.getByRole('button', { name: /1\.5초 지연 시뮬레이션/ }));
    expect(onToggleDelay).toHaveBeenCalledTimes(1);
  });

  it('EC-01: 인증 에러 메시지가 전달되면 role="alert" 영역에 한글 안내를 표시한다', () => {
    render(
      <ThemeProvider>
        <HostHeader
          users={MOCK_USERS}
          activeUserId={null}
          isAuthPending={false}
          authErrorMessage="요청한 사용자를 찾을 수 없습니다."
          simulateDelay={false}
          onSelectUser={vi.fn()}
          onToggleDelay={vi.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('요청한 사용자를 찾을 수 없습니다.');
  });
});
