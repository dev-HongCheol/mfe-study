/**
 * @file use-catalog-queries.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description 상품 목록 조회(useProductsQuery) 및 Mode A / Mode B 상태 동기화 비교 로직이 캡슐화된 장바구니 추가(useAddToCartMutation) 훅입니다 ([Study 01, Study 05 #01]).
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import type { CartUpdatedEventPayload, HostOriginType, SyncMode } from 'remote_shared/utils';
import {
  CART_QUERY_KEY,
  DEFAULT_API_BASE_URL,
  MFE_EVENTS,
  PRODUCTS_QUERY_KEY,
  mfeEventBus,
  sharedQueryClient,
} from 'remote_shared/utils';
import { DEFAULT_SIMULATE_DELAY_MS, fetchProducts, postAddToCart } from '../api/catalog-api.js';
import type { CartItemView, ProductEntity, ProductFilterValues } from './catalog-schema.js';

/**
 * @description useProductsQuery 훅 입력 옵션 인터페이스
 */
export interface UseProductsQueryOptions {
  /** 현재 적용된 카테고리 및 검색어 필터 */
  filter: ProductFilterValues;

  /** 백엔드 API 기본 URL */
  apiBaseUrl?: string;

  /** 1.5초 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay?: boolean;

  /** 로딩 지연 시간(ms) 오버라이드 */
  delayMs?: number;
}

/**
 * @description 장바구니 담기 뮤테이션 실행 시 전달할 상품 변수 인터페이스
 */
export interface AddToCartVariables {
  /** 장바구니에 담을 대상 상품 엔티티 */
  product: ProductEntity;

  /** 담을 수량 (기본값: 1) */
  quantity?: number;
}

/**
 * @description useAddToCartMutation 훅 설정 옵션 인터페이스
 */
export interface UseAddToCartMutationOptions {
  /** 현재 로그인된 사용자 고유 ID */
  userId: string;

  /** 상위 호스트 출처 ('vite' | 'rspack' | 'standalone') */
  hostType: HostOriginType;

  /** 상태 동기화 비교 모드 ('mode-a-event' | 'mode-b-query') */
  syncMode: SyncMode;

  /** 백엔드 API 기본 URL */
  apiBaseUrl?: string;

  /** 장바구니 담기 성공 시 상위 호스트에 알리는 선택적 콜백 */
  onCartAdded?: (payload: CartUpdatedEventPayload) => void;
}

/**
 * 카테고리·검색어 필터 및 지연 시뮬레이션 옵션에 따라 상품 목록을 조회하는 TanStack Query 훅입니다.
 *
 * @param options - 필터 및 네트워크 설정 옵션
 * @returns TanStack Query 결과 객체
 */
export function useProductsQuery(options: UseProductsQueryOptions) {
  const {
    filter,
    apiBaseUrl = DEFAULT_API_BASE_URL,
    simulateDelay = false,
    delayMs = DEFAULT_SIMULATE_DELAY_MS,
  } = options;

  return useQuery({
    queryKey: [
      ...PRODUCTS_QUERY_KEY,
      {
        category: filter.category,
        search: filter.search.trim(),
        apiBaseUrl,
        simulateDelay,
      },
    ] as const,
    queryFn: ({ signal }) =>
      fetchProducts({
        category: filter.category,
        search: filter.search,
        apiBaseUrl,
        simulateDelay,
        delayMs,
        signal,
      }),
  });
}

/**
 * 상품을 장바구니에 추가하고 선택된 syncMode(Mode A vs Mode B)에 맞춰 타 마이크로 앱과 상태를 동기화하는 뮤테이션 훅입니다.
 *
 * @param options - 사용자 ID, 호스트 출처, 동기화 모드 및 콜백 옵션
 * @returns TanStack Query useMutation 결과 객체
 */
export function useAddToCartMutation(options: UseAddToCartMutationOptions) {
  const { userId, hostType, syncMode, apiBaseUrl = DEFAULT_API_BASE_URL, onCartAdded } = options;

  return useMutation<CartItemView, unknown, AddToCartVariables>({
    mutationFn: ({ product, quantity = 1 }) =>
      postAddToCart({
        userId,
        productId: product.id,
        quantity,
        addedFromHost: hostType,
        apiBaseUrl,
      }),

    onMutate: async () => {
      // [분기 설명] Mode B(싱글톤 sharedQueryClient 공유)에서는 뮤테이션 출발 직전에
      // 진행 중이던 구버전 장바구니 GET 요청을 취소하여 응답 역전(Race Condition)을 원천 차단합니다 (Study 05 #01).
      if (syncMode === 'mode-b-query') {
        await sharedQueryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      }
    },

    onSuccess: async (addedItem, { product, quantity = 1 }) => {
      const eventPayload: CartUpdatedEventPayload = {
        action: 'add',
        userId,
        productId: product.id,
        productName: product.name,
        quantity,
        sourceHost: hostType,
        timestamp: addedItem.createdAt || new Date().toISOString(),
      };

      // [분기 설명] Mode A('mode-a-event')와 Mode B('mode-b-query')의 순수 동작 차이를 명확히 비교하기 위해:
      // - Mode A에서는 공유 캐시를 건드리지 않고 오직 CustomEvent('mfe:cart-updated') 신호만 발송합니다.
      // - Mode B에서는 이벤트 버스 발송 없이 싱글톤 sharedQueryClient.invalidateQueries(['cart'])만 호출합니다.
      if (syncMode === 'mode-b-query') {
        await sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      } else {
        mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, eventPayload);
      }

      onCartAdded?.(eventPayload);
    },
  });
}
