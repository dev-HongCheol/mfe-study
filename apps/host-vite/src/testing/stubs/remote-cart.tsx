/**
 * @file remote-cart.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description Vitest 단독 TDD 실행 시 remote_cart/CartWidget 원격 모듈을 대체하는 로컬 테스트 스텁입니다 ([Study 04 #11]).
 */
import type { HostOriginType, SyncMode } from './remote-shared-utils';

/**
 * @description remote_cart/CartWidget Props 계약 스텁 인터페이스
 */
export interface CartWidgetProps {
  /** 현재 로그인 사용자 ID (미로그인 시 null) */
  userId?: string | null;

  /** 상위 호스트 종류 */
  hostType?: HostOriginType;

  /** 상태 동기화 모드 */
  syncMode?: SyncMode;

  /** 1.5초 로딩 지연 시뮬레이션 여부 */
  simulateDelay?: boolean;

  /** 지연 시간(ms) */
  delayMs?: number;

  /** 백엔드 API 기본 URL */
  apiBaseUrl?: string;
}

/** 테스트에서 CartWidget 장애 격리 시나리오를 주입하기 위한 에러 메시지 제어 상태 */
let injectedCartError: string | null = null;

/**
 * 테스트에서 CartWidget 스텁이 렌더링 중 강제 예외를 던지도록 설정합니다.
 *
 * @param message - 던질 에러 메시지 (null 전달 시 정상 복구)
 */
export function setRemoteCartStubError(message: string | null): void {
  injectedCartError = message;
}

/**
 * 테스트 종료 후 CartWidget 스텁의 장애 주입 상태를 초기화합니다.
 */
export function resetRemoteCartStub(): void {
  injectedCartError = null;
}

/**
 * 테스트용 remote_cart/CartWidget 스텁 컴포넌트입니다.
 *
 * @param props - CartWidgetProps
 * @returns 전달받은 Props를 검증 가능한 DOM으로 출력하는 섹션 엘리먼트
 */
export function CartWidget({
  userId = null,
  hostType = 'standalone',
  syncMode = 'mode-a-event',
  simulateDelay = false,
}: CartWidgetProps) {
  // [분기 설명] 장애 격리(TC-06) 테스트 시 의도된 런타임 예외를 발생시킵니다.
  if (injectedCartError) {
    throw new Error(injectedCartError);
  }

  return (
    <section
      data-testid="remote-cart-stub"
      data-user-id={userId ?? 'guest'}
      data-host-type={hostType}
      data-sync-mode={syncMode}
      data-simulate-delay={String(simulateDelay)}
    >
      <h3>장바구니 리모트 (스텁)</h3>
      <p>
        user={userId ?? 'guest'} | host={hostType} | mode={syncMode} | delay={String(simulateDelay)}
      </p>
    </section>
  );
}

export default CartWidget;
