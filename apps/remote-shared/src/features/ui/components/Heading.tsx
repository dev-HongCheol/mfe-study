/**
 * @file Heading.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description Ark UI의 HTMLArkProps<'h1'>을 기본 상속하고 시맨틱 제목 태그(h1 ~ h5)를 렌더링하는 타이포그래피 컴포넌트입니다.
 */
import { type HTMLArkProps, ark } from '@ark-ui/react/factory';
import { clsx } from 'clsx';
import '../ui-styles.css';

/**
 * @description [Heading.tsx] ark.h1~h5(HTMLArkProps<'h1'>)를 기본 상속하고 시맨틱 제목 레벨(1~5)을 렌더링하는 Props
 */
export interface HeadingProps extends HTMLArkProps<'h1'> {
  /** 렌더링할 시맨틱 제목 레벨 (1 ~ 5, 기본값: 2) */
  level?: 1 | 2 | 3 | 4 | 5;
}

/** 레벨별 ark 팩토리 태그 매핑 객체 */
const HEADING_TAG_MAP = {
  1: ark.h1,
  2: ark.h2,
  3: ark.h3,
  4: ark.h4,
  5: ark.h5,
} as const;

/**
 * 시맨틱 제목 태그(h1 ~ h5)와 말줄임 방어 스타일을 제공하는 공통 Heading 컴포넌트입니다.
 *
 * @param props - 제목 레벨(1~5) 및 HTMLArkProps<'h1'> 속성
 * @returns 선택된 레벨의 ark.h1~h5 엘리먼트
 */
export function Heading({ level = 2, className, children, ...restArkProps }: HeadingProps) {
  const TagComponent = HEADING_TAG_MAP[level];

  return (
    <TagComponent
      className={clsx('mfe-ui-heading', `mfe-ui-heading--${level}`, className)}
      {...restArkProps}
    >
      {children}
    </TagComponent>
  );
}
