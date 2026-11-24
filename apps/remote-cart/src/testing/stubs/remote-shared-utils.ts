/**
 * @file remote-shared-utils.ts
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description Vitest 단독 TDD 실행 시 remote_shared/utils 모듈을 대체하는 로컬 테스트 스텁입니다 ([Study 04 #11, Study 12]).
 */
import { QueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';
import { ko } from 'date-fns/locale';
import ky, { HTTPError, type KyInstance, type ResponsePromise } from 'ky';
import { useEffect, useRef } from 'react';
import { type ZodType, z } from 'zod';

/** 호스트 출처 구분 타입 ('vite' | 'rspack' | 'standalone') */
export type HostOriginType = 'vite' | 'rspack' | 'standalone';

/** 상태 동기화 비교 모드 타입 ('mode-a-event' | 'mode-b-query') */
export type SyncMode = 'mode-a-event' | 'mode-b-query';

/** 실시간 테마 모드 타입 */
export type ThemeMode = 'indigo' | 'emerald' | 'rose' | 'dark';

/** CustomEvent.detail에 선택적으로 첨부되는 발신자 식별 예약 메타 키 (Zod strip 동작으로 핸들러 페이로드에서 자동 제거) */
const MFE_EVENT_SOURCE_ID_KEY = '__mfeSourceId';

/** crypto.randomUUID 미지원 환경을 위한 단조 증가 폴백 시퀀스 카운터 */
let fallbackSourceIdSequence = 0;

/**
 * @description 표준 API 에러 페이로드 인터페이스
 */
export interface ApiErrorPayload {
  /** 머신 판독용 에러 코드 */
  code: string;

  /** 사용자 표시용 한글 에러 메시지 */
  message: string;

  /** 추가 검증 상세 정보 */
  details?: unknown;
}

/**
 * @description 백엔드 표준 API 응답 봉투 인터페이스
 */
export interface ApiResponse<T> {
  /** 요청 성공 여부 */
  success: boolean;

  /** 성공 시 반환되는 도메인 데이터 */
  data?: T;

  /** 실패 시 반환되는 에러 상세 객체 */
  error?: ApiErrorPayload;
}

/**
 * @description [mfe:cart-updated] 장바구니 변경 이벤트 페이로드 인터페이스
 */
export interface CartUpdatedEventPayload {
  /** 변경 액션 종류 */
  action: 'add' | 'remove' | 'clear';

  /** 대상 사용자 ID */
  userId: string;

  /** 대상 상품 ID */
  productId?: number;

  /** 대상 상품명 */
  productName?: string;

  /** 변경 수량 */
  quantity?: number;

  /** 이벤트를 발행한 호스트 출처 */
  sourceHost: HostOriginType;

  /** 이벤트 발생 시각 (ISO-8601) */
  timestamp: string;
}

/**
 * @description [mfe:auth-changed] 사용자 전환 이벤트 페이로드 인터페이스
 */
export interface AuthChangedEventPayload {
  /** 변경된 사용자 ID */
  userId: string;

  /** 사용자 이름 */
  username: string;

  /** 인증 토큰 */
  token: string;

  /** 이벤트 발생 시각 */
  timestamp: string;
}

/**
 * @description [mfe:theme-changed] 테마 변경 이벤트 페이로드 인터페이스
 */
export interface ThemeChangedEventPayload {
  /** 변경된 테마 모드 */
  theme: ThemeMode;

  /** 이벤트 발생 시각 */
  timestamp: string;
}

/**
 * @description [mfe:sync-mode-changed] 상태 동기화 비교 모드 변경 이벤트 페이로드 인터페이스
 */
export interface SyncModeChangedEventPayload {
  /** 변경된 동기화 모드 */
  syncMode: SyncMode;

  /** 이벤트 발생 시각 */
  timestamp: string;
}

/** 전사 표준 커스텀 이벤트 이름 상수 맵 (표준 4종) */
export const MFE_EVENTS = {
  CART_UPDATED: 'mfe:cart-updated',
  AUTH_CHANGED: 'mfe:auth-changed',
  THEME_CHANGED: 'mfe:theme-changed',
  SYNC_MODE_CHANGED: 'mfe:sync-mode-changed',
} as const;

/** 커스텀 이벤트 이름 유니온 타입 */
export type MfeEventName = (typeof MFE_EVENTS)[keyof typeof MFE_EVENTS];

/**
 * @description 이벤트 이름과 페이로드 타입 매핑 인터페이스
 */
export interface MfeEventPayloadMap {
  /** 장바구니 변경 이벤트 */
  [MFE_EVENTS.CART_UPDATED]: CartUpdatedEventPayload;

  /** 사용자 전환 이벤트 */
  [MFE_EVENTS.AUTH_CHANGED]: AuthChangedEventPayload;

  /** 테마 전환 이벤트 */
  [MFE_EVENTS.THEME_CHANGED]: ThemeChangedEventPayload;

  /** 상태 동기화 모드 전환 이벤트 */
  [MFE_EVENTS.SYNC_MODE_CHANGED]: SyncModeChangedEventPayload;
}

/** 호스트 출처 검증용 Zod 스키마 */
export const hostOriginSchema = z.enum(['vite', 'rspack', 'standalone']);

/** 실시간 테마 모드 검증용 Zod 스키마 */
export const themeModeSchema = z.enum(['indigo', 'emerald', 'rose', 'dark']);

/** 상태 동기화 비교 모드 검증용 Zod 스키마 */
export const syncModeSchema = z.enum(['mode-a-event', 'mode-b-query']);

/** 장바구니 이벤트 페이로드 검증용 Zod 스키마 */
export const cartUpdatedEventSchema: z.ZodType<CartUpdatedEventPayload> = z.object({
  action: z.enum(['add', 'remove', 'clear']),
  userId: z.string().min(1),
  productId: z.number().int().positive().optional(),
  productName: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  sourceHost: hostOriginSchema,
  timestamp: z.string().min(1),
});

/** 인증 변경 이벤트 페이로드 검증용 Zod 스키마 */
export const authChangedEventSchema: z.ZodType<AuthChangedEventPayload> = z.object({
  userId: z.string().min(1),
  username: z.string().min(1),
  token: z.string().min(1),
  timestamp: z.string().min(1),
});

/** 테마 변경 이벤트 페이로드 검증용 Zod 스키마 */
export const themeChangedEventSchema: z.ZodType<ThemeChangedEventPayload> = z.object({
  theme: themeModeSchema,
  timestamp: z.string().min(1),
});

/** 동기화 모드 변경 이벤트 페이로드 검증용 Zod 스키마 */
export const syncModeChangedEventSchema: z.ZodType<SyncModeChangedEventPayload> = z.object({
  syncMode: syncModeSchema,
  timestamp: z.string().min(1),
});

/** 이벤트 이름별 Zod 스키마 조회 사전 상수 (표준 4종) */
export const MFE_EVENT_SCHEMAS: {
  [K in MfeEventName]: z.ZodType<MfeEventPayloadMap[K]>;
} = {
  [MFE_EVENTS.CART_UPDATED]: cartUpdatedEventSchema,
  [MFE_EVENTS.AUTH_CHANGED]: authChangedEventSchema,
  [MFE_EVENTS.THEME_CHANGED]: themeChangedEventSchema,
  [MFE_EVENTS.SYNC_MODE_CHANGED]: syncModeChangedEventSchema,
};

/**
 * @description 이벤트 발행 시 선택적으로 전달하는 발신자 식별 옵션 인터페이스
 */
export interface MfeEventEmitOptions {
  /** 이벤트를 발행하는 앱·위젯·QueryClient 인스턴스의 고유 발신자 ID */
  sourceId?: string;
}

/**
 * @description 이벤트 구독 시 자기 에코(Self-Echo) 필터링을 제어하는 선택 옵션 인터페이스
 */
export interface MfeEventSubscribeOptions {
  /** 이 ID와 일치하는 sourceId로 발행된 자기 이벤트를 수신 단계에서 자동 무시합니다. */
  ignoreSourceId?: string;
}

/**
 * @description 이벤트 구독 핸들러의 선택적 두 번째 인자로 전달되는 발신 메타데이터 인터페이스
 */
export interface MfeEventMeta {
  /** 발신 측이 emit 옵션으로 전달한 고유 발신자 ID */
  sourceId?: string;
}

/**
 * @description MFE 이벤트 버스 인터페이스
 */
export interface MfeEventBus {
  /** 지정된 커스텀 이벤트를 발행합니다. */
  emit: <K extends MfeEventName>(
    eventName: K,
    payload: MfeEventPayloadMap[K],
    options?: MfeEventEmitOptions,
  ) => boolean;

  /** 지정된 커스텀 이벤트를 구독하고 해제 함수를 반환합니다. */
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
  // [분기 설명] 문자열이 아닌 비정상 입력으로 인한 런타임 예외를 방지합니다.
  if (typeof rawSourceId !== 'string') {
    return undefined;
  }

  const trimmed = rawSourceId.trim();

  // [분기 설명] 공백 문자열은 유효한 발신자 ID가 아니므로 제외합니다.
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
  // [분기 설명] detail이 일반 객체가 아니거나 null인 경우 TypeError를 방지합니다.
  if (typeof detail !== 'object' || detail === null) {
    return undefined;
  }

  const record = detail as Record<string, unknown>;
  return normalizeSourceId(record[MFE_EVENT_SOURCE_ID_KEY]);
}

/**
 * 앱·위젯·QueryClient 인스턴스 단위의 고유한 MFE 이벤트 발신자 ID를 생성합니다.
 *
 * @param prefix - 발신 출처를 식별하기 위한 필수 접두사 (예: 'remote-cart')
 * @returns 충돌 없는 고유 발신자 ID 문자열
 */
export function createMfeEventSourceId(prefix: string): string {
  const normalizedPrefix = normalizeSourceId(prefix);

  // [분기 설명] 정본(remote-shared)과 동일하게 빈 문자열·공백 접두사 호출을 즉시 차단합니다.
  if (!normalizedPrefix) {
    throw new Error(
      "[mfeEventBus] createMfeEventSourceId의 prefix는 비어 있지 않은 문자열이어야 합니다 (예: 'remote-cart').",
    );
  }

  const uniqueToken =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID()
      : `fallback-${++fallbackSourceIdSequence}-${Date.now()}`;

  return `${normalizedPrefix}:${uniqueToken}`;
}

/** 테스트 및 로컬 실행용 MFE 이벤트 버스 구현체 (remote-shared 정본 1:1 정합) */
export const mfeEventBus: MfeEventBus = {
  emit(eventName, payload, options) {
    // [분기 설명] 브라우저 window 객체가 없는 환경에서는 안전하게 false를 반환합니다.
    if (typeof window === 'undefined') {
      return false;
    }

    const schema = MFE_EVENT_SCHEMAS[eventName];

    // [분기 설명] 폐기·미등록 이벤트 이름으로 발행해도 런타임 TypeError를 차단합니다.
    if (!schema) {
      console.warn(`[mfeEventBus] 미등록 이벤트 발행 차단 (${String(eventName)})`);
      return false;
    }

    const parsed = schema.safeParse(payload);

    // [분기 설명] 잘못된 페이로드 구조로 인한 타 마이크로 앱 연쇄 오류를 방지합니다.
    if (!parsed.success) {
      console.warn(`[mfeEventBus] 이벤트 발행 차단 (${eventName}):`, parsed.error.flatten());
      return false;
    }

    const normalizedSourceId = normalizeSourceId(options?.sourceId);

    // [분기 설명] sourceId가 존재할 때만 평문 detail에 예약 메타 키(__mfeSourceId)를 첨부합니다.
    const detail = normalizedSourceId
      ? Object.assign({}, parsed.data, {
          [MFE_EVENT_SOURCE_ID_KEY]: normalizedSourceId,
        })
      : parsed.data;

    window.dispatchEvent(new CustomEvent(eventName, { detail }));
    return true;
  },
  subscribe(eventName, handler, options) {
    if (typeof window === 'undefined') {
      return () => undefined;
    }

    const schema = MFE_EVENT_SCHEMAS[eventName];

    // [분기 설명] 폐기·미등록 이벤트 이름 구독 시도 시 빈 해제 함수를 반환합니다.
    if (!schema) {
      console.warn(`[mfeEventBus] 미등록 이벤트 구독 차단 (${String(eventName)})`);
      return () => undefined;
    }

    const normalizedIgnoreSourceId = normalizeSourceId(options?.ignoreSourceId);

    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<unknown>;
      const incomingSourceId = extractSourceId(customEvent.detail);

      // [분기 설명] Zod 파싱 전 발신자 ID 비교로 자기 에코(Self-Echo)를 즉시 차단합니다.
      if (
        normalizedIgnoreSourceId &&
        incomingSourceId &&
        incomingSourceId === normalizedIgnoreSourceId
      ) {
        return;
      }

      const parsed = schema.safeParse(customEvent.detail);

      // [분기 설명] 오염된 이벤트 detail을 안전하게 무시합니다.
      if (!parsed.success) {
        console.warn(
          `[mfeEventBus] 오염된 이벤트 수신 무시 (${eventName}):`,
          parsed.error.flatten(),
        );
        return;
      }

      // [분기 설명] 발신자 ID가 포함된 경우에만 두 번째 인자(meta)를 전달합니다.
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
 * 컴포넌트 마운트 동안 커스텀 이벤트를 구독하고 언마운트 시 자동 해제하는 훅입니다.
 *
 * @param eventName - 구독할 이벤트 이름
 * @param handler - 이벤트 수신 콜백
 * @param options - 자기 에코 차단용 ignoreSourceId 선택 옵션
 * @returns 없음
 */
export function useMfeEvent<K extends MfeEventName>(
  eventName: K,
  handler: (payload: MfeEventPayloadMap[K], meta?: MfeEventMeta) => void,
  options?: MfeEventSubscribeOptions,
): void {
  /** 최신 핸들러 참조를 유지하기 위한 Ref */
  const savedHandlerRef = useRef(handler);
  savedHandlerRef.current = handler;

  /** 최신 ignoreSourceId를 유지하여 리스너 재등록 없이 자기 에코를 필터링하는 Ref */
  const ignoreSourceIdRef = useRef<string | undefined>(normalizeSourceId(options?.ignoreSourceId));
  ignoreSourceIdRef.current = normalizeSourceId(options?.ignoreSourceId);

  useEffect(() => {
    return mfeEventBus.subscribe(eventName, (payload, meta) => {
      const currentIgnoreSourceId = ignoreSourceIdRef.current;

      // [분기 설명] 마운트 이후 ignoreSourceId가 변경되어도 최신 ID 기준으로 자기 에코를 차단합니다.
      if (currentIgnoreSourceId && meta?.sourceId && meta.sourceId === currentIgnoreSourceId) {
        return;
      }

      if (meta) {
        savedHandlerRef.current(payload, meta);
        return;
      }

      savedHandlerRef.current(payload);
    });
  }, [eventName]);
}

/**
 * @description 정규화된 표준 에러 객체 인터페이스
 */
export interface NormalizedError {
  /** 사용자 표시용 한글 에러 메시지 */
  message: string;

  /** 에러 식별 코드 */
  code: string;

  /** HTTP 상태 코드 (선택) */
  status?: number;

  /** 원본 에러 참조 */
  originalError: unknown;
}

/**
 * 모든 형태의 예외를 NormalizedError 구조로 정규화합니다.
 *
 * @param err - 포착된 예외 값
 * @returns 정규화된 에러 객체
 */
export function normalizeError(err: unknown): NormalizedError {
  // [분기 설명] 이미 정규화된 에러 객체인 경우 그대로 반환합니다.
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'message' in err &&
    typeof (err as { code: unknown }).code === 'string' &&
    typeof (err as { message: unknown }).message === 'string'
  ) {
    const typed = err as {
      code: string;
      message: string;
      status?: number;
      originalError?: unknown;
    };
    return {
      code: typed.code,
      message: typed.message,
      status: typed.status,
      originalError: typed.originalError ?? err,
    };
  }
  if (err instanceof Error) {
    return {
      code: err.name || 'ERROR',
      message: err.message || '알 수 없는 오류가 발생했습니다.',
      originalError: err,
    };
  }
  return {
    code: 'UNKNOWN_ERROR',
    message: typeof err === 'string' ? err : '알 수 없는 오류가 발생했습니다.',
    originalError: err,
  };
}

/** 기본 백엔드 API URL 상수 */
export const DEFAULT_API_BASE_URL = 'http://localhost:4000/api';

/**
 * 지정된 Base URL로 ky 인스턴스를 생성합니다.
 *
 * @param baseUrl - API 기본 주소
 * @returns 생성된 KyInstance
 */
export function createApiClient(baseUrl: string = DEFAULT_API_BASE_URL): KyInstance {
  return ky.create({
    prefixUrl: baseUrl,
    timeout: 10_000,
    retry: 0,
    headers: {
      Accept: 'application/json',
    },
  });
}

/** 기본 공유 HTTP 클라이언트 */
export const httpClient: KyInstance = createApiClient(DEFAULT_API_BASE_URL);

/**
 * 백엔드 표준 응답 봉투(ApiResponse<T>)를 언래핑하고 Zod 스키마로 검증합니다.
 *
 * @param responsePromise - ky 응답 Promise
 * @param dataSchema - 선택적 Zod 검증 스키마
 * @returns 언래핑된 도메인 데이터 T
 */
export async function unwrapApiResponse<T>(
  responsePromise: ResponsePromise,
  dataSchema?: ZodType<T>,
): Promise<T> {
  try {
    const envelope = await responsePromise.json<ApiResponse<T>>();
    // [분기 설명] 봉투의 success가 false이거나 data가 비어 있으면 에러로 변환합니다.
    if (!envelope.success || envelope.data === undefined) {
      throw {
        code: envelope.error?.code ?? 'API_ERROR',
        message: envelope.error?.message ?? '요청 처리에 실패했습니다.',
        originalError: envelope,
      } satisfies NormalizedError;
    }
    // [분기 설명] Zod 스키마가 전달된 경우 응답 데이터를 런타임 검증합니다.
    if (dataSchema) {
      const parsed = dataSchema.safeParse(envelope.data);
      if (!parsed.success) {
        throw {
          code: 'RESPONSE_SCHEMA_INVALID',
          message: '서버 응답 데이터 형식이 계약과 일치하지 않습니다.',
          originalError: parsed.error,
        } satisfies NormalizedError;
      }
      return parsed.data;
    }
    return envelope.data;
  } catch (err) {
    // [분기 설명] HTTP 4xx/5xx 에러 시 응답 본문의 에러 봉투에서 code와 한글 메시지를 추출합니다.
    if (err instanceof HTTPError) {
      try {
        const body = (await err.response.json()) as ApiResponse<unknown>;
        throw {
          code: body.error?.code ?? `HTTP_${err.response.status}`,
          message: body.error?.message ?? err.message,
          status: err.response.status,
          originalError: body,
        } satisfies NormalizedError;
      } catch (innerErr) {
        if (
          typeof innerErr === 'object' &&
          innerErr !== null &&
          'code' in innerErr &&
          'message' in innerErr
        ) {
          throw innerErr;
        }
      }
    }
    throw normalizeError(err);
  }
}

/** 장바구니 표준 쿼리 키 상수 */
export const CART_QUERY_KEY = ['cart'] as const;

/** 상품 목록 표준 쿼리 키 상수 */
export const PRODUCTS_QUERY_KEY = ['products'] as const;

/**
 * MFE 표준 옵션으로 새 QueryClient 인스턴스를 생성합니다.
 *
 * @returns 생성된 QueryClient
 */
export function createMfeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        refetchOnWindowFocus: false,
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/** Mode B 공유용 싱글톤 QueryClient 인스턴스 */
export const sharedQueryClient: QueryClient = createMfeQueryClient();

/**
 * @description 스코프 스토리지 래퍼 인터페이스
 */
export interface ScopedStorage {
  /** 서비스 스코프 ID */
  readonly scopeId: string;

  /** 전체 키 문자열 생성 함수 */
  buildKey: (key: string) => string;

  /** Zod 검증 기반 값 조회 함수 */
  getItem: <T>(key: string, schema: ZodType<T>, fallback: T) => T;

  /** JSON 직렬화 저장 함수 */
  setItem: <T>(key: string, value: T) => void;

  /** 단일 키 삭제 함수 */
  removeItem: (key: string) => void;

  /** 스코프 내 전체 키 삭제 함수 */
  clearScope: () => void;
}

/**
 * 스코프 프리픽스(mfe:<scopeId>:<key>)가 적용된 localStorage 래퍼를 생성합니다.
 *
 * @param scopeId - 서비스 스코프 식별자
 * @returns ScopedStorage 인스턴스
 */
export function createScopedStorage(scopeId: string): ScopedStorage {
  /** 스코프 고유 접두사 */
  const prefix = `mfe:${scopeId}:`;
  const buildKey = (key: string) => `${prefix}${key}`;

  return {
    scopeId,
    buildKey,
    getItem<T>(key: string, schema: ZodType<T>, fallback: T): T {
      if (typeof window === 'undefined' || !window.localStorage) {
        return fallback;
      }
      try {
        const raw = window.localStorage.getItem(buildKey(key));
        if (raw === null) {
          return fallback;
        }
        const parsed = schema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : fallback;
      } catch {
        return fallback;
      }
    },
    setItem<T>(key: string, value: T): void {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(buildKey(key), JSON.stringify(value));
      }
    },
    removeItem(key: string): void {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(buildKey(key));
      }
    },
    clearScope(): void {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      const keys: string[] = [];
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const k = window.localStorage.key(i);
        if (k?.startsWith(prefix)) {
          keys.push(k);
        }
      }
      for (const k of keys) {
        window.localStorage.removeItem(k);
      }
    },
  };
}

