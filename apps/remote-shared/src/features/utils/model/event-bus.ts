/**
 * @file event-bus.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./utils)
 * @description Zod 런타임 스키마 검증과 발신자 식별(sourceId) 기반 자기 에코(Self-Echo) 자동 필터링이 내장된 MFE 커스텀 이벤트 버스(mfeEventBus) 및 자동 리스너 해제 훅(useMfeEvent)입니다.
 */
import { useEffect, useRef } from 'react';
import {
  MFE_EVENTS,
  MFE_EVENT_SCHEMAS,
  type MfeEventName,
  type MfeEventPayloadMap,
} from './contracts';

export { MFE_EVENTS };

/** CustomEvent.detail에 선택적으로 첨부되는 발신자 식별 예약 메타 키 (Zod strip 동작으로 핸들러 페이로드에서 자동 제거) */
const MFE_EVENT_SOURCE_ID_KEY = '__mfeSourceId';

/** crypto.randomUUID 미지원 환경을 위한 단조 증가 폴백 시퀀스 카운터 */
let fallbackSourceIdSequence = 0;

/**
 * @description 이벤트 발행 시 선택적으로 전달하는 발신자 식별 옵션 인터페이스
 */
export interface MfeEventEmitOptions {
  /** 이벤트를 발행하는 앱·위젯·QueryClient 인스턴스의 고유 발신자 ID (자기 에코 차단 및 MfeInspector 출처 추적용) */
  sourceId?: string;
}

/**
 * @description 이벤트 구독 시 자기 에코(Self-Echo) 필터링을 제어하는 선택 옵션 인터페이스
 */
export interface MfeEventSubscribeOptions {
  /** 이 ID와 일치하는 sourceId로 발행된 자기 이벤트(Self-Echo)를 수신 단계에서 자동 무시합니다. */
  ignoreSourceId?: string;
}

/**
 * @description 이벤트 구독 핸들러의 선택적 두 번째 인자로 전달되는 발신 메타데이터 인터페이스
 */
export interface MfeEventMeta {
  /** 발신 측이 emit 옵션으로 전달한 고유 발신자 ID (구버전 발신자 또는 미지정 시 생략됨) */
  sourceId?: string;
}

/**
 * @description 마이크로 앱 간 약결합(Mode A 등) 이벤트 발행 및 구독을 담당하는 이벤트 버스 인터페이스
 */
export interface MfeEventBus {
  /** 페이로드를 Zod 스키마로 검증한 뒤 유효할 때만 window CustomEvent를 발행합니다. */
  emit: <K extends MfeEventName>(
    eventName: K,
    payload: MfeEventPayloadMap[K],
    options?: MfeEventEmitOptions,
  ) => boolean;

  /** window CustomEvent를 구독하고 자기 에코 필터링 및 Zod 스키마 검증을 통과한 페이로드만 핸들러에 전달합니다. */
  subscribe: <K extends MfeEventName>(
    eventName: K,
    handler: (payload: MfeEventPayloadMap[K], meta?: MfeEventMeta) => void,
    options?: MfeEventSubscribeOptions,
  ) => () => void;
}

/**
 * 발신자 식별자(sourceId) 입력값을 문자열 정규화(trim)하며, 문자열이 아니거나 공백뿐이면 undefined를 반환합니다.
 *
 * @param rawSourceId - 외부에서 전달된 원시 발신자 ID 값
 * @returns 정규화된 비어 있지 않은 문자열 또는 undefined
 */
function normalizeSourceId(rawSourceId: unknown): string | undefined {
  // [분기 설명] 문자열이 아닌 비정상 입력(숫자·객체 등)으로 인한 런타임 예외를 방지합니다.
  if (typeof rawSourceId !== 'string') {
    return undefined;
  }

  const trimmed = rawSourceId.trim();

  // [분기 설명] 공백만 있는 문자열은 유효한 발신자 ID가 아니므로 무시 필터나 메타 키로 오작동하지 않게 제외합니다.
  if (trimmed.length === 0) {
    return undefined;
  }

  return trimmed;
}

