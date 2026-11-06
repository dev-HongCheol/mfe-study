/**
 * @file Skeleton.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description Ark UI의 HTMLArkProps<'div'>를 기본 상속하고 지연 로딩 시 CLS(레이아웃 덜컥거림)를 방지하는 스켈레톤 컴포넌트입니다 ([Study 05 #13]).
 */
import { type HTMLArkProps, ark } from '@ark-ui/react/factory';
import { clsx } from 'clsx';
import type { CSSProperties } from 'react';
import '../ui-styles.css';

/**
 * @description [Skeleton.tsx] ark.div(HTMLArkProps<'div'>)를 기본 상속하고 CLS 방지 프리셋 및 반복 렌더링(count)을 지원하는 Props
 */
export interface SkeletonProps extends HTMLArkProps<'div'> {
  /** 스켈레톤 형태 프리셋 ('card'는 실제 카드 min-height와 1:1 매칭) */
  variant?: 'card' | 'text' | 'rect';

  /** 가로 너비 (숫자 입력 시 px, 문자열 입력 시 CSS 단위 적용) */
  width?: string | number;

  /** 세로 높이 (숫자 입력 시 px, 미지정 시 variant 기본 높이 적용) */
  height?: string | number;

  /** 연속으로 반복 렌더링할 스켈레톤 블록 개수 (기본값: 1) */
  count?: number;
}

/**
 * 숫자 또는 문자열 크기 값을 안전한 CSS 길이 문자열로 변환합니다.
 *
 * @param size - 숫자(px) 또는 CSS 크기 문자열
 * @returns 변환된 CSS 크기 문자열 또는 undefined
 */
function toCssDimension(size?: string | number): string | undefined {
  if (size === undefined) {
    return undefined;
  }
  return typeof size === 'number' ? `${size}px` : size;
}

/**
 * 1.5초 로딩 지연 시뮬레이션 등에서 실제 카드 높이와 1:1 매칭되어 CLS를 방어하는 스켈레톤 컴포넌트입니다.
 *
 * @param props - 형태(variant), 크기(width/height), 반복 개수(count) 및 HTMLArkProps<'div'>
 * @returns 스켈레톤 블록 엘리먼트
 */
export function Skeleton({
  variant = 'rect',
  width,
  height,
  count = 1,
  style,
  className,
  ...restArkProps
}: SkeletonProps) {
  /** 최소 1개 이상의 스켈레톤이 렌더링되도록 보정한 반복 횟수 */
  const safeCount = Math.max(1, Math.floor(count));

  const mergedStyle: CSSProperties = {
    width: toCssDimension(width),
    height: toCssDimension(height),
    ...style,
  };

  /** 배열 index 직접 key 사용 금지(noArrayIndexKey) 준수를 위한 슬롯 고유 식별자 배열 */
  const slotKeys = Array.from(
    { length: safeCount },
    (_, slotNumber) => `skeleton-${variant}-slot-${slotNumber + 1}`,
  );

  const items = slotKeys.map((slotKey) => (
    <ark.div
      key={slotKey}
      aria-hidden="true"
      style={mergedStyle}
      className={clsx('mfe-ui-skeleton', `mfe-ui-skeleton--${variant}`, className)}
      {...restArkProps}
    />
  ));

  // [분기 설명] 단건(count=1)일 때는 불필요한 래퍼 div 없이 바로 반환하고, 다건일 때만 그룹 컨테이너로 감쌉니다.
  if (safeCount === 1) {
    return items[0] ?? null;
  }

  return <div className="mfe-ui-skeleton-group">{items}</div>;
}
