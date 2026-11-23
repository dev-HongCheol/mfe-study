/**
 * @file CartSummaryCard.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description 장바구니 파생 합계(총 품목 수 · 총 수량 · 원화 총액)와 [장바구니 비우기] 액션을 렌더링하는 요약 카드 컴포넌트입니다 ([Study 05 #03, #04, #16]).
 */
import { Button, Card, Flex } from 'remote_shared/ui';
import { formatCurrency } from 'remote_shared/utils';
import type { CartTotalsSummary } from '../model/cart-schema';

/**
 * @description CartSummaryCard 컴포넌트 Props 인터페이스
 */
export interface CartSummaryCardProps {
  /** 렌더링 본문에서 계산된 장바구니 합계 요약 */
  totals: CartTotalsSummary;

  /** 전체 비우기 뮤테이션 진행 여부 */
  isClearing: boolean;

  /** [장바구니 비우기] 클릭 핸들러 */
  onClearAll: () => void;
}

/**
 * 장바구니 총 품목 수·총 수량·총 결제 예정 금액 및 전체 비우기 버튼을 표시하는 컴포넌트입니다.
 *
 * @param props - 합계 요약, 비우기 로딩 상태 및 비우기 콜백
 * @returns 요약 카드 JSX 엘리먼트
 */
export function CartSummaryCard({ totals, isClearing, onClearAll }: CartSummaryCardProps) {
  /** 비어 있거나 비우기 요청 진행 중이면 버튼 비활성화 */
  const isClearDisabled = totals.itemCount === 0 || isClearing;

  return (
    <Card padding="md" elevated={true} className="cart-summary-card">
      <Flex justify="between" align="center" gap="md" wrap="wrap">
        <div>
          <div className="cart-summary-meta">
            총 {totals.itemCount}종 · 수량 {totals.totalQuantity}개
          </div>
          <div className="cart-summary-total">{formatCurrency(totals.totalPrice)}</div>
        </div>

        <Button
          variant="danger"
          size="md"
          isLoading={isClearing}
          disabled={isClearDisabled}
          onClick={onClearAll}
        >
          {isClearing ? '비우는 중...' : '장바구니 비우기'}
        </Button>
      </Flex>
    </Card>
  );
}
