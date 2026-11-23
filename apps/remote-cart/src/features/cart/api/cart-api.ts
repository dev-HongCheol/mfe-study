/**
 * @file cart-api.ts
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description GET /api/cart, POST /api/cart, DELETE /api/cart/:id HTTP 요청 함수 및 AbortSignal 연동 지연 시뮬레이션 유틸리티입니다 ([Study 05 #01, #07, #10], [Study 08]).
 */
import type { HostOriginType } from 'remote_shared/utils';
import { DEFAULT_API_BASE_URL, createApiClient, unwrapApiResponse } from 'remote_shared/utils';
import {
  type CartItemView,
  type DeleteCartResult,
  cartItemListSchema,
  cartItemViewSchema,
  deleteCartResultSchema,
} from '../model/cart-schema';

/** 기본 로딩 지연 시뮬레이션 시간 상수 (1.5초) */
export const DEFAULT_SIMULATE_DELAY_MS = 1_500;

/**
 * @description GET /api/cart 장바구니 목록 조회 요청 파라미터 인터페이스
 */
export interface FetchCartItemsParams {
  /** 조회 대상 사용자 고유 ID (필수) */
  userId: string;

  /** 백엔드 API 기본 URL (기본값: 'http://localhost:4000/api') */
  apiBaseUrl?: string;

  /** 1.5초 네트워크 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay?: boolean;

  /** 로딩 지연 시간(ms) 오버라이드 (기본값: 1500) */
  delayMs?: number;

  /** TanStack Query에서 전달하는 요청 취소용 AbortSignal */
  signal?: AbortSignal;
}

/**
 * @description POST /api/cart 장바구니 수량 추가 요청 파라미터 인터페이스
 */
export interface PostIncrementCartItemParams {
  /** 장바구니 소유 사용자 고유 ID */
  userId: string;

  /** 수량을 추가할 상품 고유 ID */
  productId: number;

  /** 추가할 수량 (기본값: 1, 1~99 정수) */
  quantity?: number;

  /** 요청을 발생시킨 상위 호스트 출처 */
  addedFromHost: HostOriginType;

  /** 백엔드 API 기본 URL 오버라이드 */
  apiBaseUrl?: string;

  /** 요청 취소용 AbortSignal */
  signal?: AbortSignal;
}

/**
 * @description DELETE /api/cart/:id 장바구니 단건·전체 삭제 요청 파라미터 인터페이스
 */
export interface DeleteCartItemParams {
  /** 삭제할 장바구니 항목 ID 또는 전체 비우기 키워드('all') */
  targetId: number | 'all';

  /** 장바구니 소유 사용자 고유 ID */
  userId: string;

  /** 백엔드 API 기본 URL 오버라이드 */
  apiBaseUrl?: string;

  /** 요청 취소용 AbortSignal */
  signal?: AbortSignal;
}

/**
 * AbortSignal과 연동되어 지정된 시간(ms)만큼 대기하는 비동기 지연 함수입니다 ([Study 08]).
 * 대기 도중 signal이 취소되면 타이머를 즉시 정리하고 AbortError로 거부합니다.
 *
 * @param ms - 대기할 밀리초(ms)
 * @param signal - 취소 감지용 AbortSignal (선택)
 * @returns 지연 완료 Promise
 */
export function delayWithSignal(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    // [분기 설명] 호출 시점에 이미 취소된 신호라면 타이머를 생성하지 않고 즉시 AbortError를 반환합니다.
    if (signal?.aborted) {
      reject(new DOMException('The operation was aborted.', 'AbortError'));
      return;
    }

    const timerId = setTimeout(() => {
      // [분기 설명] 정상 만료 시 signal 내부 리스너 목록에서 클로저를 해제해 메모리 누수를 방지합니다 (Study 08 Part 3 Q1).
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
 * 백엔드 GET /api/cart 엔드포인트를 호출해 특정 사용자의 장바구니 항목 목록을 조회하고 Zod 스키마로 검증합니다.
 *
 * @param params - 사용자 ID, 지연 시뮬레이션 및 AbortSignal 옵션
 * @returns 검증된 CartItemView 배열
 */
export async function fetchCartItems(params: FetchCartItemsParams): Promise<CartItemView[]> {
  const {
    userId,
    apiBaseUrl = DEFAULT_API_BASE_URL,
    simulateDelay = false,
    delayMs = DEFAULT_SIMULATE_DELAY_MS,
    signal,
  } = params;

  // [분기 설명] 1.5초 로딩 지연 시뮬레이션 토글이 켜진 경우 네트워크 요청 전 AbortSignal 연동 대기를 수행합니다.
  if (simulateDelay && delayMs > 0) {
    await delayWithSignal(delayMs, signal);
  }

  const client = createApiClient(apiBaseUrl);
  const responsePromise = client.get('cart', {
    searchParams: { userId },
    signal,
  });

  return unwrapApiResponse(responsePromise, cartItemListSchema);
}

/**
 * 백엔드 POST /api/cart 엔드포인트를 호출해 기존 장바구니 상품의 수량을 원자적으로 증가(UPSERT)시킵니다.
 *
 * @param params - 사용자 ID, 상품 ID, 추가 수량 및 호스트 출처 옵션
 * @returns 수량이 갱신된 CartItemView 객체
 */
export async function postIncrementCartItem(
  params: PostIncrementCartItemParams,
): Promise<CartItemView> {
  const {
    userId,
    productId,
    quantity = 1,
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

/**
 * 백엔드 DELETE /api/cart/:id 엔드포인트를 호출해 단건 장바구니 항목 또는 전체('all')를 삭제합니다.
 *
 * @param params - 삭제 대상 ID(또는 'all'), 사용자 ID 및 옵션
 * @returns 검증된 DeleteCartResult 객체
 */
export async function deleteCartItemApi(params: DeleteCartItemParams): Promise<DeleteCartResult> {
  const { targetId, userId, apiBaseUrl = DEFAULT_API_BASE_URL, signal } = params;

  const client = createApiClient(apiBaseUrl);
  const responsePromise = client.delete(`cart/${String(targetId)}`, {
    searchParams: { userId },
    signal,
  });

  return unwrapApiResponse(responsePromise, deleteCartResultSchema);
}
