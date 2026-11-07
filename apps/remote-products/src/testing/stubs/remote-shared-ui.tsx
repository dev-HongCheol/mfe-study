/**
 * @file remote-shared-ui.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description Vitest 단독 TDD 실행 시 remote_shared/ui 모듈을 대체하는 로컬 테스트 스텁입니다 ([Study 04 #11]).
 */
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

/**
 * 조건부 클래스 이름을 결합하는 경량 clsx 스텁 함수입니다.
 *
 * @param inputs - 결합할 클래스 값 목록
 * @returns 공백으로 결합된 클래스 문자열
 */
export function clsx(...inputs: Array<string | false | null | undefined>): string {
  return inputs.filter(Boolean).join(' ');
}

/**
 * @description Button 스텁 Props 인터페이스
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** 시각적 스타일 변형 */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  /** 버튼 크기 */
  size?: 'sm' | 'md' | 'lg';
  /** 비동기 로딩 진행 여부 */
  isLoading?: boolean;
  /** 가로 전체 너비 확장 여부 */
  fullWidth?: boolean;
}

/**
 * 테스트용 Button 스텁 컴포넌트입니다.
 *
 * @param props - ButtonProps
 * @returns button 엘리먼트
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  /** 로딩 또는 명시적 비활성화 여부 */
  const isDisabled = Boolean(disabled || isLoading);
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading ? 'true' : undefined}
      data-variant={variant}
      data-size={size}
      data-full-width={fullWidth ? 'true' : undefined}
      className={clsx('mfe-ui-button', className)}
      {...rest}
    >
      {children}
    </button>
  );
}

/**
 * @description Heading 스텁 Props 인터페이스
 */
export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  /** 제목 단계 (1 ~ 5) */
  level?: 1 | 2 | 3 | 4 | 5;
}

/**
 * 테스트용 Heading 스텁 컴포넌트입니다.
 *
 * @param props - HeadingProps
 * @returns h1 ~ h5 시맨틱 엘리먼트
 */
