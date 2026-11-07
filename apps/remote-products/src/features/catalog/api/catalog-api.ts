/**
 * @file catalog-api.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description GET /api/products, POST /api/cart HTTP 요청 함수 및 AbortSignal 연동 지연 시뮬레이션 유틸리티입니다 ([Study 05 #01, #07, #10]).
 */
import type { HostOriginType } from 'remote_shared/utils';
import { DEFAULT_API_BASE_URL, createApiClient, unwrapApiResponse } from 'remote_shared/utils';
import {
  type CartItemView,
  type ProductCategoryFilter,
  type ProductEntity,
  cartItemViewSchema,
  productEntityListSchema,
} from '../model/catalog-schema.js';

/** 기본 로딩 지연 시뮬레이션 시간 상수 (1.5초) */
export const DEFAULT_SIMULATE_DELAY_MS = 1_500;

/**
 * @description GET /api/products 조회 요청 파라미터 인터페이스
 */
export interface FetchProductsParams {
  /** 선택된 카테고리 필터 ('all'이면 전체 조회) */
  category?: ProductCategoryFilter;

  /** 상품명·설명 부분 일치 검색 키워드 */
  search?: string;

  /** 백엔드 API 기본 URL (기본값: 'http://localhost:4000/api') */
  apiBaseUrl?: string;

  /** 1.5초 네트워크 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay?: boolean;

  /** 지연 시간(ms) 오버라이드 (기본값: 1500) */
  delayMs?: number;

  /** TanStack Query에서 전달하는 요청 취소용 AbortSignal */
  signal?: AbortSignal;
}

/**
 * @description POST /api/cart 요청 바디 인터페이스
 */
export interface PostAddToCartParams {
  /** 대상 사용자 고유 ID */
  userId: string;

  /** 담을 상품 고유 ID */
  productId: number;

  /** 추가할 수량 (1 ~ 99) */
  quantity: number;

  /** 요청을 발생시킨 상위 호스트 출처 */
  addedFromHost: HostOriginType;

  /** 백엔드 API 기본 URL 오버라이드 */
  apiBaseUrl?: string;

  /** 요청 취소용 AbortSignal */
  signal?: AbortSignal;
}

/**
 * AbortSignal과 연동되어 지정된 시간(ms)만큼 대기하는 비동기 지연 함수입니다.
 * 대기 도중 signal이 취소(abort)되면 타이머를 즉시 해제하고 AbortError를 던집니다.
 *
 * @param ms - 대기할 밀리초(ms)
 * @param signal - 취소 감지용 AbortSignal (선택)
 * @returns 지연 완료 Promise
 */
export function delayWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // [분기 설명] 시작 시점에 이미 취소된 신호라면 타이머를 생성하지 않고 즉시 중단합니다.
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }

    const timerId = setTimeout(() => {
      signal?.removeEventListener('abort', handleAbort);
      resolve();
    }, ms);

    function handleAbort() {
      clearTimeout(timerId);
      reject(new DOMException('The operation was aborted.', 'AbortError'));
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

/**
 * 백엔드 GET /api/products 엔드포인트를 호출하여 상품 목록을 조회하고 Zod 스키마로 검증합니다.
 *
 * @param params - 필터, 지연 시뮬레이션 및 AbortSignal 옵션
 * @returns 검증된 ProductEntity 배열
 */
export async function fetchProducts(params: FetchProductsParams = {}): Promise<ProductEntity[]> {
  const {
    category = 'all',
    search = '',
    apiBaseUrl = DEFAULT_API_BASE_URL,
    simulateDelay = false,
    delayMs = DEFAULT_SIMULATE_DELAY_MS,
    signal,
  } = params;

  // [분기 설명] 1.5초 지연 시뮬레이션 토글이 켜진 경우 네트워크 호출 전에 AbortSignal 연동 대기를 수행합니다.
  if (simulateDelay && delayMs > 0) {
    await delayWithSignal(delayMs, signal);
  }

  const client = createApiClient(apiBaseUrl);
  const searchParams: Record<string, string> = {};

  // [분기 설명] 'all'이 아닌 유효 카테고리가 선택된 경우에만 쿼리스트링에 포함합니다.
  if (category && category !== 'all') {
    searchParams.category = category;
  }

  const trimmedSearch = search.trim();
  // [분기 설명] 공백을 제거한 검색어가 존재하는 경우에만 쿼리스트링에 포함합니다.
  if (trimmedSearch.length > 0) {
    searchParams.search = trimmedSearch;
  }

  const responsePromise = client.get('products', {
    searchParams,
    signal,
  });

  return unwrapApiResponse(responsePromise, productEntityListSchema);
}

/**
 * 백엔드 POST /api/cart 엔드포인트를 호출하여 상품을 장바구니에 추가(원자적 UPSERT)합니다.
 *
 * @param params - 사용자 ID, 상품 ID, 수량, 호스트 출처 정보
 * @returns 갱신된 장바구니 항목(CartItemView)
 */
export async function postAddToCart(params: PostAddToCartParams): Promise<CartItemView> {
  const {
    userId,
    productId,
    quantity,
    addedFromHost,
    apiBaseUrl = DEFAULT_API_BASE_URL,
    signal,
  } = params;

  const client = createApiClient(apiBaseUrl);
  const responsePromise = client.post('cart', {
    json: {
      userId,
      productId,
      quantity,
      addedFromHost,
    },
    signal,
  });

  return unwrapApiResponse(responsePromise, cartItemViewSchema);
}
