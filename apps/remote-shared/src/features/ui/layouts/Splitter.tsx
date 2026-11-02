/**
 * @file Splitter.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description Ark UI Splitter.RootProps를 Omit으로 기본 상속하고 패널 배열 기반 드래그 리사이즈 분할을 제공하는 레이아웃 컴포넌트입니다.
 */
import { Splitter as ArkSplitter } from '@ark-ui/react/splitter';
import { clsx } from 'clsx';
import { Fragment, type ReactNode } from 'react';
import '../ui-styles.css';

/**
 * @description [Splitter.tsx] 개별 분할 패널 설정 및 콘텐츠 항목 인터페이스
 */
export interface SplitterPanelItem {
  /** 패널 고유 식별자 (예: 'products', 'cart') */
  id: string;

  /** 패널 내부에 렌더링할 콘텐츠 노드 */
  content: ReactNode;

  /** 최소 크기 비율 (0~100%, 선택적) */
  minSize?: number;

  /** 최대 크기 비율 (0~100%, 선택적) */
  maxSize?: number;

  /** 패널 접기 허용 여부 (선택적) */
  collapsible?: boolean;

  /** 접혔을 때 유지할 최소 비율 (선택적) */
  collapsedSize?: number;
}

/**
 * @description [Splitter.tsx] ArkSplitter.RootProps를 Omit으로 기본 상속하고 패널 콘텐츠 배열을 선언형으로 받는 Props
 */
export interface SplitterProps extends Omit<ArkSplitter.RootProps, 'panels' | 'children'> {
  /** 분할 렌더링할 패널 메타데이터 및 콘텐츠 배열 (2개 이상) */
  panels: SplitterPanelItem[];
}

/**
 * 호스트 대시보드에서 상품 영역과 장바구니 영역을 리사이즈 및 접기/펴기할 수 있도록 캡슐화한 Splitter 레이아웃입니다.
 *
 * @param props - ArkSplitter.RootProps 상속 속성 및 panels 배열
 * @returns ArkSplitter 조합 엘리먼트
 */
export function Splitter({ panels, className, ...restArkRootProps }: SplitterProps) {
  /** ArkSplitter.Root에 전달할 순수 패널 메타데이터 배열 */
  const panelConfigs = panels.map(({ id, minSize, maxSize, collapsible, collapsedSize }) => ({
    id,
    minSize,
    maxSize,
    collapsible,
    collapsedSize,
  }));

  return (
    <ArkSplitter.Root
      panels={panelConfigs}
      className={clsx('mfe-ui-splitter-root', className)}
      {...restArkRootProps}
    >
      {panels.map((panel, index) => {
        const nextPanel = panels[index + 1];
        return (
          <Fragment key={panel.id}>
            <ArkSplitter.Panel id={panel.id} className="mfe-ui-splitter-panel">
              {panel.content}
            </ArkSplitter.Panel>

            {nextPanel ? (
              <ArkSplitter.ResizeTrigger
                id={`${panel.id}:${nextPanel.id}`}
                aria-label={`${panel.id} 및 ${nextPanel.id} 패널 크기 조절`}
                className="mfe-ui-splitter-trigger"
              />
            ) : null}
          </Fragment>
        );
      })}
    </ArkSplitter.Root>
  );
}
