/**
 * @file host-preferences.test.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description [TC-03, TC-04, EC-02] host-vite 스코프 스토리지 환경설정(syncMode, simulateDelay) 저장·복원, 오염 JSON 폴백 및 발신자 ID 생성 단위 테스트입니다.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOST_PREFERENCES,
  HOST_PREFERENCES_STORAGE_KEY,
  HOST_STORAGE_SCOPE_ID,
  createHostEventSourceId,
  loadHostPreferences,
  saveHostPreferences,
} from './host-preferences';

describe('host-preferences 단위 테스트 (TC-03, TC-04, EC-02)', () => {
  it('초기 스토리지가 비어 있으면 기본 환경설정(mode-a-event, simulateDelay: false)을 반환한다', () => {
    expect(loadHostPreferences()).toEqual(DEFAULT_HOST_PREFERENCES);
  });

  it('TC-03 / TC-04: 저장한 syncMode와 simulateDelay를 mfe:host-vite:preferences 키로 보존하고 복원한다', () => {
    saveHostPreferences({
      syncMode: 'mode-b-query',
      simulateDelay: true,
    });

    const raw = window.localStorage.getItem(
      `mfe:${HOST_STORAGE_SCOPE_ID}:${HOST_PREFERENCES_STORAGE_KEY}`,
    );
    expect(raw).not.toBeNull();
    expect(loadHostPreferences()).toEqual({
      syncMode: 'mode-b-query',
      simulateDelay: true,
    });
  });

  it('EC-02: localStorage에 손상된 JSON 또는 스키마 위반 데이터가 있으면 크래시 없이 기본값으로 폴백한다', () => {
    const storageKey = `mfe:${HOST_STORAGE_SCOPE_ID}:${HOST_PREFERENCES_STORAGE_KEY}`;

    window.localStorage.setItem(storageKey, '{broken-json');
    expect(loadHostPreferences()).toEqual(DEFAULT_HOST_PREFERENCES);

    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ syncMode: 'invalid-mode', simulateDelay: 'yes' }),
    );
    expect(loadHostPreferences()).toEqual(DEFAULT_HOST_PREFERENCES);
  });

  it('createHostEventSourceId는 host-vite 프리픽스를 포함한 고유 발신자 ID를 생성한다', () => {
    const first = createHostEventSourceId();
    const second = createHostEventSourceId();

    expect(first).toMatch(/^host-vite:/);
    expect(first).not.toBe(second);
  });
});
