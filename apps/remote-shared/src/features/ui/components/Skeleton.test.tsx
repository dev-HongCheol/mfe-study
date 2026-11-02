/**
 * @file Skeleton.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-06] Skeleton 컴포넌트의 CLS 방지 프리셋 및 count 반복 렌더링·aria-hidden 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Skeleton } from './Skeleton.js';

describe('Skeleton (TC-06)', () => {
  it('count 숫자만큼 스켈레톤 블록을 반복 렌더링하고 aria-hidden="true" 속성을 부여한다', () => {
    render(<Skeleton variant="card" count={3} data-testid="card-skeleton" />);

    const items = screen.getAllByTestId('card-skeleton');
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item).toHaveAttribute('aria-hidden', 'true');
    }
  });
});
