/**
 * @file ProductCatalogContent.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description 카탈로그 본문의 4가지 상태(초기 로딩 스켈레톤 / 조회 에러 복구 / 빈 결과 안내 / 3열 상품 카드 그리드)를 Early Return 패턴으로 분기 렌더링하는 컴포넌트입니다 ([Study 04 #13, Study 05 #03, #13]).
 */
import { Button, Grid, Stack } from 'remote_shared/ui';
import type { CatalogErrorReport, ProductEntity } from '../model/catalog-schema';
import { CatalogErrorBanner } from './CatalogErrorBanner';
import { ProductCard } from './ProductCard';
import { ProductGridSkeleton } from './ProductGridSkeleton';

/**
 * @description ProductCatalogContent 컴포넌트 Props 인터페이스
 */
export interface ProductCatalogContentProps {
  /** 상품 목록 초기 조회 로딩 진행 여부 */
  isLoading: boolean;

  /** 상품 목록 조회 실패 시 생성된 에러 리포트 (정상 시 null) */
  queryError: CatalogErrorReport | null;

  /** 화면에 렌더링할 상품 엔티티 목록 */
  products: ProductEntity[];

  /** 현재 장바구니 담기 요청이 진행 중인 상품 ID (개별 카드 중복 클릭 잠금용) */
  addingProductId: number | null;

  /** 장바구니 담기 뮤테이션 전체 진행 여부 */
  isMutationPending: boolean;

  /** 현재 사용자의 로그인(인증) 여부 (비로그인 시 담기 버튼 비활성화) */
  isAuthenticated: boolean;

  /** 조회 에러 상태에서 [다시 시도] 버튼 클릭 시 호출되는 재조회 핸들러 */
  onRetry: () => void;

  /** 빈 검색 결과 상태에서 [전체 상품 다시 보기] 버튼 클릭 시 호출되는 필터 초기화 핸들러 */
  onResetFilter: () => void;

  /** 개별 상품 카드에서 [장바구니 담기] 클릭 시 호출되는 핸들러 */
  onAddToCart: (product: ProductEntity) => void;
}

/**
 * 카탈로그 본문 영역을 상태 우선순위(로딩 -> 에러 -> 빈 결과 -> 상품 그리드)에 따라 렌더링하는 컴포넌트입니다.
 *
 * @param props - 조회 상태, 상품 배열, 인증 상태 및 액션 핸들러
 * @returns 상태별 카탈로그 본문 JSX 엘리먼트
 */
export function ProductCatalogContent({
  isLoading,
  queryError,
  products,
  addingProductId,
  isMutationPending,
  isAuthenticated,
  onRetry,
  onResetFilter,
  onAddToCart,
}: ProductCatalogContentProps) {
  // [분기 설명 1] 초기 로딩 중일 때는 실제 카드 높이와 1:1 매칭된 6-카드 스켈레톤을 렌더링하여 레이아웃 밀림(CLS)을 방지합니다 (Study 05 #13).
  if (isLoading) {
    return <ProductGridSkeleton count={6} />;
  }

  // [분기 설명 2] 백엔드 조회 에러 발생 시 전체 앱 크래시 대신 인라인 에러 배너와 [다시 시도] 복구 버튼을 제공합니다 (Study 04 #13).
  if (queryError) {
    return (
      <CatalogErrorBanner titlePrefix="상품 목록 조회 실패" report={queryError} onRetry={onRetry} />
    );
  }

  // [분기 설명 3] 필터링 결과가 0건일 때 사용자가 막다른 화면에 갇히지 않도록 빈 상태 안내와 즉시 초기화 버튼을 제공합니다.
  if (products.length === 0) {
    return (
      <div className="prod-empty-state">
        <Stack gap="sm">
          <p>조건에 일치하는 상품이 없습니다.</p>
          <div>
            <Button variant="secondary" size="sm" onClick={onResetFilter}>
              전체 상품 다시 보기
            </Button>
          </div>
        </Stack>
      </div>
    );
  }

  // [분기 설명 4] 정상 조회 완료 시 배열 인덱스가 아닌 DB 고유 ID(product.id)를 key로 부여하여 3열 그리드를 렌더링합니다 (Study 05 #03).
  return (
    <Grid columns={3} gap="md">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          isAdding={addingProductId === product.id && isMutationPending}
          isAuthenticated={isAuthenticated}
          onAddToCart={onAddToCart}
        />
      ))}
    </Grid>
  );
}
