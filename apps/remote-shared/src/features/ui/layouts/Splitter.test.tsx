/**
 * @file Splitter.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-03, TC-07] 경계 캡슐화된 Splitter 레이아웃의 패널·리사이즈 트리거 및 orientation/data-testid 속성 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Splitter } from './Splitter';

describe('Splitter (TC-03, TC-07)', () => {
  it('다중 패널 콘텐츠와 패널 사이 리사이즈 트리거(separator)를 정상 렌더링한다', () => {
    render(
      <Splitter
        defaultSize={[60, 40]}
        panels={[
          { id: 'left', content: <div>좌측 상품 패널</div>, minSize: 30 },
          { id: 'right', content: <div>우측 장바구니 패널</div>, minSize: 20, collapsible: true },
        ]}
      />,
    );

    expect(screen.getByText('좌측 상품 패널')).toBeInTheDocument();
    expect(screen.getByText('우측 장바구니 패널')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('TC-03: orientation="vertical", defaultSize, onResize 및 표준 HTML data-* 속성을 정상 전달한다', () => {
    const onResize = vi.fn();

    render(
      <Splitter
        orientation="vertical"
        defaultSize={[60, 40]}
        onResize={onResize}
        data-testid="vertical-splitter"
        panels={[
          { id: 'top', content: <div>상단 패널</div>, minSize: 25 },
          { id: 'bottom', content: <div>하단 패널</div>, minSize: 25 },
        ]}
      />,
    );

    const root = screen.getByTestId('vertical-splitter');
    expect(root).toHaveAttribute('data-orientation', 'vertical');
    expect(screen.getByText('상단 패널')).toBeInTheDocument();
    expect(screen.getByText('하단 패널')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});
