/**
 * @file RemoteWidgetSlot.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description 개별 원격 리모트 위젯을 독립된 RemoteErrorBoundary + Suspense(Skeleton 폴백) + 리마운트 복구 키로 감싸는 호스트 슬롯 컴포넌트입니다 ([Study 14 § 4]).
 */
import { type ReactNode, Suspense, useCallback, useState } from 'react';
import { Card, Skeleton, Stack } from 'remote_shared/ui';
import { RemoteErrorBoundary } from './RemoteErrorBoundary';

/**
 * @description RemoteWidgetSlot 컴포넌트 Props 인터페이스
 */
export interface RemoteWidgetSlotProps {
  /** 화면 안내 및 에러 경계에 표시할 원격 앱 이름 (예: '상품 카탈로그') */
  remoteLabel: string;

  /** 원격 서버 포트 번호 (예: 3002, 3003) */
  remotePort: number;

  /** Suspense 로딩 폴백에 표시할 Skeleton 블록 개수 (기본값: 3) */
  loadingLines?: number;

  /** 슬롯 내부에 마운트할 지연 로딩 원격 컴포넌트 */
  children: ReactNode;
}

/**
 * 개별 원격 컴포넌트를 장애 격리 경계와 지연 로딩 스켈레톤으로 감싸는 슬롯 컴포넌트입니다.
 *
 * @param props - 원격 메타 정보 및 자식 위젯
 * @returns RemoteErrorBoundary + Suspense 조합 엘리먼트
 */
export function RemoteWidgetSlot({
  remoteLabel,
  remotePort,
  loadingLines = 3,
  children,
}: RemoteWidgetSlotProps) {
  /** [다시 시도] 클릭 시 자식 트리를 완전히 새로 마운트하기 위한 리마운트 카운터 상태 */
  const [retryKey, setRetryKey] = useState<number>(0);

  /**
   * ErrorBoundary 재시도 버튼 클릭 시 리마운트 키를 증가시켜 원격 로딩을 재시도합니다.
   */
  const handleRetry = useCallback(() => {
    setRetryKey((prev) => prev + 1);
  }, []);

  return (
    <div className="host-remote-slot">
      <RemoteErrorBoundary remoteLabel={remoteLabel} remotePort={remotePort} onRetry={handleRetry}>
        <Suspense
          fallback={
            <Card padding="md" className="host-suspense-fallback">
              <Stack gap="sm">
                <p className="host-suspense-label">
                  {remoteLabel} (Port {remotePort}) 모듈을 불러오는 중입니다...
                </p>
                <Skeleton variant="card" height={72} count={loadingLines} />
              </Stack>
            </Card>
          }
        >
          <div key={retryKey} className="host-remote-slot-body">
            {children}
          </div>
        </Suspense>
      </RemoteErrorBoundary>
    </div>
  );
}
