/**
 * @file query-client.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./utils)
 * @description Mode B(싱글톤 캐시 공유)용 sharedQueryClient 인스턴스, Mode A용 팩토리 및 표준 쿼리 키 상수입니다.
 */
import { QueryClient } from '@tanstack/react-query';

/** 장바구니 마이크로 앱과 상품 마이크로 앱이 공통으로 참조하는 표준 쿼리 키 상수 (루트 SSOT § 5.3.3) */
export const CART_QUERY_KEY = ['cart'] as const;

/** 상품 목록 조회에 사용되는 표준 쿼리 키 상수 */
export const PRODUCTS_QUERY_KEY = ['products'] as const;

/**
 * MFE 환경에 최적화된 기본 옵션(불필요한 창 포커스 재조회 비활성화 등)으로 새 QueryClient를 생성합니다.
 * Mode A에서는 각 마이크로 앱이 이 함수를 호출해 독립적인 자체 QueryClient를 생성합니다.
 *
 * @returns 새 QueryClient 인스턴스
 */
export function createMfeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

/**
 * Mode B(싱글톤 공유 아키텍처)에서 모든 호스트와 리모트 앱이 동일한 메모리 캐시를 공유하는 싱글톤 QueryClient 인스턴스입니다.
 */
export const sharedQueryClient: QueryClient = createMfeQueryClient();
