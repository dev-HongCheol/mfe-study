/**
 * @file contracts.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (via ./utils)
 * @description 루트 SSOT 계약(§ 5.1.1, § 5.2, § 5.4.1)을 준수하는 공통 이벤트·API 봉투·테마·동기화 모드 인터페이스 및 Zod 런타임 스키마입니다.
 */
import { z } from 'zod';

/**
 * @description 요청 또는 이벤트를 발생시킨 호스트(또는 단독 실행) 출처 구분 타입
 */
export type HostOriginType = 'vite' | 'rspack' | 'standalone';

/**
 * @description 실시간 전환 가능한 4종 디자인 테마 식별자 타입 (루트 SSOT § 5.3.2)
 */
export type ThemeMode = 'indigo' | 'emerald' | 'rose' | 'dark';

/**
 * @description MFE 마이크로 앱 간 상태 동기화 비교 학습 모드 타입 (루트 SSOT § 5.4.1)
 */
export type SyncMode = 'mode-a-event' | 'mode-b-query';

/**
 * @description 백엔드 REST API 에러 발생 시 반환되는 표준 에러 상세 객체 인터페이스 (루트 SSOT § 5.1.1)
 */
export interface ApiErrorPayload {
  /** 머신 판독용 표준 에러 코드 (예: 'VALIDATION_ERROR', 'NOT_FOUND', 'OUT_OF_STOCK', 'INTERNAL_ERROR') */
  code: string;

  /** 사용자 또는 개발자에게 표시할 한글 에러 설명 메시지 */
  message: string;

  /** Zod 스키마 검증 실패 등 추가 디버깅 상세 정보 (선택적) */
  details?: unknown;
}

/**
 * @description 모든 백엔드 REST API 엔드포인트가 공통으로 반환하는 표준 응답 엔벨로프 인터페이스 (루트 SSOT § 5.1.1)
 */
export interface ApiResponse<T> {
  /** 요청 처리 성공 여부 (HTTP 2xx일 때 true, 4xx/5xx일 때 false) */
  success: boolean;

  /** 요청 성공 시 반환되는 실제 도메인 데이터 페이로드 (성공 시 필수) */
  data?: T;

  /** 요청 실패 시 반환되는 표준 에러 객체 (실패 시 필수) */
  error?: ApiErrorPayload;
}

/**
 * @description 마이크로 프론트엔드 앱 간 통신에 사용되는 표준 CustomEvent 이름 상수 맵 (루트 SSOT § 5.2.1)
 */
export const MFE_EVENTS = {
  /** 상품 앱에서 장바구니에 상품을 추가했음을 알리는 이벤트 (Mode A 동기화 트리거 및 모니터 로깅용) */
  CART_UPDATED: 'mfe:cart-updated',

  /** 호스트에서 로그인 사용자를 전환했음을 알리는 이벤트 */
  AUTH_CHANGED: 'mfe:auth-changed',

  /** 실시간 디자인 테마가 변경되었음을 알리는 이벤트 */
  THEME_CHANGED: 'mfe:theme-changed',

  /** 호스트 MfeInspector에서 상태 동기화 학습 모드(Mode A <-> Mode B)를 전환했음을 알리는 이벤트 */
  SYNC_MODE_CHANGED: 'mfe:sync-mode-changed',

  /** 장바구니 앱의 CSS 스타일 충돌/격리 실험 토글 상태가 변경되었음을 알리는 이벤트 */
  CSS_ISOLATION_CHANGED: 'mfe:css-isolation-changed',
} as const;

/**
 * @description MFE_EVENTS 상수 값들의 유니온 타입
 */
export type MfeEventName = (typeof MFE_EVENTS)[keyof typeof MFE_EVENTS];

/**
 * @description [mfe:cart-updated] 장바구니 변경 이벤트 페이로드 인터페이스 (루트 SSOT § 5.2.2)
 */
export interface CartUpdatedEventPayload {
  /** 변경을 발생시킨 액션 종류 ('add' | 'remove' | 'clear') */
  action: 'add' | 'remove' | 'clear';

  /** 대상 사용자 ID */
  userId: string;

  /** 추가 또는 삭제된 상품 ID (전체 비우기 시 선택적) */
  productId?: number;

  /** 추가된 상품명 (실시간 모니터 로그 표시용) */
  productName?: string;

  /** 변경 수량 */
  quantity?: number;

  /** 이벤트를 발행한 호스트 출처 ('vite' | 'rspack' | 'standalone') */
  sourceHost: HostOriginType;

  /** 이벤트 발생 시각 (ISO-8601 문자열) */
  timestamp: string;
}

/**
 * @description [mfe:auth-changed] 사용자 전환 이벤트 페이로드 인터페이스 (루트 SSOT § 5.2.2)
 */
export interface AuthChangedEventPayload {
  /** 새로 선택된 사용자 ID */
  userId: string;

  /** 사용자 표시 이름 */
  username: string;

  /** 발급된 인증 토큰 */
  token: string;

  /** 이벤트 발생 시각 (ISO-8601 문자열) */
  timestamp: string;
}

