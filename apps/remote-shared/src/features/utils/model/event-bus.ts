/**
 * @file event-bus.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./utils)
 * @description Zod 런타임 스키마 검증이 내장된 MFE 커스텀 이벤트 버스(mfeEventBus) 및 자동 리스너 해제 훅(useMfeEvent)입니다.
 */
import { useEffect, useRef } from 'react';
import {
  MFE_EVENTS,
  MFE_EVENT_SCHEMAS,
  type MfeEventName,
  type MfeEventPayloadMap,
} from './contracts.js';

export { MFE_EVENTS };

/**
 * @description 마이크로 앱 간 약결합(Mode A 등) 이벤트 발행 및 구독을 담당하는 이벤트 버스 인터페이스
 */
export interface MfeEventBus {
  /** 페이로드를 Zod 스키마로 검증한 뒤 유효할 때만 window CustomEvent를 발행합니다. */
  emit: <K extends MfeEventName>(eventName: K, payload: MfeEventPayloadMap[K]) => boolean;

  /** window CustomEvent를 구독하고 수신 시 Zod 스키마 검증을 통과한 페이로드만 핸들러에 전달합니다. */
  subscribe: <K extends MfeEventName>(
    eventName: K,
    handler: (payload: MfeEventPayloadMap[K]) => void,
  ) => () => void;
}

/**
 * window CustomEvent 기반 MFE 이벤트 버스 싱글톤 객체 ([Study 04 #09, Study 05 #10] 방어 적용)
 */
export const mfeEventBus: MfeEventBus = {
  emit<K extends MfeEventName>(eventName: K, payload: MfeEventPayloadMap[K]): boolean {
    // [분기 설명] SSR 또는 비브라우저 환경에서 window 미존재로 인한 참조 에러를 방지합니다.
    if (typeof window === 'undefined') {
      return false;
    }

    const schema = MFE_EVENT_SCHEMAS[eventName];
    const parsed = schema.safeParse(payload);

    // [분기 설명] 발신 측에서 잘못된 구조의 페이로드를 보냈을 때 다른 마이크로 앱들이 연쇄 크래시되는 것을 원천 차단합니다.
    if (!parsed.success) {
      console.warn(`[mfeEventBus] 이벤트 발행 차단 (${eventName}):`, parsed.error.flatten());
      return false;
    }

    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail: parsed.data,
      }),
    );
    return true;
  },

  subscribe<K extends MfeEventName>(
    eventName: K,
    handler: (payload: MfeEventPayloadMap[K]) => void,
  ): () => void {
    // [분기 설명] window가 없는 환경에서는 안전한 빈 해제 함수를 반환합니다.
    if (typeof window === 'undefined') {
      return () => {};
    }

    const schema = MFE_EVENT_SCHEMAS[eventName];

    const listener = (event: Event): void => {
      const customEvent = event as CustomEvent<unknown>;
      const parsed = schema.safeParse(customEvent.detail);

      // [분기 설명] 외부 스크립트나 구버전 리모트가 오염된 detail을 디스패치하더라도 구독 핸들러가 안전하도록 무시합니다.
      if (!parsed.success) {
        console.warn(
          `[mfeEventBus] 오염된 이벤트 수신 무시 (${eventName}):`,
          parsed.error.flatten(),
        );
        return;
      }

      handler(parsed.data);
    };

    window.addEventListener(eventName, listener);
    return () => {
      window.removeEventListener(eventName, listener);
    };
  },
};

/**
 * 리모트 컴포넌트가 마운트될 때 MFE 이벤트를 구독하고, 언마운트 시 100% 자동으로 리스너를 제거하는 커스텀 훅입니다 ([Study 04 #09] 좀비 리스너 방지).
 *
 * @param eventName - 구독할 표준 MFE 이벤트 이름 (예: MFE_EVENTS.CART_UPDATED)
 * @param handler - 검증된 이벤트 페이로드를 수신할 콜백 함수
 * @returns void
 */
export function useMfeEvent<K extends MfeEventName>(
  eventName: K,
  handler: (payload: MfeEventPayloadMap[K]) => void,
): void {
  /** 최신 핸들러 참조를 유지하여 불필요한 리스너 재등록을 방지하는 Ref */
  const savedHandlerRef = useRef(handler);
  savedHandlerRef.current = handler;

  useEffect(() => {
    const unsubscribe = mfeEventBus.subscribe(eventName, (payload) => {
      savedHandlerRef.current(payload);
    });

    return () => {
      unsubscribe();
    };
  }, [eventName]);
}
