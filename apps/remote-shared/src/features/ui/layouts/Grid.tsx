/**
 * @file Grid.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description Ark UI의 HTMLArkProps<'div'>를 기본 상속하는 CSS Grid 레이아웃 컴포넌트입니다.
 */
import { type HTMLArkProps, ark } from '@ark-ui/react/factory';
import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import '../ui-styles.css';

/**
 * @description [Grid.tsx] HTMLArkProps<'div'>를 기본 상속하는 그리드 레이아웃 Props
 */
export interface GridProps extends HTMLArkProps<'div'> {
  /** 그리드 열 개수(숫자 입력 시 repeat(N, minmax(0, 1fr))) 또는 커스텀 gridTemplateColumns 문자열 (기본값: 2) */
  columns?: number | string;

  /** 그리드 셀 간격 프리셋 또는 CSS 길이 문자열 (기본값: 'md') */
  gap?: 'sm' | 'md' | 'lg' | string;
}

/** 간격 프리셋별 시맨틱 CSS 변수 매핑 */
const GAP_TOKEN_MAP: Record<string, string> = {
  sm: 'var(--mfe-space-sm, 0.5rem)',
  md: 'var(--mfe-space-md, 1rem)',
  lg: 'var(--mfe-space-lg, 1.5rem)',
};

/**
 * 상품 카드 목록 등을 균등한 열과 간격으로 배치하는 Grid 레이아웃 컴포넌트입니다.
 *
 * @param props - columns, gap 및 HTMLArkProps<'div'>
 * @returns ark.div 엘리먼트
 */
export function Grid({
  columns = 2,
  gap = 'md',
  style,
  className,
  children,
  ...restArkProps
}: GridProps) {
  const templateColumns =
    typeof columns === 'number' ? `repeat(${columns}, minmax(0, 1fr))` : columns;

  const mergedStyle: CSSProperties = {
    gridTemplateColumns: templateColumns,
    gap: GAP_TOKEN_MAP[gap] ?? gap,
    ...style,
  };

  return (
    <ark.div style={mergedStyle} className={clsx('mfe-ui-grid', className)} {...restArkProps}>
      {children}
    </ark.div>
  );
}
