/**
 * @file Heading.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-06] Heading 컴포넌트의 시맨틱 제목 레벨(h1 ~ h5) 렌더링 및 HTMLArkProps 투과 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Heading } from './Heading.js';

describe('Heading (TC-06)', () => {
  it('지정된 level(1~5)에 맞는 시맨틱 h1~h5 태그를 렌더링하고 기본 속성을 투과한다', () => {
    render(
      <div>
        <Heading level={1}>대제목</Heading>
        <Heading level={3} id="sec-title">
          소제목
        </Heading>
      </div>,
    );

    expect(screen.getByRole('heading', { level: 1, name: '대제목' }).tagName).toBe('H1');
    const h3 = screen.getByRole('heading', { level: 3, name: '소제목' });
    expect(h3.tagName).toBe('H3');
    expect(h3).toHaveAttribute('id', 'sec-title');
  });
});
