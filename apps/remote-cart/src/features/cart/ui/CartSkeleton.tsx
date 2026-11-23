/**
 * @file CartSkeleton.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description 1.5초 지연 로딩 시 실제 CartItemRow 높이(92px)와 1:1 매칭되어 화면 덜컥거림(CLS)을 방지하는 스켈레톤 컴포넌트입니다 ([Study 05 #13]).
 */
import { Skeleton, Stack } from 'remote_shared/ui';

/**
 * @description CartSkeleton 컴포넌트 Props 인터페이스
 */
export interface CartSkeletonProps {
  /** 표시할 스켈레톤 항목 행 개수 (기본값: 2) */
  rowCount?: number;
}

/**
 * 장바구니 목록 로딩 중 표시하는 CLS 방지용 스켈레톤 컴포넌트입니다.
 *
 * @param props - 행 개수 옵션
 * @returns 스켈레톤 목록 JSX 엘리먼트
 */
export function CartSkeleton({ rowCount = 2 }: CartSkeletonProps) {
  const rows = Array.from({ length: Math.max(1, rowCount) }, (_, idx) => idx);

  return (
    <Stack gap="sm" data-testid="cart-skeleton" aria-busy="true" aria-label="장바구니 불러오는 중">
      {rows.map((idx) => (
        <div key={idx} className="cart-skeleton-row">
          <Stack gap="xs">
            <Skeleton variant="text" width="55%" height={18} />
            <Skeleton variant="text" width="38%" height={14} />
          </Stack>
        </div>
      ))}
    </Stack>
  );
}
