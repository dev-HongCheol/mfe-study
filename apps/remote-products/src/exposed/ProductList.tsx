/**
 * @file ProductList.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed true (remote_products/ProductList)
 * @description 호스트(host-vite:3000, host-rspack:3001) 및 단독 실행에서 마운트하는 공개 진입 컴포넌트입니다. syncMode에 따라 독립 QueryClient(Mode A) 또는 싱글톤 sharedQueryClient(Mode B)를 동적 주입합니다 ([Study 01, Study 04 #07, #09]).
 */
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import {
  DEFAULT_API_BASE_URL,
  MFE_EVENTS,
  type SyncMode,
  createMfeQueryClient,
  sharedQueryClient,
  useMfeEvent,
} from 'remote_shared/utils';
import { DEFAULT_SIMULATE_DELAY_MS } from '../features/catalog/api/catalog-api.js';
import type { ProductListProps } from '../features/catalog/model/catalog-schema.js';
import { ProductCatalogView } from '../features/catalog/ui/ProductCatalogView.js';

export type {
  CartItemView,
  ProductCategory,
  ProductCategoryFilter,
  ProductEntity,
  ProductFilterValues,
  ProductListProps,
} from '../features/catalog/model/catalog-schema.js';

/**
 * Module Federation './ProductList' 노출 컴포넌트입니다.
 * - Mode A('mode-a-event') 선택 시: 리모트 내부 전용 localQueryClient를 사용하여 타 앱과 메모리를 격리합니다.
 * - Mode B('mode-b-query') 선택 시: remote-shared의 싱글톤 sharedQueryClient를 공유합니다.
 *
 * @param props - ProductListProps (루트 SSOT § 5.4.2 계약)
 * @returns QueryClientProvider로 래핑된 상품 카탈로그 컴포넌트
 */
export function ProductList({
  userId,
  hostType = 'standalone',
  syncMode,
  simulateDelay = false,
  delayMs = DEFAULT_SIMULATE_DELAY_MS,
  apiBaseUrl = DEFAULT_API_BASE_URL,
  onCartAdded,
}: ProductListProps) {
  /** Mode A(독립 캐시)에서 사용할 remote-products 전용 QueryClient 인스턴스 Ref */
  const localQueryClientRef = useRef<QueryClient | null>(null);
  if (!localQueryClientRef.current) {
    localQueryClientRef.current = createMfeQueryClient();
  }

  /** 상위 Props가 생략되었을 때 커스텀 이벤트(mfe:auth-changed)로 수신한 사용자 ID 상태 */
  const [eventUserId, setEventUserId] = useState<string>('user-1');

  /** 상위 Props가 생략되었을 때 커스텀 이벤트(mfe:sync-mode-changed)로 수신한 동기화 모드 상태 */
  const [eventSyncMode, setEventSyncMode] = useState<SyncMode>('mode-a-event');

  // 호스트에서 이벤트 버스로 사용자 전환 신호를 보낼 때 자동 수신 (언마운트 시 자동 해제 보장)
  useMfeEvent(MFE_EVENTS.AUTH_CHANGED, (payload) => {
    setEventUserId(payload.userId);
  });

  // 호스트에서 이벤트 버스로 동기화 모드 전환 신호를 보낼 때 자동 수신
  useMfeEvent(MFE_EVENTS.SYNC_MODE_CHANGED, (payload) => {
    setEventSyncMode(payload.syncMode);
  });

  /** 최종 적용할 사용자 ID (명시적 Props 우선, 미지정 시 이벤트 상태 사용) */
  const effectiveUserId = userId ?? eventUserId;

  /** 최종 적용할 동기화 모드 (명시적 Props 우선, 미지정 시 이벤트 상태 사용) */
  const effectiveSyncMode = syncMode ?? eventSyncMode;

  /**
   * [분기 설명]
   * - 'mode-b-query'일 때는 remote-shared의 싱글톤 sharedQueryClient를 주입하여 CartWidget과 캐시 메모리를 공유합니다.
   * - 'mode-a-event'일 때는 본 리모트만의 독립 localQueryClient를 주입하여 오직 CustomEvent로만 통신하게 합니다.
   */
  const activeQueryClient =
    effectiveSyncMode === 'mode-b-query' ? sharedQueryClient : localQueryClientRef.current;

  return (
    <QueryClientProvider client={activeQueryClient}>
      <ProductCatalogView
        userId={effectiveUserId}
        hostType={hostType}
        syncMode={effectiveSyncMode}
        simulateDelay={simulateDelay}
        delayMs={delayMs}
        apiBaseUrl={apiBaseUrl}
        onCartAdded={onCartAdded}
      />
    </QueryClientProvider>
  );
}

export default ProductList;
