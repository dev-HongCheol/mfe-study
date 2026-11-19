/**
 * @file Splitter.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./ui)
 * @description 내부 구현에만 Ark UI Splitter를 캡슐화하고 외부 계약은 순수 React 표준 속성으로 노출하는 드래그 리사이즈 분할 레이아웃입니다 ([Study 09]).
 */
import { Splitter as ArkSplitter } from '@ark-ui/react/splitter';
import { clsx } from 'clsx';
import { type ComponentPropsWithoutRef, Fragment, type ReactNode } from 'react';
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
 * @description [Splitter.tsx] 표준 div 속성(충돌 속성 제외) 기반의 경계 캡슐화 분할 레이아웃 Props
 */
export interface SplitterProps
  extends Omit<ComponentPropsWithoutRef<'div'>, 'children' | 'dir' | 'onResize'> {
  /** 분할 렌더링할 패널 메타데이터 및 콘텐츠 배열 (2개 이상) */
  panels: SplitterPanelItem[];

  /** 초기 마운트 시 각 패널의 기본 크기 비율 배열 (예: [60, 40], 비제어 모드) */
  defaultSize?: number[];

  /** 외부 상태로 제어하는 각 패널의 크기 비율 배열 (제어 모드) */
  size?: number[];

  /** 분할 배치 방향 ('horizontal' | 'vertical', 기본값: 'horizontal') */
  orientation?: 'horizontal' | 'vertical';

  /** 패널 크기 변경 시 갱신된 숫자 비율 배열을 전달하는 편의 콜백 (선택적) */
  onResize?: (size: number[]) => void;
}

/**
 * 호스트 대시보드에서 상품 영역과 장바구니 영역을 리사이즈 및 접기/펴기할 수 있도록 경계 캡슐화한 Splitter 레이아웃입니다.
 *
 * @param props - 표준 div 속성 및 panels/defaultSize/size/orientation/onResize 속성
 * @returns ArkSplitter 조합 엘리먼트
 */
export function Splitter({
  panels,
  defaultSize,
  size,
  orientation,
  onResize,
  className,
  ...restDivProps
}: SplitterProps) {
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
      defaultSize={defaultSize}
      size={size}
      orientation={orientation}
      onResize={
        onResize
          ? (details) => {
              // [분기 설명] @zag-js/splitter의 ResizeDetails 타입이 외부로 누출되지 않도록 순수 number[] 배열만 추출해 전달합니다.
              onResize(details.size);
            }
          : undefined
      }
      className={clsx('mfe-ui-splitter-root', className)}
      {...restDivProps}
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
