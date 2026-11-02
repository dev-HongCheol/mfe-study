/**
 * @file Card.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description Ark UI의 HTMLArkProps<'div'>를 기본 상속하고 시맨틱 서피스 배경·테두리 토큰을 적용한 카드 레이아웃입니다.
 */
import { type HTMLArkProps, ark } from '@ark-ui/react/factory';
import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import '../ui-styles.css';

/**
 * @description [Card.tsx] HTMLArkProps<'div'>를 기본 상속하는 카드 서피스 레이아웃 Props
 */
export interface CardProps extends HTMLArkProps<'div'> {
  /** 내부 패딩 프리셋 ('sm' | 'md' | 'lg', 기본값: 'md') */
  padding?: 'sm' | 'md' | 'lg';

  /** 입체 그림자 강조 여부 (기본값: false) */
  elevated?: boolean;
}

/** 패딩 프리셋별 CSS 변수 매핑 */
const PADDING_TOKEN_MAP: Record<NonNullable<CardProps['padding']>, string> = {
  sm: 'var(--mfe-space-sm, 0.5rem)',
  md: 'var(--mfe-space-md, 1rem)',
  lg: 'var(--mfe-space-lg, 1.5rem)',
};

/**
 * 테마 전환(Dark 모드 포함)에 맞춰 배경·테두리가 자동 변경되는 공통 Card 레이아웃입니다.
 *
 * @param props - padding, elevated 및 HTMLArkProps<'div'>
 * @returns ark.div 엘리먼트
 */
export function Card({
  padding = 'md',
  elevated = false,
  style,
  className,
  children,
  ...restArkProps
}: CardProps) {
  const mergedStyle: CSSProperties = {
    padding: PADDING_TOKEN_MAP[padding],
    ...style,
  };

  return (
    <ark.div
      style={mergedStyle}
      className={clsx('mfe-ui-card', elevated && 'mfe-ui-card--elevated', className)}
      {...restArkProps}
    >
      {children}
    </ark.div>
  );
}
