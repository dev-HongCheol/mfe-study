/**
 * @file host-preferences.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description host-vite 전용 localStorage 네임스페이스(mfe:host-vite:preferences)로 syncMode 및 simulateDelay 학습 환경설정을 안전하게 저장·복원하고 발신자 ID를 생성합니다 ([Study 14 § 3]).
 */
import {
  type SyncMode,
  createMfeEventSourceId,
  createScopedStorage,
  syncModeSchema,
} from 'remote_shared/utils';
import { z } from 'zod';

/** host-vite 전용 스토리지 및 이벤트 발신자 스코프 식별자 상수 */
export const HOST_STORAGE_SCOPE_ID = 'host-vite';

/** 호스트 학습 환경설정 저장 키 상수 (전체 키: mfe:host-vite:preferences) */
export const HOST_PREFERENCES_STORAGE_KEY = 'preferences';

/**
 * @description 호스트 localStorage에 저장되는 학습 환경설정 인터페이스
 */
export interface HostPreferences {
  /** 현재 선택된 상태 동기화 학습 모드 ('mode-a-event' | 'mode-b-query') */
  syncMode: SyncMode;

  /** 1.5초 네트워크 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay: boolean;
}

/** 호스트 학습 환경설정 기본값 상수 */
export const DEFAULT_HOST_PREFERENCES: HostPreferences = {
  syncMode: 'mode-a-event',
  simulateDelay: false,
};

/** 호스트 학습 환경설정 런타임 검증용 Zod 스키마 */
export const hostPreferencesSchema: z.ZodType<HostPreferences> = z.object({
  syncMode: syncModeSchema,
  simulateDelay: z.boolean(),
});

/** host-vite 환경설정 전용 ScopedStorage 인스턴스 */
const hostPreferencesStorage = createScopedStorage(HOST_STORAGE_SCOPE_ID);

/**
 * localStorage에서 host-vite 환경설정을 Zod 검증 후 로드하며, 손상·누락 시 안전한 기본값을 반환합니다.
 *
 * @returns 검증된 HostPreferences 객체
 */
export function loadHostPreferences(): HostPreferences {
  return hostPreferencesStorage.getItem(
    HOST_PREFERENCES_STORAGE_KEY,
    hostPreferencesSchema,
    DEFAULT_HOST_PREFERENCES,
  );
}

/**
 * 변경된 host-vite 환경설정을 스코프 localStorage에 직렬화하여 저장합니다.
 *
 * @param preferences - 저장할 환경설정 객체
 */
export function saveHostPreferences(preferences: HostPreferences): void {
  hostPreferencesStorage.setItem(HOST_PREFERENCES_STORAGE_KEY, preferences);
}

/**
 * host-vite 인스턴스 고유의 MFE 이벤트 발신자 식별자(sourceId)를 생성합니다.
 *
 * @returns 'host-vite:<unique-id>' 형식의 고유 발신자 ID
 */
export function createHostEventSourceId(): string {
  return createMfeEventSourceId(HOST_STORAGE_SCOPE_ID);
}
