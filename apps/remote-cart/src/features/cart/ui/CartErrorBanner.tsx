/**
 * @file CartErrorBanner.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description 장바구니 조회·수정·삭제 실패 시 공통 사용하는 role="alert" 인라인 에러 배너 및 DEV 전용 스키마 진단 블록 컴포넌트입니다 ([Study 05 #10]).
 */
import { Button, Flex } from 'remote_shared/ui';
import type { CartErrorReport } from '../model/cart-schema';

/**
 * @description CartErrorBanner 컴포넌트 Props 인터페이스
 */
export interface CartErrorBannerProps {
  /** DEV/PROD 환경별로 이원화된 장바구니 에러 리포트 */
  report: CartErrorReport;

  /** 선택적 [다시 시도] 복구 버튼 콜백 (조회 에러 등 복구 가능한 경우 전달) */
  onRetry?: () => void;
}

/**
 * 장바구니 에러 메시지와 개발 환경(DEV) 스키마 불일치 진단 좌표를 표시하는 배너 컴포넌트입니다.
 *
 * @param props - 에러 리포트 및 재시도 콜백
 * @returns 인라인 에러 배너 JSX 엘리먼트
 */
export function CartErrorBanner({ report, onRetry }: CartErrorBannerProps) {
  return (
    <div role="alert" className="cart-error-banner">
      <Flex justify="between" align="center" gap="sm" wrap="wrap">
        <p className="cart-error-title">
          [{report.code}] {report.userMessage}
        </p>
        {onRetry ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        ) : null}
      </Flex>

      {/* [분기 설명] DEV 환경에서만 생성된 스키마 불일치 좌표를 표시하며 PROD에서는 빈 배열이므로 노출되지 않습니다 (Study 05 #10). */}
      {report.devDetails.length > 0 ? (
        <div className="cart-dev-diagnostics">
          <strong>[DEV 상세 진단 — 스키마 불일치 필드]</strong>
          <ul className="cart-dev-issue-list">
            {report.devDetails.map((detail, idx) => (
              <li key={`${detail.path}-${idx}`}>
                <code className="cart-dev-code">{detail.path}</code> ({detail.code}):{' '}
                {detail.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
