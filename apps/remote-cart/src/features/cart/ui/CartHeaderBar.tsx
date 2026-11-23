/**
 * @file CartHeaderBar.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description 장바구니 위젯의 현재 동기화 모드(Mode A vs Mode B), 호스트 출처, CSS 격리 상태 및 수신 이벤트 횟수를 표시하는 헤더 컴포넌트입니다.
 */
import { Badge, Flex, Heading } from 'remote_shared/ui';
import type { HostOriginType, SyncMode } from 'remote_shared/utils';

/**
 * @description CartHeaderBar 컴포넌트 Props 인터페이스
 */
export interface CartHeaderBarProps {
  /** 현재 활성화된 상태 동기화 학습 모드 */
  syncMode: SyncMode;

  /** 이 위젯을 마운트한 상위 호스트 출처 */
  hostType: HostOriginType;

  /** CSS 스타일 격리 토글 활성화 여부 */
  cssIsolated: boolean;

  /** Mode A에서 수신한 mfe:cart-updated 이벤트 누적 횟수 */
  receivedEventCount: number;

  /** 현재 로그인된 사용자 ID (비로그인 시 null) */
  userId: string | null;
}

/**
 * 장바구니 위젯 상단 상태 배지 및 동기화 모드 요약 헤더 컴포넌트입니다.
 *
 * @param props - 동기화 모드, 호스트 출처, CSS 격리 여부, 이벤트 카운터 및 사용자 ID
 * @returns 장바구니 헤더 JSX 엘리먼트
 */
export function CartHeaderBar({
  syncMode,
  hostType,
  cssIsolated,
  receivedEventCount,
  userId,
}: CartHeaderBarProps) {
  /** Mode B 공유 캐시 동기화 여부 */
  const isModeB = syncMode === 'mode-b-query';

  return (
    <div className="cart-header-bar">
      <Flex justify="between" align="center" gap="sm" wrap="wrap">
        <div>
          <Heading level={3}>장바구니 위젯 (Rspack · Port 3003)</Heading>
          <p className="cart-header-subtext">
            {isModeB
              ? 'Mode B: 싱글톤 sharedQueryClient 캐시 무효화를 자동 감지합니다.'
              : 'Mode A: 독립 QueryClient + mfe:cart-updated 이벤트 수신 시 재조회합니다.'}
          </p>
        </div>

        <Flex align="center" gap="xs" wrap="wrap">
          <Badge tone={isModeB ? 'brand' : 'success'}>
            {isModeB ? 'Mode B (Shared Query)' : 'Mode A (CustomEvent)'}
          </Badge>
          <Badge tone={cssIsolated ? 'neutral' : 'danger'}>
            {cssIsolated ? 'CSS 격리 활성' : 'CSS 비격리 오염 실험'}
          </Badge>
          <Badge tone="neutral">Host: {hostType}</Badge>
          <Badge tone={userId ? 'brand' : 'warning'}>
            {userId ? `계정: ${userId}` : '비로그인 (읽기 차단)'}
          </Badge>
          {!isModeB ? <Badge tone="neutral">수신 이벤트 {receivedEventCount}회</Badge> : null}
        </Flex>
      </Flex>
    </div>
  );
}
