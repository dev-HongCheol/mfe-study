/**
 * @file ProductCatalogView.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description 필터 바, 로딩 스켈레톤, 에러/빈 결과 복구 뷰 및 상품 카드 그리드를 조합하는 카탈로그 메인 뷰 컴포넌트입니다.
 */
import { useState } from 'react';
import { Badge, Button, Flex, Grid, Heading, Stack } from 'remote_shared/ui';
import {
  type CartUpdatedEventPayload,
  DEFAULT_API_BASE_URL,
  type HostOriginType,
  type SyncMode,
  normalizeError,
} from 'remote_shared/utils';
import { DEFAULT_SIMULATE_DELAY_MS } from '../api/catalog-api.js';
import {
  type ProductEntity,
  type ProductFilterValues,
  loadCatalogFilter,
  resetCatalogFilter,
  saveCatalogFilter,
} from '../model/catalog-schema.js';
import { useAddToCartMutation, useProductsQuery } from '../model/use-catalog-queries.js';
import { ProductCard } from './ProductCard.js';
import { ProductFilterBar } from './ProductFilterBar.js';
import { ProductGridSkeleton } from './ProductGridSkeleton.js';
import './catalog.css';

/**
 * @description ProductCatalogView 컴포넌트 Props 인터페이스
 */
export interface ProductCatalogViewProps {
  /** 현재 로그인된 사용자 고유 ID */
  userId: string;

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

  /** 상품 목록 조회 TanStack Query 훅 */
  const productsQuery = useProductsQuery({
    filter,
    apiBaseUrl,
    simulateDelay,
    delayMs,
  });

  /** 장바구니 담기 TanStack Query 뮤테이션 훅 */
  const addToCartMutation = useAddToCartMutation({
    userId,
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

  /** 장바구니 추가 실패 시 정규화된 에러 메시지 */
  const mutationError = addToCartMutation.error ? normalizeError(addToCartMutation.error) : null;

  /** 상품 목록 조회 실패 시 정규화된 에러 메시지 */
  const queryError = productsQuery.error ? normalizeError(productsQuery.error) : null;

  return (
    <section className="prod-catalog-root" aria-label="상품 카탈로그">
      <Stack gap="md">
        <Flex justify="between" align="center" gap="sm" wrap="wrap">
          <Flex align="center" gap="sm" wrap="wrap">
            <Heading level={2}>상품 카탈로그</Heading>
            <Badge tone="brand">Remote: 3002 (Vite)</Badge>
            <Badge tone={syncMode === 'mode-b-query' ? 'warning' : 'success'}>
              {syncMode === 'mode-b-query' ? 'Mode B: sharedQueryClient' : 'Mode A: CustomEvent'}
            </Badge>
          </Flex>
          <Badge tone="neutral">
            사용자: {userId} | 호스트: {hostType}
          </Badge>
        </Flex>

        <ProductFilterBar
          filter={filter}
          totalCount={products.length}
          onFilterChange={handleFilterChange}
          onReset={handleFilterReset}
        />

        {mutationError ? (
          <div role="alert" className="prod-alert-banner">
            장바구니 담기 실패 ({mutationError.code}): {mutationError.message}
          </div>
        ) : null}

        {lastAddedMessage && !mutationError ? (
          <output className="prod-feedback-banner">{lastAddedMessage}</output>
        ) : null}

        {/* [분기 설명 1] 초기 로딩 중일 때는 실제 카드 높이와 1:1 매칭된 6-카드 스켈레톤을 렌더링하여 CLS를 방지합니다. */}
        {productsQuery.isLoading ? (
          <ProductGridSkeleton count={6} />
        ) : queryError ? (
          /* [분기 설명 2] 백엔드 조회 에러 발생 시 전체 앱 크래시 대신 인라인 에러 안내와 [다시 시도] 복구 버튼을 제공합니다. */
          <div role="alert" className="prod-alert-banner">
            <Flex justify="between" align="center" gap="md" wrap="wrap">
              <span>
                상품 목록 조회 실패 ({queryError.code}): {queryError.message}
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void productsQuery.refetch();
                }}
              >
                다시 시도
              </Button>
            </Flex>
          </div>
        ) : products.length === 0 ? (
          /* [분기 설명 3] 필터링 결과가 0건일 때 빈 상태 안내와 즉시 초기화 버튼을 제공합니다. */
          <div className="prod-empty-state">
            <Stack gap="sm">
              <p>조건에 일치하는 상품이 없습니다.</p>
              <div>
                <Button variant="secondary" size="sm" onClick={handleFilterReset}>
                  전체 상품 다시 보기
                </Button>
              </div>
            </Stack>
          </div>
        ) : (
          /* [분기 설명 4] 정상 조회 완료 시 DB 고유 ID(product.id)를 key로 부여하여 3열 그리드를 렌더링합니다 (Study 05 #03). */
          <Grid columns={3} gap="md">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isAdding={addingProductId === product.id && addToCartMutation.isPending}
                onAddToCart={(target) => {
                  void handleAddToCart(target);
                }}
              />
            ))}
          </Grid>
        )}
      </Stack>
    </section>
  );
}
