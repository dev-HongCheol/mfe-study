/**
 * @file Stack.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description 표준 div 속성을 경계 캡슐화하여 상속하는 수직 배치(Column Flex) 스택 레이아웃입니다 ([Study 09]).
 */
import { ark } from '@ark-ui/react/factory';
import { clsx } from 'clsx';
import type { CSSProperties, ComponentPropsWithoutRef } from 'react';
import '../ui-styles.css';

/**
 * @description [Stack.tsx] 표준 div 속성을 상속하는 수직 스택 레이아웃 Props
 */
export interface StackProps extends ComponentPropsWithoutRef<'div'> {
  /** 수직 자식 요소 간격 프리셋 또는 CSS 길이 문자열 (기본값: 'md') */
  gap?: 'sm' | 'md' | 'lg' | string;
}

/** 간격 프리셋 매핑 */
const GAP_TOKEN_MAP: Record<string, string> = {
  sm: 'var(--mfe-space-sm, 0.5rem)',
  md: 'var(--mfe-space-md, 1rem)',
  lg: 'var(--mfe-space-lg, 1.5rem)',
};

/**
 * 섹션이나 폼 요소들을 수직 간격으로 정렬하는 Stack 레이아웃입니다.
 *
 * @param props - gap 및 표준 div 속성
 * @returns ark.div 엘리먼트
 */
export function Stack({ gap = 'md', style, className, children, ...restDivProps }: StackProps) {
  const mergedStyle: CSSProperties = {
    gap: GAP_TOKEN_MAP[gap] ?? gap,
    ...style,
  };

  return (
    <ark.div style={mergedStyle} className={clsx('mfe-ui-stack', className)} {...restDivProps}>
      {children}
    </ark.div>
  );
}
