/**
 * @file Tabs.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description 내부 구현에만 Ark UI Tabs를 캡슐화하고 외부 계약은 순수 React 표준 속성으로 노출하는 탭 전환 레이아웃 컴포넌트입니다 ([Study 09]).
 */
import { Tabs as ArkTabs } from '@ark-ui/react/tabs';
import { clsx } from 'clsx';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import '../ui-styles.css';

/**
 * @description [Tabs.tsx] 개별 탭 항목 정의 인터페이스
 */
export interface TabItem {
  /** 탭 고유 식별자 값 */
  value: string;

  /** 탭 트리거 버튼에 표시할 제목 */
  label: ReactNode;

  /** 탭 활성화 시 표시할 패널 본문 */
  content: ReactNode;

  /** 개별 탭 비활성화 여부 (선택적) */
  disabled?: boolean;
}

/**
 * @description [Tabs.tsx] 표준 div 속성(충돌 속성 제외) 기반의 경계 캡슐화 탭 레이아웃 Props
 */
export interface TabsProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'defaultValue' | 'onChange' | 'children' | 'dir'> {
  /** 렌더링할 탭 목록 배열 */
  items: TabItem[];

  /** 외부 상태로 제어하는 현재 활성 탭 값 (제어 모드) */
  value?: string;

  /** 초기 활성 탭 값 (미지정 시 첫 번째 탭 활성화, 비제어 모드) */
  defaultValue?: string;

  /** 탭 전환 시 선택된 탭의 문자열 value만 전달하는 편의 콜백 (선택적) */
  onChange?: (nextValue: string) => void;

  /** 탭 목록 배치 방향 ('horizontal' | 'vertical', 기본값: 'horizontal') */
  orientation?: 'horizontal' | 'vertical';

  /** 탭 콘텐츠 최초 활성화 시 지연 마운트 여부 (선택적) */
  lazyMount?: boolean;

  /** 비활성화된 탭 콘텐츠 언마운트 여부 (선택적) */
  unmountOnExit?: boolean;
}

/**
 * MfeInspector 모니터 및 대시보드 뷰 전환에 사용되는 공통 Tabs 컴포넌트입니다.
 *
 * @param props - 표준 div 속성 및 items/value/defaultValue/onChange/orientation/lazyMount 속성
 * @returns ArkTabs 조합 엘리먼트
 */
export function Tabs({
  items,
  value,
  defaultValue,
  onChange,
  orientation,
  lazyMount,
  unmountOnExit,
  className,
  ...restDivProps
}: TabsProps) {
  /**
   * [분기 설명]
   * 제어 모드(value 전달)에서 defaultValue까지 함께 넘기면 Ark UI 상태 머신의 제어 전환과 충돌하므로,
   * 비제어 모드(value === undefined)일 때만 기본 활성 탭(defaultValue ?? 첫 번째 탭)을 주입합니다.
   */
  const resolvedDefaultValue = value === undefined ? (defaultValue ?? items[0]?.value) : undefined;

  return (
    <ArkTabs.Root
      value={value}
      defaultValue={resolvedDefaultValue}
      orientation={orientation}
      lazyMount={lazyMount}
      unmountOnExit={unmountOnExit}
      onValueChange={(details) => {
        onChange?.(details.value);
      }}
      className={clsx('mfe-ui-tabs-root', className)}
      {...restDivProps}
    >
      <ArkTabs.List className="mfe-ui-tabs-list">
        {items.map((item) => (
          <ArkTabs.Trigger
            key={item.value}
            value={item.value}
            disabled={item.disabled}
            className="mfe-ui-tabs-trigger"
          >
            {item.label}
          </ArkTabs.Trigger>
        ))}
      </ArkTabs.List>

      {items.map((item) => (
        <ArkTabs.Content key={item.value} value={item.value} className="mfe-ui-tabs-content">
          {item.content}
        </ArkTabs.Content>
      ))}
    </ArkTabs.Root>
  );
}
