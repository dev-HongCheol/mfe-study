/**
 * @file Badge.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description 표준 span 속성을 경계 캡슐화하여 상속하고 고정폭 숫자(tabular-nums)와 시맨틱 톤을 지원하는 상태 배지 컴포넌트입니다 ([Study 09]).
 */
import { ark } from '@ark-ui/react/factory';
import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
import '../ui-styles.css';

/**
 * @description [Badge.tsx] 표준 span 속성을 상속하는 상태·출처 표시 배지 Props
 */
export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  /** 배지의 의미론적 색상 톤 (기본값: 'neutral') */
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

/**
 * 호스트 포트 출처, 동기화 모드, 수량 등을 흔들림 없는 고정폭 숫자로 표시하는 Badge 컴포넌트입니다.
 *
 * @param props - 색상 톤(tone) 및 표준 span 속성
 * @returns ark.span 엘리먼트
 */
export function Badge({ tone = 'neutral', className, children, ...restSpanProps }: BadgeProps) {
  return (
    <ark.span
      className={clsx('mfe-ui-badge', `mfe-ui-badge--${tone}`, className)}
      {...restSpanProps}
    >
      {children}
    </ark.span>
  );
}
