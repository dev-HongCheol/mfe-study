/**
 * @file utils.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed true (remote_shared/utils)
 * @description Module Federation './utils' 서브패스 공개 진입점입니다. 단방향 의존성 원칙에 따라 theme 및 ui 모듈을 절대 참조하지 않습니다.
 */
export {
  DEFAULT_API_BASE_URL,
  createApiClient,
  httpClient,
  unwrapApiResponse,
} from '../features/utils/api/http-client.js';
export {
  CART_QUERY_KEY,
  PRODUCTS_QUERY_KEY,
  createMfeQueryClient,
  sharedQueryClient,
} from '../features/utils/api/query-client.js';
export {
  type ApiErrorPayload,
  type ApiResponse,
  type AuthChangedEventPayload,
  type CartUpdatedEventPayload,
  type CssIsolationChangedEventPayload,
  type HostOriginType,
  MFE_EVENTS,
  MFE_EVENT_SCHEMAS,
  type MfeEventName,
  type MfeEventPayloadMap,
  type SyncMode,
  type SyncModeChangedEventPayload,
  type ThemeChangedEventPayload,
  type ThemeMode,
  authChangedEventSchema,
  cartUpdatedEventSchema,
  cssIsolationChangedEventSchema,
  hostOriginSchema,
  syncModeChangedEventSchema,
  syncModeSchema,
  themeChangedEventSchema,
  themeModeSchema,
} from '../features/utils/model/contracts.js';
export { type NormalizedError, normalizeError } from '../features/utils/model/error.js';
export { type MfeEventBus, mfeEventBus, useMfeEvent } from '../features/utils/model/event-bus.js';
export {
  formatCurrency,
  formatDate,
  formatRelativeTime,
} from '../features/utils/model/formatters.js';
export { type ScopedStorage, createScopedStorage } from '../features/utils/model/storage.js';
