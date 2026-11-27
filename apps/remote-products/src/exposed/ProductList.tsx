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
  createMfeEventSourceId,
  createMfeQueryClient,
  sharedQueryClient,
  useMfeEvent,
} from 'remote_shared/utils';
import { DEFAULT_SIMULATE_DELAY_MS } from '../features/catalog/api/catalog-api';
import { type ProductListProps, normalizeUserId } from '../features/catalog/model/catalog-schema';
import { PRODUCTS_EVENT_SOURCE_PREFIX } from '../features/catalog/model/use-catalog-queries';
import { ProductCatalogView } from '../features/catalog/ui/ProductCatalogView';

export type { ProductListProps } from '../features/catalog/model/catalog-schema';

/**
 * Module Federation './ProductList' 노출 컴포넌트입니다.
 * - Mode A('mode-a-event') 선택 시: 리모트 내부 전용 localQueryClient를 지연 생성하여 타 앱과 메모리를 격리합니다.
 * - Mode B('mode-b-query') 선택 시: remote-shared의 싱글톤 sharedQueryClient를 공유하며 독립 QueryClient는 생성하지 않습니다.
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
  /** Mode A(독립 캐시)에서 사용할 remote-products 전용 QueryClient 인스턴스 Ref (Mode B 전용 시 미생성) */
  const localQueryClientRef = useRef<QueryClient | null>(null);

  /** ProductList 마운트 인스턴스당 1회 지연 생성하는 MFE 이벤트 발신자 ID Ref (DeferredRemoteProxy 경합 및 리렌더 재발급 방지) */
  const productsSourceIdRef = useRef<string | null>(null);
  // [분기 설명] 모듈 최상단 동기 호출을 피하고 최초 렌더 시점에 1회만 생성해 동일 인스턴스 생명주기 동안 같은 sourceId를 유지합니다.
  if (productsSourceIdRef.current === null) {
    productsSourceIdRef.current = createMfeEventSourceId(PRODUCTS_EVENT_SOURCE_PREFIX);
  }

  /** 상위 Props가 생략되었을 때 커스텀 이벤트(mfe:auth-changed)로 수신한 사용자 ID 상태 (미로그인 초기값: null) */
  const [eventUserId, setEventUserId] = useState<string | null>(null);

  /** 상위 Props가 생략되었을 때 커스텀 이벤트(mfe:sync-mode-changed)로 수신한 동기화 모드 상태 */
  const [eventSyncMode, setEventSyncMode] = useState<SyncMode>('mode-a-event');

  // 호스트에서 이벤트 버스로 사용자 전환 신호를 보낼 때 자동 수신 (언마운트 시 자동 해제 보장)
  useMfeEvent(MFE_EVENTS.AUTH_CHANGED, (payload) => {
    setEventUserId(normalizeUserId(payload.userId));
  });

  // 호스트에서 이벤트 버스로 동기화 모드 전환 신호를 보낼 때 자동 수신
  useMfeEvent(MFE_EVENTS.SYNC_MODE_CHANGED, (payload) => {
    setEventSyncMode(payload.syncMode);
  });

  /**
   * [분기 설명]
   * 명시적으로 userId prop(null·빈 문자열 포함)이 전달된 경우 임의 유저 폴백 없이 해당 값을 정규화해 우선 적용하고,
   * userId가 undefined로 생략된 경우에만 mfe:auth-changed 이벤트 상태(eventUserId, 초기값 null)를 사용합니다.
   */
  const effectiveUserId = userId !== undefined ? normalizeUserId(userId) : eventUserId;

  /** 최종 적용할 동기화 모드 (명시적 Props 우선, 미지정 시 이벤트 상태 사용) */
  const effectiveSyncMode = syncMode ?? eventSyncMode;

  /** 최종 주입할 QueryClient 인스턴스 (기본은 싱글톤 sharedQueryClient) */
  let activeQueryClient = sharedQueryClient;

  /**
   * [분기 설명]
   * - 'mode-a-event'가 실제로 활성화될 때만 최초 1회 독립 localQueryClient를 지연 생성합니다.
   * - 'mode-b-query' 전용으로 마운트될 때는 불필요한 QueryClient 인스턴스를 생성하지 않고 sharedQueryClient만 사용합니다.
   */
  if (effectiveSyncMode !== 'mode-b-query') {
    if (!localQueryClientRef.current) {
      localQueryClientRef.current = createMfeQueryClient();
    }
    activeQueryClient = localQueryClientRef.current;
  }

  return (
    // [분기 설명] Mode A ↔ Mode B 전환으로 activeQueryClient가 바뀔 때 key 리마운트로 QueryObserver Split-Brain을 방지합니다 (Study 12).
    <QueryClientProvider key={effectiveSyncMode} client={activeQueryClient}>
      <ProductCatalogView
        userId={effectiveUserId}
        hostType={hostType}
        syncMode={effectiveSyncMode}
        simulateDelay={simulateDelay}
        delayMs={delayMs}
        apiBaseUrl={apiBaseUrl}
        eventSourceId={productsSourceIdRef.current}
        onCartAdded={onCartAdded}
      />
    </QueryClientProvider>
  );
}

export default ProductList;
