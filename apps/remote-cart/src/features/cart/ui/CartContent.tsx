/**
 * @file CartContent.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description 장바구니 본문의 5가지 상태(비로그인 안내 · 로딩 스켈레톤 · 조회 에러 · 빈 장바구니 · 항목 목록+요약 카드)를 Early Return 패턴으로 분기 렌더링하는 컴포넌트입니다.
 */
import { Stack } from 'remote_shared/ui';
import { type CartErrorReport, type CartItemView, calculateCartTotals } from '../model/cart-schema';
import { CartErrorBanner } from './CartErrorBanner';
import { CartItemRow } from './CartItemRow';
import { CartSkeleton } from './CartSkeleton';
import { CartSummaryCard } from './CartSummaryCard';

/**
 * @description CartContent 컴포넌트 Props 인터페이스
 */
export interface CartContentProps {
  /** 현재 로그인(유효 userId 존재) 여부 */
  isAuthenticated: boolean;

  /** 장바구니 목록 초기 로딩 중 여부 */
  isLoading: boolean;

  /** 목록 조회 실패 시 생성된 에러 리포트 (정상 시 null) */
  errorReport: CartErrorReport | null;

  /** 조회 완료된 장바구니 항목 배열 */
  items: CartItemView[];

  /** 현재 수량 증가 또는 삭제 요청이 진행 중인 항목 ID (없으면 null) */
  mutatingItemId: number | null;

  /** 전체 비우기 요청이 진행 중인지 여부 */
  isClearing: boolean;

  /** 조회 에러 복구용 [다시 시도] 핸들러 */
  onRetry: () => void;

  /** 단건 [+1] 수량 증가 핸들러 */
  onIncrement: (item: CartItemView) => void;

  /** 단건 [삭제] 핸들러 */
  onDelete: (item: CartItemView) => void;

  /** [장바구니 비우기] 핸들러 */
  onClearAll: () => void;
}

/**
 * 장바구니 5대 상태를 Early Return 패턴으로 상호 배타적으로 렌더링하는 본문 컴포넌트입니다.
 *
 * @param props - 인증 상태, 로딩, 에러 리포트, 항목 배열 및 액션 콜백
 * @returns 장바구니 본문 JSX 엘리먼트
 */
export function CartContent({
  isAuthenticated,
  isLoading,
  errorReport,
  items,
  mutatingItemId,
  isClearing,
  onRetry,
  onIncrement,
  onDelete,
  onClearAll,
}: CartContentProps) {
  // [분기 설명 1] 비로그인 상태에서는 임의 유저 데이터를 조회하지 않고 로그인 안내 UI만 렌더링합니다 (SSOT § 5.4.3).
  if (!isAuthenticated) {
    return (
      <div className="cart-state-card">
        <p className="cart-state-title">로그인 후 장바구니를 확인할 수 있습니다.</p>
        <p className="cart-state-desc">
          상단 호스트(또는 단독 실행 컨트롤 바)에서 테스트 사용자를 선택해 로그인해 주세요.
        </p>
      </div>
    );
  }

  // [분기 설명 2] 초기 조회 또는 1.5초 지연 시뮬레이션 진행 중에는 CLS 방지용 스켈레톤을 렌더링합니다.
  if (isLoading) {
    return <CartSkeleton rowCount={2} />;
  }

  // [분기 설명 3] 조회 실패 시 인라인 에러 배너와 [다시 시도] 버튼을 제공합니다.
  if (errorReport) {
    return <CartErrorBanner report={errorReport} onRetry={onRetry} />;
  }

  // [분기 설명 4] 장바구니가 비어 있는 경우 빈 상태 안내 UI를 렌더링합니다.
  if (items.length === 0) {
    return (
      <div className="cart-state-card">
        <p className="cart-state-title">장바구니가 비어 있습니다.</p>
        <p className="cart-state-desc">
          상품 카탈로그에서 마음에 드는 상품을 담아 실시간 동기화 동작을 확인해 보세요.
        </p>
      </div>
    );
  }

  /** [Study 05 #03] useState/useEffect 없이 렌더링 본문에서 즉시 산출하는 파생 합계 */
  const totals = calculateCartTotals(items);

  return (
    <Stack gap="md">
      <div className="cart-items-list">
        {items.map((item) => (
          <CartItemRow
            key={item.id}
            item={item}
            isMutating={isClearing || mutatingItemId === item.id}
            onIncrement={onIncrement}
            onDelete={onDelete}
          />
        ))}
      </div>

      <CartSummaryCard totals={totals} isClearing={isClearing} onClearAll={onClearAll} />
    </Stack>
  );
}
