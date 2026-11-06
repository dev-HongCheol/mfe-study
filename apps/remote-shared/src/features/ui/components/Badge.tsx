/**
 * @file Badge.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description Ark UI의 HTMLArkProps<'span'>을 기본 상속하고 고정폭 숫자(tabular-nums)와 시맨틱 톤을 지원하는 상태 배지 컴포넌트입니다.
 */
import { type HTMLArkProps, ark } from '@ark-ui/react/factory';
import { clsx } from 'clsx';
import '../ui-styles.css';

/**
 * @description [Badge.tsx] ark.span(HTMLArkProps<'span'>)을 기본 상속하는 상태·출처 표시 배지 Props
 */
export interface BadgeProps extends HTMLArkProps<'span'> {
  /** 배지의 의미론적 색상 톤 (기본값: 'neutral') */
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

/**
 * 호스트 포트 출처, 동기화 모드, 수량 등을 흔들림 없는 고정폭 숫자로 표시하는 Badge 컴포넌트입니다.
 *
 * @param props - 색상 톤(tone) 및 HTMLArkProps<'span'> 속성
 * @returns ark.span 엘리먼트
 */
export function Badge({ tone = 'neutral', className, children, ...restArkProps }: BadgeProps) {
  return (
    <ark.span
      className={clsx('mfe-ui-badge', `mfe-ui-badge--${tone}`, className)}
      {...restArkProps}
    >
      {children}
    </ark.span>
  );
}
