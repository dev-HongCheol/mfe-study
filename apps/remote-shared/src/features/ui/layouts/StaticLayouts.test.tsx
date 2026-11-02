/**
 * @file StaticLayouts.test.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-07] 정적 레이아웃 5종(Container, Grid, Flex, Stack, Card) 및 exposed/ui의 clsx 재노출 테스트입니다.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card, Container, Flex, Grid, Stack, clsx } from '../../../exposed/ui.js';

describe('StaticLayouts & clsx (TC-07)', () => {
  it('Container, Stack, Grid, Card, Flex 5종이 HTMLArkProps 속성을 투과하며 정상 합성되고 clsx가 재노출된다', () => {
    expect(clsx('mfe-a', false && 'mfe-b', 'mfe-c')).toBe('mfe-a mfe-c');

    render(
      <Container data-testid="layout-container">
        <Stack gap="lg">
          <Grid columns={2} gap="md">
            <Card elevated data-testid="layout-card">
              <Flex justify="between" align="center" data-testid="layout-flex">
                <span>상품명</span>
                <span>129,000원</span>
              </Flex>
            </Card>
          </Grid>
        </Stack>
      </Container>,
    );

    expect(screen.getByTestId('layout-container')).toBeInTheDocument();
    expect(screen.getByTestId('layout-card')).toBeInTheDocument();
    expect(screen.getByTestId('layout-flex')).toHaveTextContent('129,000원');
  });
});