/**
 * 수신된 CustomEvent.detail 객체에서 예약 메타 키(__mfeSourceId)를 안전하게 추출합니다.
 *
 * @param detail - CustomEvent.detail 원시 데이터
 * @returns 유효한 발신자 ID 문자열 또는 undefined
 */
function extractSourceId(detail: unknown): string | undefined {
  // [분기 설명] detail이 일반 객체가 아니거나 null인 경우 예약 메타 키 조회를 건너뛰어 TypeError를 차단합니다.
  if (typeof detail !== 'object' || detail === null) {
    return undefined;
  }

  const record = detail as Record<string, unknown>;
  return normalizeSourceId(record[MFE_EVENT_SOURCE_ID_KEY]);
}

/**
 * 앱·위젯·QueryClient 인스턴스 단위의 고유한 MFE 이벤트 발신자 ID를 생성합니다 ([Study 04 #09, Study 12]).
 *
 * @param prefix - 발신 출처를 식별하기 위한 선택적 접두사 (예: 'remote-cart', 'host-vite')
 * @returns 충돌 없는 고유 발신자 ID 문자열 (예: 'remote-cart:550e8400-...')
 */
export function createMfeEventSourceId(prefix?: string): string {
  const normalizedPrefix = normalizeSourceId(prefix);
  const uniqueToken =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `fallback-${++fallbackSourceIdSequence}-${Date.now()}`;

  // [분기 설명] 유효한 접두사가 주어진 경우에만 '<prefix>:<uuid>' 형식으로 결합해 MfeInspector 로그 가독성을 높입니다.
  if (normalizedPrefix) {
    return `${normalizedPrefix}:${uniqueToken}`;
  }

  return uniqueToken;
}

/**
 * window CustomEvent 기반 MFE 이벤트 버스 싱글톤 객체 ([Study 04 #09, Study 05 #10, Study 12] 방어 적용)
 */
