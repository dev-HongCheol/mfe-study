/**
 * @file Badge.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-06] Badge 컴포넌트의 tone 스타일 클래스 및 HTMLArkProps<'span'> 투과 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge.js';

describe('Badge (TC-06)', () => {
  it('지정된 tone에 맞는 클래스와 텍스트를 렌더링한다', () => {
    render(
      <Badge tone="brand" data-testid="port-badge">
        Port 3004
      </Badge>,
    );

    const badge = screen.getByTestId('port-badge');
    expect(badge).toHaveTextContent('Port 3004');
    expect(badge.className).toContain('mfe-ui-badge--brand');
  });
});
