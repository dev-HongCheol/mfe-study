/**
 * @file ProductCard.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description 개별 상품 정보, 카테고리·품절 배지, 원화 정수 포맷 가격 및 중복 클릭 방지(isPending) 장바구니 담기 버튼을 렌더링하는 카드 컴포넌트입니다 ([Study 05 #01, #04, #15, #16]).
 */
import { Badge, Button, Card, Flex, Heading, Stack } from 'remote_shared/ui';
import { formatCurrency } from 'remote_shared/utils';
import { CATEGORY_LABELS, type ProductEntity } from '../model/catalog-schema.js';

/**
 * @description ProductCard 컴포넌트 Props 인터페이스
 */
export interface ProductCardProps {
  /** 렌더링할 상품 도메인 엔티티 */
  product: ProductEntity;

  /** 현재 이 상품에 대한 장바구니 담기 요청이 진행 중인지 여부 (중복 클릭 잠금용) */
  isAdding: boolean;

  /** 장바구니 담기 버튼 클릭 시 호출되는 핸들러 */
  onAddToCart: (product: ProductEntity) => void;
}

/**
 * 단일 상품 카드를 렌더링하는 컴포넌트입니다.
 *
 * @param props - 상품 엔티티, 로딩 여부 및 장바구니 담기 핸들러
 * @returns 상품 카드 JSX 엘리먼트
 */
export function ProductCard({ product, isAdding, onAddToCart }: ProductCardProps) {
  /** 재고 소진(품절) 여부 */
  const isSoldOut = product.stock <= 0;

  /**
   * 장바구니 담기 버튼 클릭을 처리합니다.
   */
  const handleAddClick = () => {
    // [분기 설명] 품절 상태이거나 이미 요청이 진행 중일 때는 중복 요청을 원천 차단합니다 (Study 05 #01).
    if (isSoldOut || isAdding) {
      return;
    }
    onAddToCart(product);
  };

  return (
    <Card
      padding="md"
      elevated={true}
      className="prod-card"
      data-testid={`product-card-${product.id}`}
    >
      <Stack gap="sm" className="prod-card-header">
        <Flex justify="between" align="center" gap="xs" wrap="wrap">
          <Badge tone="neutral">{CATEGORY_LABELS[product.category]}</Badge>
          {isSoldOut ? (
            <Badge tone="danger">품절</Badge>
          ) : (
            <Badge tone="success" className="prod-stock-count">
              재고 {product.stock}개
            </Badge>
          )}
        </Flex>

        <Heading level={3} className="prod-card-title" title={product.name}>
          {product.name}
        </Heading>

        <p className="prod-card-desc">{product.description}</p>
      </Stack>

      <Stack gap="sm">
        <Flex justify="between" align="center" gap="sm">
          <span className="prod-price">{formatCurrency(product.price)}</span>
          <span className="prod-stock-count">ID #{product.id}</span>
        </Flex>

        <Button
          variant={isSoldOut ? 'secondary' : 'primary'}
          size="md"
          fullWidth={true}
          isLoading={isAdding}
          disabled={isSoldOut}
          onClick={handleAddClick}
        >
          {isSoldOut ? '품절된 상품' : isAdding ? '담는 중...' : '장바구니 담기'}
        </Button>
      </Stack>
    </Card>
  );
}
