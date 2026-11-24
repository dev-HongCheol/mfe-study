/**
 * @file cart-sync-channel.ts
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description QueryClient 인스턴스 단위로 고유 sourceId(createMfeEventSourceId)와 최대 1개의 mfeEventBus 리스너(Ref-Counting + 멱등 클린업)를 관리해 Mode A 자기 에코(Self-Echo) 중복 재조회를 차단하는 동기화 채널 모듈입니다 ([Study 12]).
 */
import type { QueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  CART_QUERY_KEY,
  type CartUpdatedEventPayload,
  MFE_EVENTS,
  type SyncMode,
  createMfeEventSourceId,
  mfeEventBus,
} from 'remote_shared/utils';

/**
 * @description QueryClient 인스턴스당 1:1로 매핑되는 장바구니 Mode A 동기화 채널 내부 상태 인터페이스
 */
export interface CartSyncChannel {
  /** 이 QueryClient 인스턴스 전용 고유 발신자 ID (자기 에코 자동 차단 키) */
  sourceId: string;

  /** 현재 이 QueryClient에서 구독 중인 userId별 활성 위젯 참조 수(Ref-Count) 맵 */
  users: Map<string, number>;

  /** 외부 이벤트 수신으로 실제 캐시 무효화가 발생한 userId별 누적 횟수 맵 */
  receivedCountByUser: Map<string, number>;

  /** QueryClient당 최대 1개만 유지되는 mfeEventBus.subscribe 해제 함수 */
  unsubscribe?: () => void;

  /** useSyncExternalStore 구독 컴포넌트에 스냅샷 변경을 알리는 리스너 집합 */
  listeners: Set<() => void>;
}

/**
 * @description 장바구니 쿼리 키 옵션 객체 인터페이스
 */
export interface CartQueryKeyOptions {
  /** 백엔드 API 기본 URL */
  apiBaseUrl: string;

