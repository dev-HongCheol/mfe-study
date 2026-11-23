/**
 * @file CartErrorBanner.test.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description [TC-04] CartErrorBanner의 DEV/PROD 환경별 진단 블록 이원화 및 [다시 시도] 복구 버튼 단위 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CartErrorBanner } from './CartErrorBanner';

describe('CartErrorBanner (TC-04)', () => {
  it('TC-04: DEV 리포트(devDetails 존재)에서는 스키마 불일치 필드 좌표를 표시하고 [다시 시도] 클릭 시 onRetry를 호출한다', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(
      <CartErrorBanner
        report={{
          code: 'RESPONSE_SCHEMA_INVALID',
          userMessage: '서버 응답 데이터 형식이 계약과 일치하지 않습니다.',
          devDetails: [{ path: '[0].createdAt', code: 'invalid_type', message: 'Expected string' }],
        }}
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/DEV 상세 진단/i)).toBeInTheDocument();
    expect(screen.getByText(/\[0\]\.createdAt/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /다시 시도/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('TC-04: PROD 리포트(devDetails 빈 배열)에서는 내부 스키마 진단 블록을 렌더링하지 않는다', () => {
    render(
      <CartErrorBanner
        report={{
          code: 'RESPONSE_SCHEMA_INVALID',
          userMessage: '일시적인 데이터 형식 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.',
          devDetails: [],
        }}
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.queryByText(/DEV 상세 진단/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /다시 시도/i })).not.toBeInTheDocument();
  });
});
