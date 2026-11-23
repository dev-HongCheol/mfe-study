/**
 * @file use-cart-queries.ts
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description 장바구니 조회(useCartQuery), 수량 증가(useIncrementCartMutation), 단건·전체 삭제(useDeleteCartMutation) 및 Mode A vs Mode B 상태 동기화 훅입니다 ([Study 01, Study 05 #01]).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CartUpdatedEventPayload, HostOriginType, SyncMode } from 'remote_shared/utils';
import {
  CART_QUERY_KEY,
  DEFAULT_API_BASE_URL,
  MFE_EVENTS,
  mfeEventBus,
  sharedQueryClient,
} from 'remote_shared/utils';
import {
  DEFAULT_SIMULATE_DELAY_MS,
  deleteCartItemApi,
  fetchCartItems,
  postIncrementCartItem,
} from '../api/cart-api';
import { type CartItemView, type DeleteCartResult, normalizeUserId } from './cart-schema';

/**
 * @description useCartQuery 훅 입력 옵션 인터페이스
 */
export interface UseCartQueryOptions {
  /** 정규화된 로그인 사용자 ID (null이면 비인증 상태로 쿼리 자동 비활성화) */
  userId: string | null;

  /** 백엔드 API 기본 URL */
  apiBaseUrl?: string;

  /** 1.5초 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay?: boolean;

  /** 로딩 지연 시간(ms) 오버라이드 */
  delayMs?: number;
}

/**
 * @description 장바구니 뮤테이션 공통 설정 옵션 인터페이스
 */
export interface UseCartMutationOptions {
  /** 현재 로그인된 사용자 고유 ID (null이면 비인증 차단) */
  userId: string | null;

  /** 상위 호스트 출처 ('vite' | 'rspack' | 'standalone') */
  hostType: HostOriginType;

  /** 상태 동기화 비교 모드 ('mode-a-event' | 'mode-b-query') */
  syncMode: SyncMode;

  /** 백엔드 API 기본 URL */
  apiBaseUrl?: string;
}

/**
 * @description 단건 또는 전체 삭제 뮤테이션 호출 변수 인터페이스
 */
export interface DeleteCartVariables {
  /** 삭제 대상 장바구니 항목 ID 또는 전체 비우기 키워드('all') */
  targetId: number | 'all';

  /** 삭제된 상품 ID (단건 삭제 시 이벤트 로그용) */
  productId?: number;

  /** 삭제된 상품명 (단건 삭제 시 이벤트 로그용) */
  productName?: string;
}

/**
 * 로그인된 사용자의 장바구니 목록을 조회하는 TanStack Query 훅입니다.
 * 비로그인(userId === null) 상태에서는 enabled: false로 네트워크 요청을 0회 차단합니다 ([SSOT § 5.4.3]).
 *
 * @param options - 사용자 ID 및 지연 시뮬레이션 설정 옵션
 * @returns TanStack Query useQuery 결과 객체
 */
export function useCartQuery(options: UseCartQueryOptions) {
  const {
    userId,
    apiBaseUrl = DEFAULT_API_BASE_URL,
    simulateDelay = false,
    delayMs = DEFAULT_SIMULATE_DELAY_MS,
  } = options;

  const validUserId = normalizeUserId(userId);

  return useQuery({
    // [분기 설명] CART_QUERY_KEY(['cart'])를 prefix로 유지하여 Mode B에서
    // sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY }) 호출 시 즉시 무효화되도록 보장합니다.
    queryKey: [
      ...CART_QUERY_KEY,
      {
        userId: validUserId,
        apiBaseUrl,
        simulateDelay,
      },
    ] as const,
    // [분기 설명] 비인증 상태에서는 임의 유저로 폴백하지 않고 쿼리 실행 자체를 차단합니다 (SSOT § 5.4.3).
    enabled: validUserId !== null,
    queryFn: ({ signal }) => {
      if (!validUserId) {
        return Promise.resolve<CartItemView[]>([]);
      }
      return fetchCartItems({
        userId: validUserId,
        apiBaseUrl,
        simulateDelay,
        delayMs,
        signal,
      });
    },
  });
}

/**
 * 장바구니 항목의 수량을 [+1] 증가시키고 syncMode(Mode A vs Mode B)에 따라 캐시를 동기화하는 뮤테이션 훅입니다.
 *
 * @param options - 사용자 ID, 호스트 출처, 동기화 모드 옵션
 * @returns TanStack Query useMutation 결과 객체
 */
