/**
 * @file Collapsible.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description Ark UI Collapsible.RootProps를 Omit으로 기본 상속하고 boolean onOpenChange를 제공하는 접기/펴기 레이아웃입니다.
 */
import { Collapsible as ArkCollapsible } from '@ark-ui/react/collapsible';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
import '../ui-styles.css';

/**
 * @description [Collapsible.tsx] ArkCollapsible.RootProps를 Omit으로 기본 상속하고 boolean onOpenChange 콜백을 제공하는 Props
 */
export interface CollapsibleProps extends Omit<ArkCollapsible.RootProps, 'title' | 'onOpenChange'> {
  /** 상단 열기/닫기 트리거 버튼에 표시할 제목 노드 */
  title: ReactNode;

  /** 펼쳐졌을 때 표시할 본문 콘텐츠 */
  children: ReactNode;

  /** 펼침 상태 변경 시 boolean(details.open) 값만 전달하는 편의 콜백 (선택적) */
  onOpenChange?: (open: boolean) => void;
}

/**
 * 학습 가이드 패널이나 디버거 섹션을 접고 펼칠 수 있는 공통 Collapsible 컴포넌트입니다.
 *
 * @param props - ArkCollapsible.RootProps 상속 속성 및 title/onOpenChange 편의 속성
 * @returns ArkCollapsible 조합 엘리먼트
 */
export function Collapsible({
  title,
  children,
  onOpenChange,
  className,
  ...restArkRootProps
}: CollapsibleProps) {
  return (
    <ArkCollapsible.Root
      onOpenChange={(details) => {
        onOpenChange?.(details.open);
      }}
      className={clsx('mfe-ui-collapsible-root', className)}
      {...restArkRootProps}
    >
      <ArkCollapsible.Trigger className="mfe-ui-collapsible-trigger">
        <span>{title}</span>
        <ArkCollapsible.Indicator aria-hidden="true">▾</ArkCollapsible.Indicator>
      </ArkCollapsible.Trigger>

      <ArkCollapsible.Content className="mfe-ui-collapsible-content">
        {children}
      </ArkCollapsible.Content>
    </ArkCollapsible.Root>
  );
}