export function Heading({ level = 2, className, children, ...rest }: HeadingProps) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5';
  return (
    <Tag className={clsx('mfe-ui-heading', className)} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * @description Select 옵션 항목 인터페이스
 */
export interface SelectOptionItem {
  /** 화면 표시 라벨 */
  label: string;
  /** 실제 선택 값 */
  value: string;
  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * @description Select 스텁 Props 인터페이스
 */
export interface SelectProps {
  /** 옵션 배열 */
  options: SelectOptionItem[];
  /** 현재 선택된 값 */
  value: string;
  /** 값 변경 콜백 */
  onChange: (value: string) => void;
  /** 접근성 라벨 */
  ariaLabel: string;
  /** 플레이스홀더 */
  placeholder?: string;
  /** 상단 표시 라벨 */
  label?: string;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * 테스트용 Select 스텁 컴포넌트입니다.
 *
 * @param props - SelectProps
 * @returns 네이티브 호환 select 래퍼 엘리먼트
 */
export function Select({ options, value, onChange, ariaLabel, label, className }: SelectProps) {
  return (
    <div className={clsx('mfe-ui-select', className)}>
      {label ? <span>{label}</span> : null}
      <select aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * @description Skeleton 스텁 Props 인터페이스
 */
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** 스켈레톤 형태 */
  variant?: 'card' | 'text' | 'rect';
  /** 가로 크기 */
  width?: string | number;
  /** 세로 크기 */
  height?: string | number;
  /** 반복 렌더링 개수 */
  count?: number;
}

/**
 * 테스트용 Skeleton 스텁 컴포넌트입니다.
 *
 * @param props - SkeletonProps
 * @returns 스켈레톤 블록 엘리먼트
 */
export function Skeleton({ variant = 'rect', count = 1, className, ...rest }: SkeletonProps) {
  const items = Array.from({ length: Math.max(1, count) }, (_, idx) => idx);
  return (
    <>
      {items.map((idx) => (
        <div
          key={idx}
          aria-hidden="true"
          data-variant={variant}
          className={clsx('mfe-ui-skeleton', className)}
          {...rest}
        />
      ))}
    </>
  );
}

/**
 * @description Badge 스텁 Props 인터페이스
 */
export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** 배지 색상 톤 */
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
}

/**
 * 테스트용 Badge 스텁 컴포넌트입니다.
 *
 * @param props - BadgeProps
 * @returns span 엘리먼트
 */
export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  return (
    <span data-tone={tone} className={clsx('mfe-ui-badge', className)} {...rest}>
      {children}
    </span>
  );
}

/**
 * @description Container 스텁 Props 인터페이스
 */
export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** 최대 너비 규격 */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * 테스트용 Container 스텁 컴포넌트입니다.
 *
 * @param props - ContainerProps
 * @returns div 엘리먼트
 */
export function Container({ maxWidth: _maxWidth, className, children, ...rest }: ContainerProps) {
  return (
    <div className={clsx('mfe-ui-container', className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * @description Grid 스텁 Props 인터페이스
 */
export interface GridProps extends HTMLAttributes<HTMLDivElement> {
  /** 열 개수 */
  columns?: 1 | 2 | 3 | 4;
  /** 그리드 간격 */
  gap?: 'sm' | 'md' | 'lg';
}

/**
 * 테스트용 Grid 스텁 컴포넌트입니다.
 *
 * @param props - GridProps
 * @returns div 엘리먼트
 */
export function Grid({ columns = 3, gap = 'md', className, children, ...rest }: GridProps) {
  return (
    <div data-columns={columns} data-gap={gap} className={clsx('mfe-ui-grid', className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * @description Flex 스텁 Props 인터페이스
 */
export interface FlexProps extends HTMLAttributes<HTMLDivElement> {
  /** 배치 방향 */
  direction?: 'row' | 'column';
  /** 교차축 정렬 */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** 주축 정렬 */
  justify?: 'start' | 'center' | 'end' | 'between';
  /** 요소 간격 */
  gap?: 'xs' | 'sm' | 'md' | 'lg';
  /** 줄바꿈 방식 ('nowrap' | 'wrap') */
  wrap?: 'nowrap' | 'wrap';
}

/**
 * 테스트용 Flex 스텁 컴포넌트입니다.
 *
 * @param props - FlexProps
 * @returns div 엘리먼트
 */
export function Flex({
  direction: _direction,
  align: _align,
  justify: _justify,
  gap: _gap,
  wrap: _wrap,
  className,
  children,
  ...rest
}: FlexProps) {
  return (
    <div className={clsx('mfe-ui-flex', className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * @description Stack 스텁 Props 인터페이스
 */
export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  /** 수직 간격 */
  gap?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * 테스트용 Stack 스텁 컴포넌트입니다.
 *
 * @param props - StackProps
 * @returns div 엘리먼트
 */
export function Stack({ gap: _gap, className, children, ...rest }: StackProps) {
  return (
    <div className={clsx('mfe-ui-stack', className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * @description Card 스텁 Props 인터페이스
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** 내부 패딩 크기 */
  padding?: 'sm' | 'md' | 'lg';
  /** 그림자 강조 여부 */
  elevated?: boolean;
}

/**
 * 테스트용 Card 스텁 컴포넌트입니다.
 *
 * @param props - CardProps
 * @returns div 엘리먼트
 */
export function Card({
  padding: _padding,
  elevated: _elevated,
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div className={clsx('mfe-ui-card', className)} {...rest}>
      {children}
    </div>
  );
}

/**
 * @description Collapsible 스텁 Props 인터페이스
 */
export interface CollapsibleProps {
  /** 트리거 제목 */
  title: ReactNode;
  /** 본문 콘텐츠 */
  children: ReactNode;
  /** 기본 열림 여부 */
  defaultOpen?: boolean;
  /** 추가 클래스명 */
  className?: string;
}

/**
 * 테스트용 Collapsible 스텁 컴포넌트입니다.
 *
 * @param props - CollapsibleProps
 * @returns div 엘리먼트
 */
export function Collapsible({ title, children, className }: CollapsibleProps) {
  return (
    <div className={clsx('mfe-ui-collapsible', className)}>
      <div>{title}</div>
      <div>{children}</div>
    </div>
  );
}
