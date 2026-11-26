/**
 * @file RemoteErrorBoundary.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description 원격 리모트 앱의 로딩 실패 또는 런타임 예외를 해당 영역으로만 격리하고 [다시 시도]로 복구하는 순수 React ErrorBoundary입니다. remote_shared/ui 장애 시에도 동작하도록 외부 UI 모듈에 의존하지 않습니다 ([Study 04 #14, Study 14 § 4.2]).
 */
import { type CSSProperties, Component, type ErrorInfo, type ReactNode } from 'react';

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

/**
 * @description RemoteErrorBoundary 내부 상태 인터페이스
 */
interface RemoteErrorBoundaryState {
  /** 현재 하위 트리에서 포착된 예외 발생 여부 */
  hasError: boolean;

  /** 사용자 및 개발자에게 안내할 에러 요약 메시지 */
  errorMessage: string;
}

/** remote_shared/ui 미의존 폴백 컨테이너 스타일 상수 (시맨틱 CSS 변수 + 안전 폴백값 병기) */
const FALLBACK_CONTAINER_STYLE: CSSProperties = {
  padding: '20px',
  borderRadius: '12px',
  border: '1px solid var(--mfe-danger, #dc2626)',
  backgroundColor: 'var(--mfe-bg-surface, #ffffff)',
  color: 'var(--mfe-text-primary, #0f172a)',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

/** 폴백 제목 스타일 상수 */
const FALLBACK_TITLE_STYLE: CSSProperties = {
  margin: 0,
  fontSize: '15px',
  fontWeight: 700,
  color: 'var(--mfe-danger, #dc2626)',
};

/** 폴백 설명 문구 스타일 상수 */
const FALLBACK_DESC_STYLE: CSSProperties = {
  margin: 0,
  fontSize: '13px',
  lineHeight: 1.5,
  color: 'var(--mfe-text-secondary, #475569)',
};

/** 폴백 에러 상세 코드 박스 스타일 상수 */
const FALLBACK_ERROR_BOX_STYLE: CSSProperties = {
  margin: 0,
  padding: '10px 12px',
  borderRadius: '8px',
  backgroundColor: 'var(--mfe-bg-app, #f8fafc)',
  border: '1px solid var(--mfe-border-subtle, #e2e8f0)',
  fontSize: '12px',
  fontFamily: 'ui-monospace, Consolas, monospace',
  wordBreak: 'break-word',
};

/** 폴백 [다시 시도] 버튼 스타일 상수 */
const FALLBACK_RETRY_BUTTON_STYLE: CSSProperties = {
  alignSelf: 'flex-start',
  padding: '8px 14px',
  borderRadius: '8px',
  border: '1px solid var(--mfe-brand-primary, #4f46e5)',
  backgroundColor: 'var(--mfe-brand-primary, #4f46e5)',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
};

/**
 * 개별 원격 마이크로 앱의 장애가 전체 호스트 대시보드로 전파되지 않도록 격리하는 ErrorBoundary 클래스 컴포넌트입니다.
 */
export class RemoteErrorBoundary extends Component<
  RemoteErrorBoundaryProps,
  RemoteErrorBoundaryState
> {
  public constructor(props: RemoteErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  /**
   * 하위 원격 트리에서 예외가 발생하면 폴백 UI 상태로 전환합니다.
   *
   * @param error - 포착된 예외 객체
   * @returns 갱신된 에러 경계 상태
   */
  public static getDerivedStateFromError(error: unknown): RemoteErrorBoundaryState {
    const message =
      error instanceof Error && error.message
        ? error.message
        : '원격 마이크로 앱을 불러오는 중 알 수 없는 오류가 발생했습니다.';
    return {
      hasError: true,
      errorMessage: message,
    };
  }

  /**
   * 포착된 원격 장애 출처와 스택을 콘솔에 기록합니다.
   *
   * @param error - 포착된 예외 객체
   * @param errorInfo - React 컴포넌트 스택 정보
   */
  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(
      `[host-vite][RemoteErrorBoundary] ${this.props.remoteLabel}(:${this.props.remotePort}) 장애 격리:`,
      error,
      errorInfo.componentStack,
    );
  }

  /**
   * 사용자가 [다시 시도] 버튼을 클릭했을 때 에러 상태를 초기화하고 상위 재마운트 콜백을 호출합니다.
   */
  private readonly handleRetry = (): void => {
    this.setState({
      hasError: false,
      errorMessage: '',
    });
    this.props.onRetry?.();
  };

  /**
   * 정상 시 자식 원격 트리를, 장애 시 순수 내장 폴백 UI를 렌더링합니다.
   *
   * @returns 정상 자식 노드 또는 장애 격리 폴백 엘리먼트
   */
  public override render(): ReactNode {
    // [분기 설명] 에러가 포착된 경우 해당 리모트 슬롯만 안전한 폴백 안내 화면으로 대체합니다.
    if (this.state.hasError) {
      return (
        <section role="alert" style={FALLBACK_CONTAINER_STYLE}>
          <h3 style={FALLBACK_TITLE_STYLE}>
            {this.props.remoteLabel} (Port {this.props.remotePort}) 연결이 일시적으로 중단되었습니다
          </h3>
          <p style={FALLBACK_DESC_STYLE}>
            MFE 장애 격리 경계(RemoteErrorBoundary)가 오류 전파를 차단했습니다. 나머지 영역은
            정상적으로 계속 사용할 수 있습니다.
          </p>
          <p style={FALLBACK_ERROR_BOX_STYLE}>{this.state.errorMessage}</p>
          <button type="button" style={FALLBACK_RETRY_BUTTON_STYLE} onClick={this.handleRetry}>
            다시 시도
          </button>
        </section>
      );
    }

    return this.props.children;
  }
}
