/**
 * @file Splitter.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-07] ArkSplitter.RootProps를 Omit 상속한 Splitter 레이아웃의 패널 및 리사이즈 트리거 렌더링 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Splitter } from './Splitter.js';

describe('Splitter (TC-07)', () => {
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
});
