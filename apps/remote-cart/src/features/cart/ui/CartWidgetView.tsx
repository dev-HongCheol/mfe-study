/**
 * @file CartWidgetView.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description 장바구니 조회·수량 증가·삭제, QueryClient 단위 Mode A 이벤트 동기화 채널 연동, DEV 스키마 에러 로깅 및 하위 UI 컴포넌트 조합을 담당하는 메인 뷰 컴포넌트입니다.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import type { HostOriginType, SyncMode } from 'remote_shared/utils';
import { normalizeError } from 'remote_shared/utils';
import {
  type CartErrorReport,
  type CartItemView,
  formatCartErrorReport,
} from '../model/cart-schema';
import { useCartSyncChannel } from '../model/cart-sync-channel';
import {
  useCartQuery,
  useDeleteCartMutation,
  useIncrementCartMutation,
} from '../model/use-cart-queries';
import { CartContent } from './CartContent';
import { CartErrorBanner } from './CartErrorBanner';
import { CartHeaderBar } from './CartHeaderBar';
import './cart.css';

/**
 * @description CartWidgetView 컴포넌트 Props 인터페이스
 */
export interface CartWidgetViewProps {
  /** 정규화된 로그인 사용자 ID (비로그인 시 null) */
  userId: string | null;

  /** 이 위젯을 마운트한 상위 호스트 출처 */
  hostType: HostOriginType;

  /** 활성 상태 동기화 학습 모드 ('mode-a-event' | 'mode-b-query') */
  syncMode: SyncMode;

  /** 1.5초 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay: boolean;

  /** 로딩 지연 시간(ms) 오버라이드 */
  delayMs?: number;

  /** 백엔드 API 기본 URL */
  apiBaseUrl?: string;
}

/**
 * 장바구니 조회, QueryClient 단위 이벤트 동기화(Mode A), 수량 증가/삭제 뮤테이션 및 상태별 UI를 조합하는 메인 뷰입니다.
 *
 * @param props - 정규화된 사용자 ID, 호스트 출처, 동기화 모드 및 API 옵션
 * @returns 장바구니 위젯 섹션 JSX 엘리먼트
 */
export function CartWidgetView({
  userId,
  hostType,
  syncMode,
  simulateDelay,
  delayMs,
  apiBaseUrl,
}: CartWidgetViewProps) {
  const activeQueryClient = useQueryClient();

  // [분기 설명] Mode A('mode-a-event')에서만 QueryClient 단위 동기화 채널을 구독하고,
  // Mode B('mode-b-query')에서는 enabled=false로 이벤트 리스너 등록 자체를 0회로 격리합니다 ([Study 12]).
  const receivedEventCount = useCartSyncChannel(
    activeQueryClient,
    userId,
    syncMode === 'mode-a-event',
  );

  /** 수량 증가 또는 삭제 실패 시 표시할 인라인 에러 리포트 상태 */
  const [mutationErrorReport, setMutationErrorReport] = useState<CartErrorReport | null>(null);

  /** 현재 뮤테이션(수량 증가 또는 단건 삭제)이 진행 중인 장바구니 항목 ID 상태 */
  const [mutatingItemId, setMutatingItemId] = useState<number | null>(null);

  /** 전체 비우기('all') 진행 여부 상태 */
  const [isClearingAll, setIsClearingAll] = useState<boolean>(false);

  const cartQuery = useCartQuery({
    userId,
    apiBaseUrl,
    simulateDelay,
    delayMs,
  });

  const incrementMutation = useIncrementCartMutation({
    userId,
    hostType,
    syncMode,
    apiBaseUrl,
  });

  const deleteMutation = useDeleteCartMutation({
    userId,
    hostType,
    syncMode,
    apiBaseUrl,
  });

  /** 조회 에러를 환경별(DEV/PROD) 리포트로 변환한 파생 값 */
  const queryErrorReport = cartQuery.error
    ? formatCartErrorReport(normalizeError(cartQuery.error))
    : null;

  // [분기 설명] DEV 환경에서 스키마 불일치 에러가 발생하면 F12 콘솔에 실패 필드 좌표를 구조화 출력합니다 (Study 05 #10).
  useEffect(() => {
    if (queryErrorReport && queryErrorReport.devDetails.length > 0) {
      console.error('[remote-cart] RESPONSE_SCHEMA_INVALID:', queryErrorReport.devDetails);
    }
  }, [queryErrorReport]);

  /**
   * 단건 장바구니 항목의 수량을 +1 증가시킵니다.
   *
   * @param item - 수량을 증가시킬 장바구니 항목
   */
  const handleIncrement = (item: CartItemView) => {
    setMutationErrorReport(null);
    setMutatingItemId(item.id);
    incrementMutation.mutate(item, {
      onError: (err) => {
        setMutationErrorReport(formatCartErrorReport(normalizeError(err)));
      },
      onSettled: () => {
        setMutatingItemId(null);
      },
    });
  };

  /**
   * 단건 장바구니 항목을 삭제합니다.
   *
   * @param item - 삭제할 장바구니 항목
   */
  const handleDelete = (item: CartItemView) => {
    setMutationErrorReport(null);
    setMutatingItemId(item.id);
    deleteMutation.mutate(
      {
        targetId: item.id,
        productId: item.productId,
        productName: item.productName,
      },
      {
        onError: (err) => {
          setMutationErrorReport(formatCartErrorReport(normalizeError(err)));
        },
        onSettled: () => {
          setMutatingItemId(null);
        },
      },
    );
  };

  /**
   * 현재 로그인 사용자의 장바구니 전체를 비웁니다.
   */
  const handleClearAll = () => {
    setMutationErrorReport(null);
    setIsClearingAll(true);
    deleteMutation.mutate(
      { targetId: 'all' },
      {
        onError: (err) => {
          setMutationErrorReport(formatCartErrorReport(normalizeError(err)));
        },
        onSettled: () => {
          setIsClearingAll(false);
        },
      },
    );
  };

  return (
    <section className="cart-widget-root" aria-label="장바구니 원격 위젯">
      <CartHeaderBar
        syncMode={syncMode}
        hostType={hostType}
        receivedEventCount={receivedEventCount}
        userId={userId}
      />

      {mutationErrorReport ? <CartErrorBanner report={mutationErrorReport} /> : null}

      <CartContent
        isAuthenticated={userId !== null}
        isLoading={cartQuery.isPending}
        errorReport={queryErrorReport}
        items={cartQuery.data ?? []}
        mutatingItemId={mutatingItemId}
        isClearing={isClearingAll}
        onRetry={() => {
          void cartQuery.refetch();
        }}
        onIncrement={handleIncrement}
        onDelete={handleDelete}
        onClearAll={handleClearAll}
      />
    </section>
  );
}