/**
 * 숫자를 한국 원화 문자열(예: "129,000원")로 포맷팅합니다.
 *
 * @param amount - 원화 금액
 * @returns 포맷된 원화 문자열
 */
export function formatCurrency(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '0원';
  }
  return `${new Intl.NumberFormat('ko-KR').format(Math.round(amount))}원`;
}

/**
 * 날짜 문자열을 지정된 포맷(기본값: 'yyyy.MM.dd HH:mm')으로 변환합니다.
 *
 * @param dateStr - SQLite DATETIME 또는 ISO-8601 문자열
 * @param pattern - date-fns 포맷 문자열
 * @returns 포맷된 날짜 문자열
 */
export function formatDate(dateStr: string, pattern = 'yyyy.MM.dd HH:mm'): string {
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  const parsed = parseISO(normalized);
  if (!isValid(parsed)) {
    return dateStr;
  }
  return format(parsed, pattern, { locale: ko });
}

/**
 * 날짜 문자열을 현재 기준 상대 시간(예: '방금 전', '3분 전')으로 변환합니다.
 *
 * @param dateStr - SQLite DATETIME 또는 ISO-8601 문자열
 * @returns 한글 상대 시간 문자열
 */
export function formatRelativeTime(dateStr: string): string {
  const normalized = dateStr.includes('T') ? dateStr : dateStr.replace(' ', 'T');
  const parsed = parseISO(normalized);
  if (!isValid(parsed)) {
    return dateStr;
  }
  return formatDistanceToNow(parsed, { addSuffix: true, locale: ko });
}
