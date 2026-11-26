/**
 * @file RemoteErrorBoundary.test.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description [TC-06, EC-04] RemoteErrorBoundary의 리모트 장애 격리, 폴백 UI 표시, [다시 시도] 정상 복구 및 remote_shared/ui 미의존 정적 불변식 단위 테스트입니다.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RemoteErrorBoundary } from './RemoteErrorBoundary';

/**
 * 테스트용 조건부 예외 발생 자식 컴포넌트입니다.
 */
function FaultyChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('장바구니 원격 서버(:3003) 연결 실패');
  }
  return <div data-testid="recovered-content">정상 렌더링 복구 완료</div>;
}

describe('RemoteErrorBoundary 단위 테스트 (TC-06, EC-04)', () => {
  it('TC-06: 하위 리모트 예외를 포착해 폴백 UI를 띄우고 [다시 시도] 클릭 시 정상 복구한다', async () => {
    const user = userEvent.setup();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function Harness() {
      const [shouldThrow, setShouldThrow] = useState(true);
      return (
        <div>
          <button type="button" onClick={() => setShouldThrow(false)}>
            장애 해소
          </button>
          <RemoteErrorBoundary remoteLabel="장바구니 리모트" remotePort={3003}>
            <FaultyChild shouldThrow={shouldThrow} />
          </RemoteErrorBoundary>
        </div>
      );
    }

    render(<Harness />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/장바구니 리모트/)).toBeInTheDocument();
    expect(screen.getByText(/장바구니 원격 서버\(:3003\) 연결 실패/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '장애 해소' }));
    await user.click(screen.getByRole('button', { name: /다시 시도/ }));

    expect(screen.getByTestId('recovered-content')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });

  it('EC-04: RemoteErrorBoundary 소스는 remote_shared/ui에 의존하지 않아 공통 UI 서버 장애 시에도 동작한다', () => {
    const source = readFileSync(resolve(import.meta.dirname, 'RemoteErrorBoundary.tsx'), 'utf-8');
    expect(source).not.toMatch(/from\s+['"]remote_shared\/ui['"]/);
    expect(source).not.toMatch(/from\s+['"]@ark-ui\/react/);
  });
});
