/**
 * @file CartWidget.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed true (./CartWidget)
 * @description Module Federation ./CartWidget 공개 진입 컴포넌트입니다. syncMode에 따라 독립 QueryClient(Mode A) 또는 싱글톤 sharedQueryClient(Mode B)를 선택 주입합니다 ([SSOT § 5.4.3]).
 */
import { type QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { HostOriginType, SyncMode } from 'remote_shared/utils';
import {
  MFE_EVENTS,
  createMfeQueryClient,
  sharedQueryClient,
  useMfeEvent,
} from 'remote_shared/utils';
import { normalizeUserId } from '../features/cart/model/cart-schema';
import { CartWidgetView } from '../features/cart/ui/CartWidgetView';

/**
 * @description 장바구니 리모트(remote-cart, Port 3003)의 노출 컴포넌트 Props 계약 ([SSOT § 5.4.3])
 */
export interface CartWidgetProps {
  /** 현재 로그인된 사용자 고유 ID (미지정·null·공백 시 비로그인 상태 — 임의 유저 폴백 금지) */
  userId?: string | null;

  /** 이 컴포넌트를 마운트한 상위 호스트 종류 (기본값: 'standalone') */
  hostType?: HostOriginType;

  /** 상태 동기화 아키텍처 비교 모드 (미지정 시 mfe:sync-mode-changed 구독, 기본값: 'mode-a-event') */
  syncMode?: SyncMode;

  /** 1.5초 네트워크 로딩 지연(Skeleton UI 확인) 시뮬레이션 활성화 여부 (기본값: false) */
  simulateDelay?: boolean;

  /** 로딩 지연 시간(ms) 오버라이드 (테스트 가속용, 기본값: 1500) */
  delayMs?: number;

  /** 백엔드 API 기본 URL 오버라이드 (기본값: 'http://localhost:4000/api') */
  apiBaseUrl?: string;
}

/**
 * 호스트(host-vite:3000, host-rspack:3001) 또는 단독 실행(Port 3003) 환경에서 마운트되는 ./CartWidget 공개 컴포넌트입니다.
 *
 * @param props - CartWidgetProps 계약 옵션
 * @returns QueryClientProvider로 감싼 장바구니 위젯 JSX 엘리먼트
 */
export function CartWidget({
  userId,
  hostType = 'standalone',
  syncMode,
  simulateDelay = false,
  delayMs,
  apiBaseUrl,
}: CartWidgetProps) {
  /** Props로 userId가 생략된 경우 mfe:auth-changed 이벤트로 수신하는 보조 사용자 ID 상태 (초기값 null, 임의 폴백 금지) */
  const [eventUserId, setEventUserId] = useState<string | null>(null);

  /** Props로 syncMode가 생략된 경우 mfe:sync-mode-changed 이벤트로 수신하는 동기화 모드 상태 */
  const [eventSyncMode, setEventSyncMode] = useState<SyncMode>('mode-a-event');

  useMfeEvent(MFE_EVENTS.AUTH_CHANGED, (payload) => {
    setEventUserId(normalizeUserId(payload.userId));
  });

  useMfeEvent(MFE_EVENTS.SYNC_MODE_CHANGED, (payload) => {
    setEventSyncMode(payload.syncMode);
  });

  /** [분기 설명] Props가 명시적으로 전달(undefined 아님)되면 Props를 우선하고, 생략된 경우에만 이벤트 구독 값을 사용합니다. */
  const effectiveUserId = userId !== undefined ? normalizeUserId(userId) : eventUserId;
  const effectiveSyncMode: SyncMode = syncMode ?? eventSyncMode;

  /** Mode A 전용 독립 QueryClient를 보관하는 Ref (Mode B 단독 마운트 시 불필요한 생성 0회 보장) */
  const localQueryClientRef = useRef<QueryClient | null>(null);

  // [분기 설명] Mode A가 활성화된 경우에만 최초 1회 독립 QueryClient를 지연 생성합니다.
  if (effectiveSyncMode !== 'mode-b-query' && !localQueryClientRef.current) {
    localQueryClientRef.current = createMfeQueryClient();
  }

  const activeQueryClient =
    effectiveSyncMode === 'mode-b-query'
      ? sharedQueryClient
      : (localQueryClientRef.current as QueryClient);

  return (
    <QueryClientProvider client={activeQueryClient}>
      <CartWidgetView
        userId={effectiveUserId}
        hostType={hostType}
        syncMode={effectiveSyncMode}
        simulateDelay={simulateDelay}
        delayMs={delayMs}
        apiBaseUrl={apiBaseUrl}
      />
    </QueryClientProvider>
  );
}

export default CartWidget;
