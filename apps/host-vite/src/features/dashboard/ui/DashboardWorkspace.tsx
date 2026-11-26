/**
 * @file DashboardWorkspace.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description remote_shared/ui의 Splitter로 좌측 ProductList(:3002)와 우측 CartWidget(:3003)을 분할 배치하고, 각각 독립된 RemoteWidgetSlot(ErrorBoundary + Suspense)으로 장애 격리하는 통합 워크스페이스 컴포넌트입니다 ([Study 14 § 2, § 4]).
 */
import { lazy } from 'react';
import { Splitter, type SplitterPanelItem } from 'remote_shared/ui';
import type { SyncMode } from 'remote_shared/utils';
import { RemoteWidgetSlot } from './RemoteWidgetSlot';

/**
 * [Study 14 § 4.1] 도메인 리모트 ProductList(:3002)는 main.ts에서 선행 로드하지 않고
 * React.lazy로 지연 로딩하여 장바구니 장애와 완전히 독립된 경계 안에서 마운트합니다.
 */
const LazyProductList = lazy(() =>
  import('remote_products/ProductList').then((mod) => ({
    default: mod.ProductList ?? mod.default,
  })),
);

/**
 * [Study 14 § 4.1] 도메인 리모트 CartWidget(:3003, Rspack) 역시 React.lazy로 지연 로딩하여
 * 3003 서버 중단 시 좌측 상품 목록과 호스트가 영향받지 않도록 격리합니다.
 */
const LazyCartWidget = lazy(() =>
  import('remote_cart/CartWidget').then((mod) => ({
    default: mod.CartWidget ?? mod.default,
  })),
);

/**
 * @description DashboardWorkspace 컴포넌트 Props 인터페이스
 */
export interface DashboardWorkspaceProps {
  /** 현재 로그인 사용자 ID (비로그인 시 null 전달하여 리모트 3중 차단 활성화) */
  userId: string | null;

  /** 현재 선택된 상태 동기화 학습 모드 ('mode-a-event' | 'mode-b-query') */
  syncMode: SyncMode;

  /** 1.5초 네트워크 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay: boolean;
}

/** Splitter 좌/우 기본 분할 비율 상수 (상품 목록 58% : 장바구니 42%) */
const DEFAULT_SPLITTER_SIZE: number[] = [58, 42];

/**
 * 상품 카탈로그(:3002)와 장바구니(:3003) 원격 마이크로 앱을 좌/우 Splitter로 통합 배치하는 워크스페이스 컴포넌트입니다.
 *
 * @param props - 하위 2대 도메인 리모트에 전파할 글로벌 상태 Props
 * @returns Splitter 기반 통합 대시보드 본문 엘리먼트
 */
export function DashboardWorkspace({ userId, syncMode, simulateDelay }: DashboardWorkspaceProps) {
  /** Splitter에 전달할 좌/우 2개 원격 패널 구성 배열 */
  const panels: SplitterPanelItem[] = [
    {
      id: 'products',
      minSize: 30,
      content: (
        <RemoteWidgetSlot remoteLabel="상품 카탈로그 리모트" remotePort={3002} loadingLines={3}>
          <LazyProductList
            userId={userId}
            hostType="vite"
            syncMode={syncMode}
            simulateDelay={simulateDelay}
          />
        </RemoteWidgetSlot>
      ),
    },
    {
      id: 'cart',
      minSize: 25,
      content: (
        <RemoteWidgetSlot remoteLabel="장바구니 리모트" remotePort={3003} loadingLines={2}>
          <LazyCartWidget
            userId={userId}
            hostType="vite"
            syncMode={syncMode}
            simulateDelay={simulateDelay}
          />
        </RemoteWidgetSlot>
      ),
    },
  ];

  return (
    <main className="host-workspace">
      <Splitter
        panels={panels}
        defaultSize={DEFAULT_SPLITTER_SIZE}
        orientation="horizontal"
        className="host-workspace-splitter"
      />
    </main>
  );
}
