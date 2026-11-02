/**
 * @file Container.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description Ark UI의 HTMLArkProps<'div'>를 기본 상속하는 최대 너비 중앙 정렬 컨테이너 레이아웃입니다.
 */
import { type HTMLArkProps, ark } from '@ark-ui/react/factory';
import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import '../ui-styles.css';

/**
 * @description [Container.tsx] HTMLArkProps<'div'>를 기본 상속하는 페이지/섹션 컨테이너 Props
 */
export interface ContainerProps extends HTMLArkProps<'div'> {
  /** 최대 가로 너비 프리셋 ('sm' | 'md' | 'lg' | 'xl' | 'full', 기본값: 'xl') */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/** maxWidth 프리셋별 CSS 값 매핑 */
const MAX_WIDTH_MAP: Record<NonNullable<ContainerProps['maxWidth']>, string> = {
  sm: '40rem',
  md: '56rem',
  lg: '72rem',
  xl: '80rem',
  full: '100%',
};

/**
 * 대시보드 및 단독 실행 화면의 가로 폭과 좌우 여백을 일관되게 유지하는 Container 레이아웃입니다.
 *
 * @param props - maxWidth 프리셋 및 HTMLArkProps<'div'>
 * @returns ark.div 엘리먼트
 */
export function Container({
  maxWidth = 'xl',
  style,
  className,
  children,
  ...restArkProps
}: ContainerProps) {
  const mergedStyle: CSSProperties = {
    maxWidth: MAX_WIDTH_MAP[maxWidth],
    ...style,
  };

  return (
    <ark.div style={mergedStyle} className={clsx('mfe-ui-container', className)} {...restArkProps}>
      {children}
    </ark.div>
  );
}
