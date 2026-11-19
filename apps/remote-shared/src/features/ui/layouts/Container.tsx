/**
 * @file Container.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description 표준 div 속성을 경계 캡슐화하여 상속하는 최대 너비 중앙 정렬 컨테이너 레이아웃입니다 ([Study 09]).
 */
import { ark } from '@ark-ui/react/factory';
import { clsx } from 'clsx';
import type { CSSProperties, ComponentPropsWithoutRef } from 'react';
import '../ui-styles.css';

/**
 * @description [Container.tsx] 표준 div 속성을 상속하는 페이지/섹션 컨테이너 Props
 */
export interface ContainerProps extends ComponentPropsWithoutRef<'div'> {
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
 * @param props - maxWidth 프리셋 및 표준 div 속성
 * @returns ark.div 엘리먼트
 */
export function Container({
  maxWidth = 'xl',
  style,
  className,
  children,
  ...restDivProps
}: ContainerProps) {
  const mergedStyle: CSSProperties = {
    maxWidth: MAX_WIDTH_MAP[maxWidth],
    ...style,
  };

  return (
    <ark.div style={mergedStyle} className={clsx('mfe-ui-container', className)} {...restDivProps}>
      {children}
    </ark.div>
  );
}