export function useIncrementCartMutation(options: UseCartMutationOptions) {
  const { userId, hostType, syncMode, apiBaseUrl = DEFAULT_API_BASE_URL } = options;
  const activeQueryClient = useQueryClient();
  const validUserId = normalizeUserId(userId);

  return useMutation<CartItemView, unknown, CartItemView>({
    mutationFn: async (item) => {
      // [분기 설명] UI 우회 호출 시에도 비인증 상태에서는 쓰기 요청을 원천 차단합니다.
      if (!validUserId) {
        throw {
          code: 'UNAUTHORIZED',
          message: '로그인 후 장바구니 수량을 변경할 수 있습니다.',
          status: 401,
          originalError: null,
        };
      }
      return postIncrementCartItem({
        userId: validUserId,
        productId: item.productId,
        quantity: 1,
        addedFromHost: hostType,
        apiBaseUrl,
      });
    },
    onMutate: async () => {
      // [분기 설명] 수정 요청 출발 전 진행 중인 구버전 GET /api/cart 요청을 취소해 응답 역전(Race Condition)을 차단합니다 (Study 05 #01).
      if (syncMode === 'mode-b-query') {
        await sharedQueryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      } else {
        await activeQueryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      }
    },
    onSuccess: async (updatedItem) => {
      if (!validUserId) {
        return;
      }

      // [분기 설명] Mode B에서는 CustomEvent 발송 없이 싱글톤 sharedQueryClient만 무효화하고,
      // Mode A에서는 독립 QueryClient 재조회와 함께 mfe:cart-updated 이벤트를 발행합니다.
      if (syncMode === 'mode-b-query') {
        await sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      } else {
        await activeQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
        const payload: CartUpdatedEventPayload = {
          action: 'add',
          userId: validUserId,
          productId: updatedItem.productId,
          productName: updatedItem.productName,
          quantity: 1,
          sourceHost: hostType,
          timestamp: updatedItem.createdAt || new Date().toISOString(),
        };
        mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload);
      }
    },
  });
}

/**
 * 장바구니 단건 항목 삭제 또는 전체 비우기('all')를 수행하고 syncMode에 따라 동기화하는 뮤테이션 훅입니다.
 *
 * @param options - 사용자 ID, 호스트 출처, 동기화 모드 옵션
 * @returns TanStack Query useMutation 결과 객체
 */
export function useDeleteCartMutation(options: UseCartMutationOptions) {
  const { userId, hostType, syncMode, apiBaseUrl = DEFAULT_API_BASE_URL } = options;
  const activeQueryClient = useQueryClient();
  const validUserId = normalizeUserId(userId);

  return useMutation<DeleteCartResult, unknown, DeleteCartVariables>({
    mutationFn: async ({ targetId }) => {
      // [분기 설명] 비인증 상태에서는 삭제 API 호출을 원천 차단합니다 (SSOT § 5.4.3).
      if (!validUserId) {
        throw {
          code: 'UNAUTHORIZED',
          message: '로그인 후 장바구니를 수정할 수 있습니다.',
          status: 401,
          originalError: null,
        };
      }
      return deleteCartItemApi({
        targetId,
        userId: validUserId,
        apiBaseUrl,
      });
    },
    onMutate: async () => {
      // [분기 설명] 삭제 요청 출발 전 진행 중이던 조회 요청을 취소해 응답 역전을 방지합니다 (Study 05 #01).
      if (syncMode === 'mode-b-query') {
        await sharedQueryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      } else {
        await activeQueryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      }
    },
    onSuccess: async (_result, variables) => {
      if (!validUserId) {
        return;
      }

      // [분기 설명] Mode B는 싱글톤 sharedQueryClient 무효화만 수행하고, Mode A는 독립 캐시 갱신 + CustomEvent 발행만 수행합니다.
      if (syncMode === 'mode-b-query') {
        await sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      } else {
        await activeQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
        const payload: CartUpdatedEventPayload = {
          action: variables.targetId === 'all' ? 'clear' : 'remove',
          userId: validUserId,
          productId: variables.productId,
          productName: variables.productName,
          sourceHost: hostType,
          timestamp: new Date().toISOString(),
        };
        mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, payload);
      }
    },
  });
}
