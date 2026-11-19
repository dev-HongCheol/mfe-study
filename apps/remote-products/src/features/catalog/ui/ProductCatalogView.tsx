/**
 * @file ProductCatalogView.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description 필터 바, 로딩 스켈레톤, 에러/빈 결과 복구 뷰 및 상품 카드 그리드를 조합하는 카탈로그 메인 뷰 컴포넌트입니다.
 */
import { useEffect, useMemo, useState } from 'react';
import { Badge, Flex, Heading, Stack } from 'remote_shared/ui';
import {
  type CartUpdatedEventPayload,
  DEFAULT_API_BASE_URL,
  type HostOriginType,
  type SyncMode,
  normalizeError,
} from 'remote_shared/utils';
import { DEFAULT_SIMULATE_DELAY_MS } from '../api/catalog-api';
import {
  type ProductEntity,
  type ProductFilterValues,
  formatCatalogErrorReport,
  loadCatalogFilter,
  normalizeUserId,
  resetCatalogFilter,
  saveCatalogFilter,
} from '../model/catalog-schema';
import { useAddToCartMutation, useProductsQuery } from '../model/use-catalog-queries';
import { CatalogErrorBanner } from './CatalogErrorBanner';
import { ProductCatalogContent } from './ProductCatalogContent';
import { ProductFilterBar } from './ProductFilterBar';
import './catalog.css';

/**
 * @description ProductCatalogView 컴포넌트 Props 인터페이스
 */
export interface ProductCatalogViewProps {
  /** 현재 로그인된 사용자 고유 ID (null이면 비로그인 읽기 전용 상태) */
  userId: string | null;

  /** 상위 호스트 출처 ('vite' | 'rspack' | 'standalone') */
  hostType: HostOriginType;

  /** 상태 동기화 비교 모드 ('mode-a-event' | 'mode-b-query') */
  syncMode: SyncMode;

  /** 1.5초 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay: boolean;

  /** 로딩 지연 시간(ms) 오버라이드 */
  delayMs?: number;

  /** 백엔드 API 기본 URL */
  apiBaseUrl?: string;

  /** 장바구니 담기 완료 시 상위 호스트에 알리는 콜백 */
  onCartAdded?: (payload: CartUpdatedEventPayload) => void;
}

/**
 * 상품 목록 조회 및 장바구니 담기 플로우를 통합 렌더링하는 뷰 컴포넌트입니다.
 *
 * @param props - 정규화된 카탈로그 설정 Props
 * @returns 상품 카탈로그 전체 뷰 JSX 엘리먼트
 */
