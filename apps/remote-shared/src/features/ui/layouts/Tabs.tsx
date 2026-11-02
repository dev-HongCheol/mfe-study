/**
 * @file Tabs.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description Ark UI Tabs.RootProps를 Omit으로 기본 상속하고 단일 문자열 onChange 콜백을 제공하는 탭 전환 레이아웃 컴포넌트입니다.
 */
import { Tabs as ArkTabs } from '@ark-ui/react/tabs';
import { clsx } from 'clsx';
import type { ReactNode } from 'react';
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
 * @description [Tabs.tsx] ArkTabs.RootProps를 Omit으로 기본 상속하고 단일 문자열 onChange 콜백을 제공하는 Props
 */
export interface TabsProps
  extends Omit<ArkTabs.RootProps, 'onValueChange' | 'onChange' | 'children'> {
  /** 렌더링할 탭 목록 배열 */
  items: TabItem[];

  /** 탭 전환 시 선택된 탭의 문자열 value만 전달하는 편의 콜백 (선택적) */
  onChange?: (nextValue: string) => void;
}

/**
 * MfeInspector 모니터 및 대시보드 뷰 전환에 사용되는 공통 Tabs 컴포넌트입니다.
 *
 * @param props - ArkTabs.RootProps 상속 속성 및 items/onChange 편의 속성
 * @returns ArkTabs 조합 엘리먼트
 */
export function Tabs({ items, defaultValue, onChange, className, ...restArkRootProps }: TabsProps) {
  /** 초기 탭 값이 지정되지 않았을 경우 첫 번째 탭을 기본 활성 탭으로 설정합니다 */
  const resolvedDefaultValue = defaultValue ?? items[0]?.value;

  return (
    <ArkTabs.Root
      defaultValue={resolvedDefaultValue}
      onValueChange={(details) => {
        onChange?.(details.value);
      }}
      className={clsx('mfe-ui-tabs-root', className)}
      {...restArkRootProps}
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