  /** 1.5초 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay: boolean;
}

/** 사용자 단위 장바구니 쿼리 키 튜플 타입 (invalidateQueries / cancelQueries prefix 타깃) */
export type CartUserQueryKey = readonly ['cart', string];

/** 장바구니 상세 조회 쿼리 키 튜플 타입 (['cart', userId, { apiBaseUrl, simulateDelay }]) */
export type CartDetailQueryKey = readonly ['cart', string | null, CartQueryKeyOptions];

/** 이중 번들링·HMR 환경에서도 동일 QueryClient에 대해 단일 채널 레지스트리를 공유하기 위한 전역 심볼 */
const REGISTRY_SYMBOL = Symbol.for('mfe-study.remote-cart.sync-channels');

/** MfeInspector 출처 추적 및 자기 에코 식별을 위한 장바구니 앱 발신자 접두사 상수 */
const CART_EVENT_SOURCE_PREFIX = 'remote-cart';

/**
 * 전역 심볼 슬롯에서 WeakMap<QueryClient, CartSyncChannel> 레지스트리를 조회하거나 최초 1회 초기화합니다.
 * WeakMap을 사용해 언마운트된 QueryClient가 GC될 때 채널 상태도 함께 회수됩니다.
 *
 * @returns QueryClient별 동기화 채널 WeakMap 레지스트리
 */
function getChannelRegistry(): WeakMap<QueryClient, CartSyncChannel> {
  const globalStore = globalThis as Record<
    symbol,
    WeakMap<QueryClient, CartSyncChannel> | undefined
  >;
  let registry = globalStore[REGISTRY_SYMBOL];

  // [분기 설명] 모듈이 처음 로드되었을 때만 전역 레지스트리를 생성해 HMR·이중 청크 환경에서도 참조를 보존합니다.
  if (!registry) {
    registry = new WeakMap<QueryClient, CartSyncChannel>();
    globalStore[REGISTRY_SYMBOL] = registry;
  }

  return registry;
}

/**
 * 지정된 QueryClient에 연결된 동기화 채널을 조회하거나 없으면 고유 sourceId와 함께 생성합니다.
 *
 * @param queryClient - 대상 TanStack QueryClient 인스턴스
 * @returns 해당 QueryClient 전용 CartSyncChannel 객체
 */
function getOrCreateChannel(queryClient: QueryClient): CartSyncChannel {
  const registry = getChannelRegistry();
  let channel = registry.get(queryClient);

  // [분기 설명] QueryClient당 정확히 1개의 고유 sourceId와 채널 상태를 보장해 동일 캐시 공유 위젯 간 중복 무효화를 차단합니다.
  if (!channel) {
    channel = {
      sourceId: createMfeEventSourceId(CART_EVENT_SOURCE_PREFIX),
      users: new Map<string, number>(),
      receivedCountByUser: new Map<string, number>(),
      listeners: new Set<() => void>(),
    };
    registry.set(queryClient, channel);
  }

  return channel;
}

/**
 * 사용자 단위의 장바구니 prefix 쿼리 키(['cart', userId])를 생성합니다.
 *
 * @param userId - 정규화된 로그인 사용자 ID
 * @returns 사용자 단위 장바구니 쿼리 키 튜플
 */
export function buildCartUserQueryKey(userId: string): CartUserQueryKey {
  return [...CART_QUERY_KEY, userId] as const;
}

/**
 * 장바구니 목록 상세 조회용 쿼리 키(['cart', userId, { apiBaseUrl, simulateDelay }])를 생성합니다.
 * TanStack Query v5의 prefix 매칭(exact: false) 규칙에 맞춰 사용자 단위 무효화(['cart', userId])와
 * Mode B 외부 전체 무효화(['cart'])를 모두 100% 호환합니다.
 *
 * @param userId - 정규화된 로그인 사용자 ID (비로그인 시 null)
 * @param options - API 기본 URL 및 지연 시뮬레이션 옵션
 * @returns 장바구니 상세 조회 쿼리 키 튜플
 */
export function buildCartQueryKey(
  userId: string | null,
  options: CartQueryKeyOptions,
): CartDetailQueryKey {
  return [...CART_QUERY_KEY, userId, options] as const;
}

/**
 * 지정된 QueryClient에 할당된 고유 이벤트 발신자 ID(sourceId)를 반환합니다.
 *
 * @param queryClient - 대상 TanStack QueryClient 인스턴스
 * @returns QueryClient 전용 고유 sourceId 문자열
 */
export function getCartSyncSourceId(queryClient: QueryClient): string {
  return getOrCreateChannel(queryClient).sourceId;
}

/**
 * 지정된 QueryClient와 사용자 ID에 대해 누적된 외부 mfe:cart-updated 이벤트 수신 횟수를 조회합니다.
 * 읽기 전용 조회 시 불필요한 채널 생성을 피하기 위해 레지스트리에 채널이 없으면 즉시 0을 반환합니다.
 *
 * @param queryClient - 대상 TanStack QueryClient 인스턴스
 * @param userId - 정규화된 로그인 사용자 ID (비로그인 시 null)
 * @returns 해당 사용자의 외부 이벤트 수신 누적 횟수
 */
export function getCartSyncReceivedCount(queryClient: QueryClient, userId: string | null): number {
  // [분기 설명] 비로그인 상태에서는 수신 카운터를 추적하지 않으므로 즉시 0을 반환합니다.
  if (!userId) {
    return 0;
  }

  const channel = getChannelRegistry().get(queryClient);
  return channel?.receivedCountByUser.get(userId) ?? 0;
}

/**
 * useSyncExternalStore가 채널 스냅샷 변경을 구독하기 위한 내부 스토어 리스너 등록 함수입니다.
 *
 * @param queryClient - 대상 TanStack QueryClient 인스턴스
 * @param listener - 스냅샷 변경 시 호출할 React 통지 콜백
 * @returns 리스너 해제 함수
 */
function subscribeChannelStore(queryClient: QueryClient, listener: () => void): () => void {
  const channel = getOrCreateChannel(queryClient);
  channel.listeners.add(listener);

  return () => {
    channel.listeners.delete(listener);
  };
}

/**
 * 지정된 QueryClient에서 특정 userId에 대한 Mode A 외부 이벤트 동기화 구독을 등록합니다.
 * 동일 QueryClient에 여러 위젯이 마운트되어도 Ref-Counting으로 mfeEventBus.subscribe는 최대 1개만 유지하며,
 * ignoreSourceId 옵션으로 자기 에코(Self-Echo)를 이벤트 버스 경계에서 즉시 차단합니다.
 *
 * @param queryClient - 동기화 대상 QueryClient 인스턴스
 * @param userId - 구독할 정규화된 로그인 사용자 ID
 * @returns 멱등성이 보장된 구독 해제 함수
 */
export function subscribeCartSync(queryClient: QueryClient, userId: string): () => void {
  const channel = getOrCreateChannel(queryClient);
  const currentRefCount = channel.users.get(userId) ?? 0;
  channel.users.set(userId, currentRefCount + 1);

  // [분기 설명] QueryClient당 mfeEventBus 리스너가 아직 등록되지 않은 최초 1회에만 구독을 시작합니다.
  if (!channel.unsubscribe) {
    channel.unsubscribe = mfeEventBus.subscribe(
      MFE_EVENTS.CART_UPDATED,
      (payload) => {
        const activeCount = channel.users.get(payload.userId) ?? 0;

        // [분기 설명] 현재 이 QueryClient에서 해당 사용자를 구독 중인 활성 위젯이 없으면 캐시 무효화와 카운트 갱신을 건너뜁니다.
        if (activeCount <= 0) {
          return;
        }

        const nextReceivedCount = (channel.receivedCountByUser.get(payload.userId) ?? 0) + 1;
        channel.receivedCountByUser.set(payload.userId, nextReceivedCount);

        for (const notify of channel.listeners) {
          notify();
        }

        void queryClient.invalidateQueries({
          queryKey: buildCartUserQueryKey(payload.userId),
        });
      },
      { ignoreSourceId: channel.sourceId },
    );
  }

  /** 중복 해제 호출(StrictMode·수동 중복 cleanup)로 타 위젯의 참조 수가 훼손되는 것을 막는 멱등 가드 */
  let disposed = false;

  return () => {
    // [분기 설명] 이미 해제된 클린업 함수가 재호출되면 참조 수를 중복 감소시키지 않고 즉시 종료합니다.
    if (disposed) {
      return;
    }
    disposed = true;

    const remaining = (channel.users.get(userId) ?? 0) - 1;

    // [분기 설명] 해당 userId를 구독하는 위젯이 모두 언마운트되었을 때만 맵에서 키를 제거합니다.
    if (remaining <= 0) {
      channel.users.delete(userId);
    } else {
      channel.users.set(userId, remaining);
    }

    // [분기 설명] 이 QueryClient의 모든 활성 사용자 구독이 0건이 되었을 때만 mfeEventBus 리스너를 완전 해제합니다.
    if (channel.users.size === 0 && channel.unsubscribe) {
      const unsubscribe = channel.unsubscribe;
      channel.unsubscribe = undefined;
      unsubscribe();
    }
  };
}

/**
 * React 컴포넌트에서 QueryClient 단위 Mode A 동기화 채널을 구독하고,
 * useSyncExternalStore를 통해 현재 사용자의 외부 이벤트 수신 횟수를 안전하게 구독하는 훅입니다.
 * Mode B(enabled === false)에서는 mfeEventBus 구독을 0회로 완전 격리합니다.
 *
 * @param queryClient - 현재 활성 QueryClient 인스턴스
 * @param userId - 정규화된 로그인 사용자 ID (비로그인 시 null)
 * @param enabled - Mode A 활성화 여부 (Mode B에서는 false)
 * @returns 현재 사용자의 외부 이벤트 누적 수신 횟수
 */
export function useCartSyncChannel(
  queryClient: QueryClient,
  userId: string | null,
  enabled: boolean,
): number {
  useEffect(() => {
    // [분기 설명] Mode B이거나 비로그인(userId === null) 상태에서는 mfeEventBus 리스너를 전혀 등록하지 않습니다.
    if (!enabled || !userId) {
      return;
    }

    return subscribeCartSync(queryClient, userId);
  }, [queryClient, userId, enabled]);

  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeChannelStore(queryClient, onStoreChange),
    [queryClient],
  );

