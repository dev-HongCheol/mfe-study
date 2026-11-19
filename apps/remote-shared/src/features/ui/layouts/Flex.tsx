/**
 * @file Flex.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description 표준 div 속성을 경계 캡슐화하여 상속하고 min-width: 0 말줄임 방어가 기본 적용된 Flexbox 레이아웃입니다 ([Study 05 #16, Study 09]).
 */
import { ark } from '@ark-ui/react/factory';
import { clsx } from 'clsx';
import type { CSSProperties, ComponentPropsWithoutRef } from 'react';
import '../ui-styles.css';

/**
 * @description [Flex.tsx] 표준 div 속성을 상속하는 플렉스 레이아웃 Props
 */
export interface FlexProps extends ComponentPropsWithoutRef<'div'> {
  /** 플렉스 주축 방향 (기본값: 'row') */
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';

  /** 교차축 정렬 방식 */
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';

  /** 주축 정렬 방식 */
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';

  /** 자식 요소 간격 프리셋 또는 CSS 길이 문자열 (기본값: 'sm') */
  gap?: 'sm' | 'md' | 'lg' | string;

  /** 줄바꿈 허용 여부 */
  wrap?: 'nowrap' | 'wrap';
}

/** justify 약어를 표준 CSS justify-content 값으로 변환하는 맵 */
const JUSTIFY_MAP: Record<NonNullable<FlexProps['justify']>, CSSProperties['justifyContent']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
  around: 'space-around',
};

/** align 약어를 표준 CSS align-items 값으로 변환하는 맵 */
const ALIGN_MAP: Record<NonNullable<FlexProps['align']>, CSSProperties['alignItems']> = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
};

/** 간격 프리셋 매핑 */
const GAP_TOKEN_MAP: Record<string, string> = {
  sm: 'var(--mfe-space-sm, 0.5rem)',
  md: 'var(--mfe-space-md, 1rem)',
  lg: 'var(--mfe-space-lg, 1.5rem)',
};

/**
 * 긴 텍스트로 인해 플렉스박스가 터지는 현상(min-width: 0)을 기본 방어하는 Flex 레이아웃입니다.
 *
 * @param props - direction, align, justify, gap, wrap 및 표준 div 속성
 * @returns ark.div 엘리먼트
 */
export function Flex({
  direction = 'row',
  align,
  justify,
  gap = 'sm',
  wrap = 'nowrap',
  style,
  className,
  children,
  ...restDivProps
}: FlexProps) {
  const mergedStyle: CSSProperties = {
    flexDirection: direction,
    alignItems: align ? ALIGN_MAP[align] : undefined,
    justifyContent: justify ? JUSTIFY_MAP[justify] : undefined,
    gap: GAP_TOKEN_MAP[gap] ?? gap,
    flexWrap: wrap,
    ...style,
  };

  return (
    <ark.div style={mergedStyle} className={clsx('mfe-ui-flex', className)} {...restDivProps}>
      {children}
    </ark.div>
  );
}