/**
 * @description [mfe:theme-changed] 실시간 색상 테마 변경 이벤트 페이로드 인터페이스 (루트 SSOT § 5.2.2)
 */
export interface ThemeChangedEventPayload {
  /** 변경된 테마 모드 ('indigo' | 'emerald' | 'rose' | 'dark') */
  theme: ThemeMode;

  /** 이벤트 발생 시각 (ISO-8601 문자열) */
  timestamp: string;
}

/**
 * @description [mfe:sync-mode-changed] 상태 동기화 비교 학습 모드 전환 이벤트 페이로드 인터페이스 (루트 SSOT § 5.2.2)
 */
export interface SyncModeChangedEventPayload {
  /** 선택된 동기화 모드 ('mode-a-event' | 'mode-b-query') */
  syncMode: SyncMode;

  /** 이벤트 발생 시각 (ISO-8601 문자열) */
  timestamp: string;
}

/**
 * @description [mfe:css-isolation-changed] 장바구니 CSS 스타일 격리 토글 변경 이벤트 페이로드 인터페이스
 */
export interface CssIsolationChangedEventPayload {
  /** CSS 스타일 격리 활성화 여부 (true: 격리됨, false: 의도적 스타일 오염 실험) */
  cssIsolated: boolean;

  /** 이벤트 발생 시각 (ISO-8601 문자열) */
  timestamp: string;
}

/**
 * @description 각 MFE 커스텀 이벤트 이름과 페이로드 타입을 1:1로 매핑하는 인터페이스
 */
export interface MfeEventPayloadMap {
  /** 장바구니 변경 이벤트 매핑 */
  [MFE_EVENTS.CART_UPDATED]: CartUpdatedEventPayload;

  /** 인증 계정 전환 이벤트 매핑 */
  [MFE_EVENTS.AUTH_CHANGED]: AuthChangedEventPayload;

  /** 테마 변경 이벤트 매핑 */
  [MFE_EVENTS.THEME_CHANGED]: ThemeChangedEventPayload;

  /** 상태 동기화 모드 변경 이벤트 매핑 */
  [MFE_EVENTS.SYNC_MODE_CHANGED]: SyncModeChangedEventPayload;

  /** CSS 격리 토글 변경 이벤트 매핑 */
  [MFE_EVENTS.CSS_ISOLATION_CHANGED]: CssIsolationChangedEventPayload;
}

/** 호스트 출처 검증용 Zod 스키마 */
export const hostOriginSchema = z.enum(['vite', 'rspack', 'standalone']);

/** 실시간 테마 모드 검증용 Zod 스키마 */
export const themeModeSchema = z.enum(['indigo', 'emerald', 'rose', 'dark']);

/** 상태 동기화 비교 모드 검증용 Zod 스키마 */
export const syncModeSchema = z.enum(['mode-a-event', 'mode-b-query']);

/** 장바구니 변경 이벤트 페이로드 런타임 검증 스키마 */
export const cartUpdatedEventSchema: z.ZodType<CartUpdatedEventPayload> = z.object({
  action: z.enum(['add', 'remove', 'clear']),
  userId: z.string().min(1),
  productId: z.number().int().positive().optional(),
  productName: z.string().optional(),
  quantity: z.number().int().positive().optional(),
  sourceHost: hostOriginSchema,
  timestamp: z.string().min(1),
});

/** 인증 변경 이벤트 페이로드 런타임 검증 스키마 */
export const authChangedEventSchema: z.ZodType<AuthChangedEventPayload> = z.object({
  userId: z.string().min(1),
  username: z.string().min(1),
  token: z.string().min(1),
  timestamp: z.string().min(1),
});

/** 테마 변경 이벤트 페이로드 런타임 검증 스키마 */
export const themeChangedEventSchema: z.ZodType<ThemeChangedEventPayload> = z.object({
  theme: themeModeSchema,
  timestamp: z.string().min(1),
});

/** 동기화 모드 변경 이벤트 페이로드 런타임 검증 스키마 */
export const syncModeChangedEventSchema: z.ZodType<SyncModeChangedEventPayload> = z.object({
  syncMode: syncModeSchema,
  timestamp: z.string().min(1),
});

/** CSS 격리 토글 변경 이벤트 페이로드 런타임 검증 스키마 */
export const cssIsolationChangedEventSchema: z.ZodType<CssIsolationChangedEventPayload> = z.object({
  cssIsolated: z.boolean(),
  timestamp: z.string().min(1),
});

/** 이벤트 이름별 Zod 스키마 조회 사전 상수 */
export const MFE_EVENT_SCHEMAS: {
  [K in MfeEventName]: z.ZodType<MfeEventPayloadMap[K]>;
} = {
  [MFE_EVENTS.CART_UPDATED]: cartUpdatedEventSchema,
  [MFE_EVENTS.AUTH_CHANGED]: authChangedEventSchema,
  [MFE_EVENTS.THEME_CHANGED]: themeChangedEventSchema,
  [MFE_EVENTS.SYNC_MODE_CHANGED]: syncModeChangedEventSchema,
  [MFE_EVENTS.CSS_ISOLATION_CHANGED]: cssIsolationChangedEventSchema,
};