  const getSnapshot = () => getCartSyncReceivedCount(queryClient, userId);
  const getServerSnapshot = () => 0;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * 장바구니 쓰기 뮤테이션 성공 직후 Mode A/Mode B 규약에 맞춰 동기화를 수행합니다.
 * Mode A에서는 QueryClient 고유 sourceId와 함께 이벤트를 먼저 발행(외부 리스너 예외 try/catch 격리)한 뒤
 * 로컬 QueryClient의 사용자 단위 캐시(['cart', userId])를 정확히 1회 무효화합니다.
 * Mode B에서는 이벤트를 발행하지 않고 싱글톤 sharedQueryClient의 사용자 단위 캐시만 1회 무효화합니다.
 *
 * @param queryClient - 현재 활성 QueryClient 인스턴스
 * @param syncMode - 상태 동기화 비교 학습 모드 ('mode-a-event' | 'mode-b-query')
 * @param eventPayload - Mode A에서 발행할 장바구니 변경 이벤트 페이로드
 * @returns 로컬 캐시 무효화 완료 Promise
 */
export async function syncCartAfterMutation(
  queryClient: QueryClient,
  syncMode: SyncMode,
  eventPayload: CartUpdatedEventPayload,
): Promise<void> {
  // [분기 설명] Mode A에서만 QueryClient 고유 sourceId를 첨부해 외부 앱에 먼저 알리며, 외부 리스너 예외가 로컬 캐시 갱신을 막지 못하도록 격리합니다.
  if (syncMode === 'mode-a-event') {
    const channel = getOrCreateChannel(queryClient);
    try {
      mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, eventPayload, {
        sourceId: channel.sourceId,
      });
    } catch (error) {
      console.error('[remote-cart] mfe:cart-updated 이벤트 발행 중 외부 리스너 오류:', error);
    }
  }

  await queryClient.invalidateQueries({
    queryKey: buildCartUserQueryKey(eventPayload.userId),
  });
}
