/**
 * @file validators.test.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-03, EC-02] 공통 유효성 체크·정규화 유틸리티(normalizeUserId, isThemeMode, isSyncMode) 및 ./utils 공개 재노출 단위 테스트입니다.
 */
import { describe, expect, it } from 'vitest';
import * as exposedUtils from '../../../exposed/utils';
import { isSyncMode, isThemeMode, normalizeUserId } from './validators';

describe('validators (TC-03, EC-02)', () => {
  it('TC-03: normalizeUserId는 유효한 ID만 앞뒤 공백을 제거해 반환하고 null·undefined·빈·공백 문자열은 null을 반환한다', () => {
    expect(normalizeUserId('  user-1  ')).toBe('user-1');
    expect(normalizeUserId('user-2')).toBe('user-2');
    expect(normalizeUserId(undefined)).toBeNull();
    expect(normalizeUserId(null)).toBeNull();
    expect(normalizeUserId('')).toBeNull();
    expect(normalizeUserId('   ')).toBeNull();
  });

  it('TC-03: isThemeMode는 표준 4종 테마에만 true를 반환하고 나머지 값에는 false를 반환한다', () => {
    expect(isThemeMode('indigo')).toBe(true);
    expect(isThemeMode('emerald')).toBe(true);
    expect(isThemeMode('rose')).toBe(true);
    expect(isThemeMode('dark')).toBe(true);

    expect(isThemeMode('blue')).toBe(false);
    expect(isThemeMode('DARK')).toBe(false);
    expect(isThemeMode('')).toBe(false);
    expect(isThemeMode(null)).toBe(false);
    expect(isThemeMode(undefined)).toBe(false);
    expect(isThemeMode(123)).toBe(false);
  });

  it('TC-03: isSyncMode는 표준 2종 동기화 모드에만 true를 반환하고 나머지 값에는 false를 반환한다', () => {
    expect(isSyncMode('mode-a-event')).toBe(true);
    expect(isSyncMode('mode-b-query')).toBe(true);

    expect(isSyncMode('mode-c')).toBe(false);
    expect(isSyncMode('')).toBe(false);
    expect(isSyncMode(null)).toBe(false);
    expect(isSyncMode(undefined)).toBe(false);
    expect(isSyncMode({})).toBe(false);
  });

  it('TC-03: exposed/utils 공개 진입점에서 normalizeUserId, isThemeMode, isSyncMode가 재노출된다', () => {
    expect(typeof exposedUtils.normalizeUserId).toBe('function');
    expect(typeof exposedUtils.isThemeMode).toBe('function');
    expect(typeof exposedUtils.isSyncMode).toBe('function');
  });

  it('EC-02: normalizeUserId는 런타임 비문자열과 개행·탭 공백 문자열에 대해 예외 없이 null을 반환한다', () => {
    expect(normalizeUserId(123 as unknown as string)).toBeNull();
    expect(normalizeUserId({} as unknown as string)).toBeNull();
    expect(normalizeUserId([] as unknown as string)).toBeNull();
    expect(normalizeUserId('\t\n  ')).toBeNull();
  });
});