export const mfeEventBus: MfeEventBus = {
  emit<K extends MfeEventName>(
    eventName: K,
    payload: MfeEventPayloadMap[K],
    options?: MfeEventEmitOptions,
  ): boolean {
    // [분기 설명] SSR 또는 비브라우저 환경에서 window 미존재로 인한 참조 에러를 방지합니다.
    if (typeof window === 'undefined') {
      return false;
    }

    const schema = MFE_EVENT_SCHEMAS[eventName];

    // [분기 설명] 독립 배포된 구버전 리모트나 외부 코드가 폐기·미등록 이벤트 이름으로 발행해도 런타임 TypeError 크래시를 차단합니다.
    if (!schema) {
      console.warn(`[mfeEventBus] 미등록 이벤트 발행 차단 (${String(eventName)})`);
      return false;
    }

    const parsed = schema.safeParse(payload);

    // [분기 설명] 발신 측에서 잘못된 구조의 페이로드를 보냈을 때 다른 마이크로 앱들이 연쇄 크래시되는 것을 원천 차단합니다.
    if (!parsed.success) {
      console.warn(`[mfeEventBus] 이벤트 발행 차단 (${eventName}):`, parsed.error.flatten());
      return false;
    }

    const normalizedSourceId = normalizeSourceId(options?.sourceId);

    // [분기 설명] sourceId가 존재할 때만 평문 detail에 예약 메타 키(__mfeSourceId)를 첨부합니다.
    // 구버전 수신자가 받아도 Zod 기본 strip이 알 수 없는 키를 에러 없이 제거하므로 양방향 하위 호환이 100% 유지됩니다.
    const detail = normalizedSourceId
      ? Object.assign({}, parsed.data, {
          [MFE_EVENT_SOURCE_ID_KEY]: normalizedSourceId,
        })
      : parsed.data;

    window.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
      }),
    );
    return true;
  },

  subscribe<K extends MfeEventName>(
    eventName: K,
    handler: (payload: MfeEventPayloadMap[K], meta?: MfeEventMeta) => void,
    options?: MfeEventSubscribeOptions,
  ): () => void {
    // [분기 설명] window가 없는 환경에서는 안전한 빈 해제 함수를 반환합니다.
    if (typeof window === 'undefined') {
      return () => {};
    }

    const schema = MFE_EVENT_SCHEMAS[eventName];

    // [분기 설명] 폐기·미등록 이벤트 이름으로 구독이 시도되더라도 리스너 등록 없이 안전한 빈 해제 함수를 반환해 크래시를 방지합니다.
    if (!schema) {
      console.warn(`[mfeEventBus] 미등록 이벤트 구독 차단 (${String(eventName)})`);
      return () => {};
    }

    const normalizedIgnoreSourceId = normalizeSourceId(options?.ignoreSourceId);

    const listener = (event: Event): void => {
      const customEvent = event as CustomEvent<unknown>;
      const incomingSourceId = extractSourceId(customEvent.detail);

      // [분기 설명] Zod 파싱 전에 발신자 ID를 비교하여 자기 자신이 발행한 이벤트(Self-Echo)를 즉시 차단합니다 ([Study 04 #09, Study 12]).
      if (
        normalizedIgnoreSourceId &&
        incomingSourceId &&
        incomingSourceId === normalizedIgnoreSourceId
      ) {
        return;
      }

      const parsed = schema.safeParse(customEvent.detail);

      // [분기 설명] 외부 스크립트나 구버전 리모트가 오염된 detail을 디스패치하더라도 구독 핸들러가 안전하도록 무시합니다.
      if (!parsed.success) {
        console.warn(
          `[mfeEventBus] 오염된 이벤트 수신 무시 (${eventName}):`,
          parsed.error.flatten(),
        );
        return;
      }

      // [분기 설명] 발신자 ID가 포함된 경우에만 두 번째 인자(meta)를 전달하고, 없는 경우 기존 1인자 호출 계약을 100% 보존합니다.
      if (incomingSourceId) {
        handler(parsed.data, { sourceId: incomingSourceId });
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
 * 리모트 컴포넌트가 마운트될 때 MFE 이벤트를 구독하고, 언마운트 시 100% 자동으로 리스너를 제거하는 커스텀 훅입니다 ([Study 04 #09, Study 12]).
 * 선택적 options.ignoreSourceId를 지정하면 리스너 재등록 없이 최신 발신자 ID 기준으로 자기 에코를 자동 차단합니다.
 *
 * @param eventName - 구독할 표준 MFE 이벤트 이름 (예: MFE_EVENTS.CART_UPDATED)
 * @param handler - 검증된 이벤트 페이로드와 선택적 발신 메타데이터를 수신할 콜백 함수
 * @param options - 자기 에코(Self-Echo) 차단용 ignoreSourceId 선택 옵션
 * @returns void
 */
export function useMfeEvent<K extends MfeEventName>(
  eventName: K,
  handler: (payload: MfeEventPayloadMap[K], meta?: MfeEventMeta) => void,
  options?: MfeEventSubscribeOptions,
): void {
  /** 최신 핸들러 참조를 유지하여 불필요한 리스너 재등록을 방지하는 Ref */
  const savedHandlerRef = useRef(handler);
  savedHandlerRef.current = handler;

  /** 최신 ignoreSourceId를 유지하여 옵션 변경 시에도 리스너 재등록 없이 자기 에코를 필터링하는 Ref */
  const ignoreSourceIdRef = useRef<string | undefined>(normalizeSourceId(options?.ignoreSourceId));
  ignoreSourceIdRef.current = normalizeSourceId(options?.ignoreSourceId);

  useEffect(() => {
    const unsubscribe = mfeEventBus.subscribe(eventName, (payload, meta) => {
      const currentIgnoreSourceId = ignoreSourceIdRef.current;

      // [분기 설명] 마운트 이후 ignoreSourceId가 변경되어도 리스너를 재등록하지 않고 최신 ID 기준으로 자기 에코를 차단합니다.
      if (currentIgnoreSourceId && meta?.sourceId && meta.sourceId === currentIgnoreSourceId) {
        return;
      }

      // [분기 설명] meta 존재 여부에 따라 1인자/2인자 호출 계약을 일관되게 유지합니다.
      if (meta) {
        savedHandlerRef.current(payload, meta);
        return;
      }

      savedHandlerRef.current(payload);
    });

    return () => {
      unsubscribe();
    };
  }, [eventName]);
}
