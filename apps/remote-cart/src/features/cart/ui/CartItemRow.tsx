/**
 * @file CartItemRow.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description 단일 장바구니 항목의 상품명, 출처 배지, 단가·소계(tabular-nums), 담은 시각(formatDate) 및 중복 클릭 방지 [+1]/[삭제] 버튼을 렌더링하는 컴포넌트입니다 ([Study 05 #01, #04, #15, #16]).
 */
import { Badge, Button, Card, Flex } from 'remote_shared/ui';
import { formatCurrency, formatDate } from 'remote_shared/utils';
import { CART_CATEGORY_LABELS, type CartItemView, HOST_ORIGIN_LABELS } from '../model/cart-schema';

/**
 * @description CartItemRow 컴포넌트 Props 인터페이스
 */
export interface CartItemRowProps {
  /** 렌더링할 장바구니 항목 데이터 */
  item: CartItemView;

  /** 이 항목에 대해 수량 추가 또는 삭제 요청이 진행 중인지 여부 */
  isMutating: boolean;

  /** [+1] 수량 증가 버튼 클릭 핸들러 */
  onIncrement: (item: CartItemView) => void;

  /** [삭제] 버튼 클릭 핸들러 */
  onDelete: (item: CartItemView) => void;
}

/**
 * 개별 장바구니 항목을 카드 행 형태로 렌더링하는 컴포넌트입니다.
 *
 * @param props - 장바구니 항목 데이터, 변경 진행 여부 및 액션 콜백
 * @returns 장바구니 항목 카드 JSX 엘리먼트
 */
export function CartItemRow({ item, isMutating, onIncrement, onDelete }: CartItemRowProps) {
  /** 해당 항목의 정수 소계 금액 (단가 × 수량) */
  const lineTotal = Math.round(item.price) * Math.round(item.quantity);

  return (
    <Card padding="md" className="cart-item-row">
      <Flex justify="between" align="center" gap="md" wrap="wrap">
        <div className="cart-item-main">
          <Flex align="center" gap="xs" wrap="wrap">
            <p className="cart-item-title" title={item.productName}>
              {item.productName}
            </p>
            <Badge tone="neutral">{CART_CATEGORY_LABELS[item.category]}</Badge>
            <Badge tone={item.addedFromHost === 'rspack' ? 'brand' : 'success'}>
              {HOST_ORIGIN_LABELS[item.addedFromHost]}
            </Badge>
          </Flex>
          <Flex align="center" gap="sm" wrap="wrap" className="cart-item-meta">
            <span className="cart-item-unit-price">
              단가 {formatCurrency(item.price)} × {item.quantity}개
            </span>
            <span>담은 시각: {formatDate(item.createdAt)}</span>
          </Flex>
        </div>

        <Flex align="center" gap="sm" wrap="wrap">
          <span className="cart-item-price">{formatCurrency(lineTotal)}</span>
          <Button
            variant="secondary"
            size="sm"
            isLoading={isMutating}
            disabled={isMutating}
            aria-label={`${item.productName} 수량 +1`}
            onClick={() => onIncrement(item)}
          >
            +1
          </Button>
          <Button
            variant="danger"
            size="sm"
            disabled={isMutating}
            aria-label={`${item.productName} 삭제`}
            onClick={() => onDelete(item)}
          >
            삭제
          </Button>
        </Flex>
      </Flex>
    </Card>
  );
}
