/**
 * @file remote-shared-ui.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description Vitest 단독 TDD 실행 시 remote_shared/ui 모듈(Splitter, Tabs, Collapsible 포함)을 대체하는 로컬 테스트 스텁입니다 ([Study 04 #11]).
 */
import { type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode, useState } from 'react';

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

  /** 비활성화 여부 */
  disabled?: boolean;

  /** 추가 클래스명 */
  className?: string;
}

/**
 * 테스트용 Select 스텁 컴포넌트입니다.
 *
 * @param props - SelectProps
 * @returns 네이티브 호환 select 래퍼 엘리먼트
 */
export function Select({
  options,
  value,
  onChange,
  ariaLabel,
  label,
  disabled,
  className,
}: SelectProps) {
  return (
    <div className={clsx('mfe-ui-select', className)}>
      {label ? <span>{label}</span> : null}
      <select
        aria-label={ariaLabel}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      >
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
  /** 컬럼 수 */
  columns?: number;

  /** 그리드 간격 */
  gap?: 'xs' | 'sm' | 'md' | 'lg';
}

/**
 * 테스트용 Grid 스텁 컴포넌트입니다.
 *
 * @param props - GridProps
 * @returns div 엘리먼트
 */
export function Grid({ columns: _columns, gap: _gap, className, children, ...rest }: GridProps) {
  return (
    <div className={clsx('mfe-ui-grid', className)} {...rest}>
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

  /** 줄바꿈 방식 */
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
 * @description Splitter 개별 패널 스텁 인터페이스
 */
export interface SplitterPanelItem {
  /** 패널 고유 식별자 */
  id: string;

  /** 패널 콘텐츠 */
  content: ReactNode;

  /** 최소 크기 비율 */
  minSize?: number;

  /** 최대 크기 비율 */
  maxSize?: number;

  /** 접기 허용 여부 */
  collapsible?: boolean;

  /** 접혔을 때 최소 비율 */
  collapsedSize?: number;
}

/**
 * @description Splitter 스텁 Props 인터페이스
 */
export interface SplitterProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'children' | 'onResize'> {
  /** 분할 패널 목록 */
  panels: SplitterPanelItem[];

  /** 초기 크기 비율 */
  defaultSize?: number[];

  /** 제어 크기 비율 */
  size?: number[];

  /** 배치 방향 */
  orientation?: 'horizontal' | 'vertical';

  /** 크기 변경 콜백 */
  onResize?: (size: number[]) => void;
}

/**
 * 테스트용 Splitter 스텁 컴포넌트입니다.
 *
 * @param props - SplitterProps
 * @returns 분할 패널 컨테이너 엘리먼트
 */
export function Splitter({
  panels,
  defaultSize: _defaultSize,
  size: _size,
  orientation = 'horizontal',
  onResize: _onResize,
  className,
  ...rest
}: SplitterProps) {
  return (
    <div
      data-orientation={orientation}
      className={clsx('mfe-ui-splitter-root', className)}
      {...rest}
    >
      {panels.map((panel) => (
        <div key={panel.id} data-panel-id={panel.id} className="mfe-ui-splitter-panel">
          {panel.content}
        </div>
      ))}
    </div>
  );
}

/**
 * @description Tabs 개별 항목 스텁 인터페이스
 */
export interface TabItem {
  /** 탭 고유 값 */
  value: string;

  /** 탭 트리거 라벨 */
  label: ReactNode;

  /** 탭 콘텐츠 */
  content: ReactNode;

  /** 비활성화 여부 */
  disabled?: boolean;
}

/**
 * @description Tabs 스텁 Props 인터페이스
 */
export interface TabsProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange' | 'children'> {
  /** 탭 목록 */
  items: TabItem[];

  /** 제어 활성 탭 값 */
  value?: string;

  /** 비제어 초기 활성 탭 값 */
  defaultValue?: string;

  /** 탭 변경 콜백 */
  onChange?: (nextValue: string) => void;

  /** 배치 방향 */
  orientation?: 'horizontal' | 'vertical';

  /** 지연 마운트 여부 */
  lazyMount?: boolean;

  /** 닫힘 시 언마운트 여부 */
  unmountOnExit?: boolean;
}

/**
 * 테스트용 Tabs 스텁 컴포넌트입니다.
 *
 * @param props - TabsProps
 * @returns 탭 리스트 및 활성 패널 엘리먼트
 */
export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  orientation: _orientation,
  lazyMount: _lazyMount,
  unmountOnExit: _unmountOnExit,
  className,
  ...rest
}: TabsProps) {
  /** 비제어 모드 내부 활성 탭 상태 */
  const [internalValue, setInternalValue] = useState<string>(defaultValue ?? items[0]?.value ?? '');

  /** 제어/비제어 통합 활성 탭 값 */
  const activeValue = value !== undefined ? value : internalValue;

  const handleSelectTab = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onChange?.(nextValue);
  };

  return (
    <div className={clsx('mfe-ui-tabs-root', className)} {...rest}>
      <div role="tablist" className="mfe-ui-tabs-list">
        {items.map((item) => {
          const isSelected = item.value === activeValue;
          return (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={isSelected}
              disabled={item.disabled}
              className="mfe-ui-tabs-trigger"
              onClick={() => handleSelectTab(item.value)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {items.map((item) => {
        const isSelected = item.value === activeValue;
        return (
          <div
            key={item.value}
            role="tabpanel"
            hidden={!isSelected}
            className="mfe-ui-tabs-content"
          >
            {isSelected ? item.content : null}
          </div>
        );
      })}
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

  /** 제어 열림 상태 */
  open?: boolean;

  /** 비제어 초기 열림 상태 */
  defaultOpen?: boolean;

  /** 비활성화 여부 */
  disabled?: boolean;

  /** 열림 변경 콜백 */
  onOpenChange?: (open: boolean) => void;

  /** 추가 클래스명 */
  className?: string;
}

/**
 * 테스트용 Collapsible 스텁 컴포넌트입니다.
 *
 * @param props - CollapsibleProps
 * @returns 접이식 컨테이너 엘리먼트
 */
export function Collapsible({
  title,
  children,
  open,
  defaultOpen = true,
  disabled = false,
  onOpenChange,
  className,
}: CollapsibleProps) {
  /** 비제어 모드 내부 열림 상태 */
  const [internalOpen, setInternalOpen] = useState<boolean>(defaultOpen);
  const isOpen = open !== undefined ? open : internalOpen;

  const handleToggle = () => {
    if (disabled) {
      return;
    }
    const nextOpen = !isOpen;
    if (open === undefined) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  return (
    <div className={clsx('mfe-ui-collapsible', className)}>
      <button type="button" aria-expanded={isOpen} disabled={disabled} onClick={handleToggle}>
        {title}
      </button>
      {isOpen ? <div>{children}</div> : null}
    </div>
  );
}
