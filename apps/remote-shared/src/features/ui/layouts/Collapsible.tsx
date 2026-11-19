/**
 * @file Collapsible.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description 내부 구현에만 Ark UI Collapsible을 캡슐화하고 외부 계약은 순수 React 표준 속성으로 노출하는 접기/펴기 레이아웃입니다 ([Study 09]).
 */
import { Collapsible as ArkCollapsible } from '@ark-ui/react/collapsible';
import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import '../ui-styles.css';

/**
 * @description [Collapsible.tsx] 표준 div 속성(충돌 속성 제외) 기반의 경계 캡슐화 접기/펴기 Props
 */
export interface CollapsibleProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'title' | 'children' | 'dir'> {
  /** 상단 열기/닫기 트리거 버튼에 표시할 제목 노드 */
  title: ReactNode;

  /** 펼쳐졌을 때 표시할 본문 콘텐츠 */
  children: ReactNode;

  /** 외부 상태로 제어하는 펼침 여부 (제어 모드) */
  open?: boolean;

  /** 초기 마운트 시 기본 펼침 여부 (비제어 모드) */
  defaultOpen?: boolean;

  /** 접기/펴기 토글 비활성화 여부 (선택적) */
  disabled?: boolean;

  /** 본문 콘텐츠 최초 펼침 시 지연 마운트 여부 (선택적) */
  lazyMount?: boolean;

  /** 접힘 완료 시 본문 콘텐츠 언마운트 여부 (선택적) */
  unmountOnExit?: boolean;

  /** 펼침 상태 변경 시 boolean(details.open) 값만 전달하는 편의 콜백 (선택적) */
  onOpenChange?: (open: boolean) => void;
}

/**
 * 학습 가이드 패널이나 디버거 섹션을 접고 펼칠 수 있는 공통 Collapsible 컴포넌트입니다.
 *
 * @param props - 표준 div 속성 및 title/open/defaultOpen/disabled/lazyMount/onOpenChange 속성
 * @returns ArkCollapsible 조합 엘리먼트
 */
export function Collapsible({
  title,
  children,
  open,
  defaultOpen,
  disabled,
  lazyMount,
  unmountOnExit,
  onOpenChange,
  className,
  ...restDivProps
}: CollapsibleProps) {
  return (
    <ArkCollapsible.Root
      open={open}
      defaultOpen={defaultOpen}
      disabled={disabled}
      lazyMount={lazyMount}
      unmountOnExit={unmountOnExit}
      onOpenChange={(details) => {
        onOpenChange?.(details.open);
      }}
      className={clsx('mfe-ui-collapsible-root', className)}
      {...restDivProps}
    >
      {/* [접근성 보강] ArkCollapsible.Root의 disabled는 data-disabled만 부여하므로 Trigger에 네이티브 disabled도 동기화합니다. */}
      <ArkCollapsible.Trigger disabled={disabled} className="mfe-ui-collapsible-trigger">
        <span>{title}</span>
        <ArkCollapsible.Indicator aria-hidden="true">▾</ArkCollapsible.Indicator>
      </ArkCollapsible.Trigger>

      <ArkCollapsible.Content className="mfe-ui-collapsible-content">
        {children}
      </ArkCollapsible.Content>
    </ArkCollapsible.Root>
  );
}
