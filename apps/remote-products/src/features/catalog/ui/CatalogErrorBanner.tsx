/**
 * @file CatalogErrorBanner.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description 장바구니 담기 실패 및 상품 목록 조회 실패 시 공통으로 사용되는 인라인 에러 배너와 DEV 스키마 불일치 진단 블록을 렌더링하는 컴포넌트입니다 ([Study 04 #13, Study 05 #10]).
 */
import { Button, Flex } from 'remote_shared/ui';
import type { CatalogErrorReport } from '../model/catalog-schema';

/**
 * @description CatalogErrorBanner 컴포넌트 Props 인터페이스
 */
export interface CatalogErrorBannerProps {
  /** 에러 발생 맥락을 나타내는 제목 접두어 (예: '장바구니 담기 실패', '상품 목록 조회 실패') */
  titlePrefix: string;

  /** 환경별(DEV vs PROD)로 이원화된 에러 리포트 객체 */
  report: CatalogErrorReport;

  /** 재시도가 가능한 에러(예: 목록 조회 실패)일 때 [다시 시도] 버튼 클릭 시 호출할 선택적 콜백 */
  onRetry?: () => void;
}

/**
 * 인라인 에러 안내, 선택적 [다시 시도] 복구 버튼 및 개발 환경(DEV) 전용 스키마 불일치 좌표를 표시하는 공통 에러 배너 컴포넌트입니다.
 *
 * @param props - 제목 접두어, 에러 리포트 및 선택적 재시도 핸들러
 * @returns role="alert" 에러 배너 JSX 엘리먼트
 */
export function CatalogErrorBanner({ titlePrefix, report, onRetry }: CatalogErrorBannerProps) {
  /** 화면에 표시할 정제된 에러 요약 문구 */
  const summaryText = `${titlePrefix} (${report.code}): ${report.userMessage}`;

  return (
    <div role="alert" className="prod-alert-banner">
      {/* [분기 설명] 목록 조회 에러처럼 즉시 재시도가 필요한 경우에만 우측에 [다시 시도] 복구 버튼을 함께 배치합니다 (Study 04 #13). */}
      {onRetry ? (
        <Flex justify="between" align="center" gap="md" wrap="wrap">
          <span>{summaryText}</span>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            다시 시도
          </Button>
        </Flex>
      ) : (
        <div>{summaryText}</div>
      )}

      {/* [분기 설명] 개발 환경(DEV)에서 Zod 스키마 불일치가 감지된 경우에만 실패 필드 좌표를 노출하고, 운영 환경(PROD)에서는 내부 구조를 숨깁니다 (Study 05 #10). */}
      {report.devDetails.length > 0 ? (
        <div className="prod-alert-dev-details" data-testid="dev-error-details">
          <strong>[DEV 상세 진단 - 스키마 불일치 필드]</strong>
          {report.devDetails.map((issue) => (
            <div key={`${issue.path}-${issue.code}`} className="prod-alert-dev-item">
              • {issue.path} ({issue.code}): {issue.message}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