export function ProductCatalogView({
  userId,
  hostType,
  syncMode,
  simulateDelay,
  delayMs = DEFAULT_SIMULATE_DELAY_MS,
  apiBaseUrl = DEFAULT_API_BASE_URL,
  onCartAdded,
}: ProductCatalogViewProps) {
  /** 로컬 스토리지(mfe:products:catalog-filter)에서 복원한 현재 필터 상태 */
  const [filter, setFilter] = useState<ProductFilterValues>(() => loadCatalogFilter());

  /** 현재 장바구니 담기 요청이 진행 중인 상품 ID (개별 카드 로딩 잠금용) */
  const [addingProductId, setAddingProductId] = useState<number | null>(null);

  /** 최근 장바구니 담기 성공 피드백 메시지 상태 */
  const [lastAddedMessage, setLastAddedMessage] = useState<string | null>(null);

  /** 공백·빈 문자열을 null로 정규화한 현재 로그인 사용자 ID */
  const normalizedUserId = normalizeUserId(userId);

  /** 장바구니 담기 등 인증이 필요한 쓰기 작업 허용 여부 */
  const isAuthenticated = normalizedUserId !== null;

  /** 상품 목록 조회 TanStack Query 훅 */
  const productsQuery = useProductsQuery({
    filter,
    apiBaseUrl,
    simulateDelay,
    delayMs,
  });

  /** 장바구니 담기 TanStack Query 뮤테이션 훅 */
  const addToCartMutation = useAddToCartMutation({
    userId: normalizedUserId,
    hostType,
    syncMode,
    apiBaseUrl,
    onCartAdded: (payload) => {
      const modeLabel =
        syncMode === 'mode-b-query'
          ? 'Mode B (sharedQueryClient.invalidateQueries)'
          : 'Mode A (CustomEvent mfe:cart-updated)';
      setLastAddedMessage(`[${modeLabel}] "${payload.productName}" 1개를 장바구니에 담았습니다.`);
      onCartAdded?.(payload);
    },
  });

  /**
   * 필터 변경 시 상태와 스코프 로컬 스토리지를 동시에 업데이트합니다.
   *
   * @param nextFilter - 새로 선택된 카테고리 및 검색어 필터
   */
  const handleFilterChange = (nextFilter: ProductFilterValues) => {
    setFilter(nextFilter);
    saveCatalogFilter(nextFilter);
  };

  /**
   * 필터 초기화 버튼 클릭 시 스토리지와 필터 상태를 기본값으로 되돌립니다.
   */
  const handleFilterReset = () => {
    const defaultFilter = resetCatalogFilter();
    setFilter(defaultFilter);
  };

  /**
   * 개별 상품 카드에서 [장바구니 담기] 클릭 시 뮤테이션을 실행합니다.
   *
   * @param product - 장바구니에 추가할 상품 엔티티
   */
  const handleAddToCart = async (product: ProductEntity) => {
    // [분기 설명] 비로그인(미인증) 상태에서는 UI 우회 호출 시에도 장바구니 추가 API 요청을 차단합니다 (SSOT § 5.4.2).
    if (!normalizedUserId) {
      return;
    }
    setLastAddedMessage(null);
    setAddingProductId(product.id);
    try {
      await addToCartMutation.mutateAsync({ product, quantity: 1 });
    } catch {
      // 에러 상태는 addToCartMutation.error를 통해 인라인 배너로 표시됩니다.
    } finally {
      setAddingProductId(null);
    }
  };

  /** 조회된 상품 배열 (로딩 중이거나 에러 시 빈 배열 폴백) */
  const products = productsQuery.data ?? [];

  /** 장바구니 추가 실패 시 환경별(DEV vs PROD)로 이원화된 에러 리포트 (원본 에러 변경 시에만 재생성) */
  const mutationError = useMemo(
    () =>
      addToCartMutation.error
        ? formatCatalogErrorReport(normalizeError(addToCartMutation.error))
        : null,
    [addToCartMutation.error],
  );

  /** 상품 목록 조회 실패 시 환경별(DEV vs PROD)로 이원화된 에러 리포트 (원본 에러 변경 시에만 재생성) */
  const queryError = useMemo(
    () =>
      productsQuery.error ? formatCatalogErrorReport(normalizeError(productsQuery.error)) : null,
    [productsQuery.error],
  );

  // [분기 설명] 개발 환경(DEV)에서 상품 목록 조회 에러 발생 시 F12 콘솔에 상세 진단을 1회만 출력합니다 (Study 05 #10).
  useEffect(() => {
    if (!import.meta.env.DEV || import.meta.env.MODE === 'test' || !queryError) {
      return;
    }
    console.error('[remote-products] 상품 목록 조회 에러 상세 진단:', {
      code: queryError.code,
      message: queryError.userMessage,
      schemaIssues: queryError.devDetails,
      rawError: productsQuery.error,
    });
  }, [productsQuery.error, queryError]);

  // [분기 설명] 개발 환경(DEV)에서 장바구니 담기 에러 발생 시 F12 콘솔에 상세 진단을 1회만 출력합니다 (Study 05 #10).
  useEffect(() => {
    if (!import.meta.env.DEV || import.meta.env.MODE === 'test' || !mutationError) {
      return;
    }
    console.error('[remote-products] 장바구니 담기 에러 상세 진단:', {
      code: mutationError.code,
      message: mutationError.userMessage,
      schemaIssues: mutationError.devDetails,
      rawError: addToCartMutation.error,
    });
  }, [addToCartMutation.error, mutationError]);

  return (
    <section className="prod-catalog-root" aria-label="상품 카탈로그">
      <Stack gap="md">
        <Flex justify="between" align="center" gap="sm" wrap="wrap">
          <Flex align="center" gap="sm" wrap="wrap">
            <Heading level={2} className="prod-catalog-title">
              상품 카탈로그
            </Heading>
            <Badge tone="brand">Remote: 3002 (Vite)</Badge>
            <Badge tone={syncMode === 'mode-b-query' ? 'warning' : 'success'}>
              {syncMode === 'mode-b-query' ? 'Mode B: sharedQueryClient' : 'Mode A: CustomEvent'}
            </Badge>
          </Flex>
          <Badge tone={isAuthenticated ? 'neutral' : 'warning'}>
            사용자: {normalizedUserId ?? '비로그인 (읽기 전용)'} | 호스트: {hostType}
          </Badge>
        </Flex>

        <ProductFilterBar
          filter={filter}
          totalCount={products.length}
          onFilterChange={handleFilterChange}
          onReset={handleFilterReset}
        />

        {mutationError ? (
          <CatalogErrorBanner titlePrefix="장바구니 담기 실패" report={mutationError} />
        ) : null}

        {lastAddedMessage && !mutationError ? (
          <output className="prod-feedback-banner">{lastAddedMessage}</output>
        ) : null}

        <ProductCatalogContent
          isLoading={productsQuery.isLoading}
          queryError={queryError}
          products={products}
          addingProductId={addingProductId}
          isMutationPending={addToCartMutation.isPending}
          isAuthenticated={isAuthenticated}
          onRetry={() => {
            void productsQuery.refetch();
          }}
          onResetFilter={handleFilterReset}
          onAddToCart={(target) => {
            void handleAddToCart(target);
          }}
        />
      </Stack>
    </section>
  );
}
