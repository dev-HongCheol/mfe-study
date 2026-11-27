/**
 * @file RemoteErrorBoundary.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description react-error-boundary 기반으로 원격 리모트 앱의 로딩 실패 또는 런타임 예외를 해당 영역으로만 격리하고 [다시 시도]로 복구하는 함수형 ErrorBoundary입니다. remote_shared/ui 장애 시에도 동작하도록 CSS Modules 기반 자체 폴백 UI만 사용합니다 ([Study 04 #14, Study 14 § 4.2]).
 */
import { type ErrorInfo, type ReactNode, useCallback } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import styles from './RemoteErrorBoundary.module.css';

/**
 * @description RemoteErrorBoundary 컴포넌트 Props 인터페이스
 */
export interface RemoteErrorBoundaryProps {
  /** 장애 발생 시 안내 문구에 표시할 리모트 한글 이름 (예: '장바구니 리모트') */
  remoteLabel: string;

  /** 장애 발생 시 표시할 리모트 포트 번호 (예: 3003) */
  remotePort: number;

  /** 사용자가 [다시 시도] 버튼을 눌렀을 때 슬롯 리마운트 등을 수행하는 선택적 콜백 */
  onRetry?: () => void;

  /** 장애 격리 경계 내부에 렌더링할 원격 컴포넌트 트리 */
  children: ReactNode;
}

/** 예외 메시지가 비어 있거나 Error 인스턴스가 아닐 때 표시할 기본 안내 문구 */
const DEFAULT_REMOTE_ERROR_MESSAGE =
  '원격 마이크로 앱을 불러오는 중 알 수 없는 오류가 발생했습니다.';

/**
 * 포착된 예외 객체에서 폴백 UI에 안전하게 표시할 요약 메시지를 추출합니다.
 *
 * @param error - ErrorBoundary가 포착한 예외 객체
 * @returns 사용자·개발자 안내용 에러 메시지 문자열
 */
function extractRemoteErrorMessage(error: unknown): string {
  // [분기 설명] Error 인스턴스에 유효한 메시지가 있을 때만 그대로 사용하고, 그 외 비표준 예외는 기본 안내 문구로 치환합니다.
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return DEFAULT_REMOTE_ERROR_MESSAGE;
}

/**
 * 개별 원격 마이크로 앱의 장애가 전체 호스트 대시보드로 전파되지 않도록 격리하는 함수형 ErrorBoundary 래퍼 컴포넌트입니다.
 *
 * @param props - 리모트 식별 정보, 복구 콜백 및 보호 대상 자식 트리
 * @returns react-error-boundary로 감싼 장애 격리 경계 엘리먼트
 */
export function RemoteErrorBoundary({
  remoteLabel,
  remotePort,
  onRetry,
  children,
}: RemoteErrorBoundaryProps) {
  /** 포착된 원격 장애 출처와 컴포넌트 스택을 콘솔에 기록합니다. */
  const handleError = useCallback(
    (error: unknown, errorInfo: ErrorInfo): void => {
      console.error(
        `[host-vite][RemoteErrorBoundary] ${remoteLabel}(:${remotePort}) 장애 격리:`,
        error,
        errorInfo.componentStack,
      );
    },
    [remoteLabel, remotePort],
  );

  /** 에러 경계가 리셋될 때 상위 슬롯의 리마운트 복구 콜백을 호출합니다. */
  const handleReset = useCallback((): void => {
    onRetry?.();
  }, [onRetry]);

  /** 원격 장애 시 remote_shared/ui에 의존하지 않는 CSS Modules 기반 폴백 UI를 렌더링합니다. */
  const renderFallback = useCallback(
    ({ error, resetErrorBoundary }: FallbackProps): ReactNode => (
      <section role="alert" className={styles.container}>
        <h3 className={styles.title}>
          {remoteLabel} (Port {remotePort}) 연결이 일시적으로 중단되었습니다
        </h3>
        <p className={styles.description}>
          MFE 장애 격리 경계(RemoteErrorBoundary)가 오류 전파를 차단했습니다. 나머지 영역은
          정상적으로 계속 사용할 수 있습니다.
        </p>
        <p className={styles.errorBox}>{extractRemoteErrorMessage(error)}</p>
        <button type="button" className={styles.retryButton} onClick={() => resetErrorBoundary()}>
          다시 시도
        </button>
      </section>
    ),
    [remoteLabel, remotePort],
  );

  return (
    <ErrorBoundary fallbackRender={renderFallback} onError={handleError} onReset={handleReset}>
      {children}
    </ErrorBoundary>
  );
}
