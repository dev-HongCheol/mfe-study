/**
 * @file storage.test.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-02 / EC-02] createScopedStorage 네임스페이스 격리 및 손상된 JSON 폴백 복구 테스트입니다.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createScopedStorage } from './storage.js';

describe('createScopedStorage (TC-02 & EC-02)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('TC-02: 서로 다른 스코프(shared vs cart)에 동일한 키 이름을 저장해도 충돌하지 않고 스코프별로 선택 삭제된다', () => {
    const sharedStorage = createScopedStorage('shared');
    const cartStorage = createScopedStorage('cart');
    const prefSchema = z.object({ mode: z.string() });

    sharedStorage.setItem('preferences', { mode: 'dark' });
    cartStorage.setItem('preferences', { mode: 'compact' });

    expect(window.localStorage.getItem('mfe:shared:preferences')).toBe(
      JSON.stringify({ mode: 'dark' }),
    );
    expect(window.localStorage.getItem('mfe:cart:preferences')).toBe(
      JSON.stringify({ mode: 'compact' }),
    );

    // shared 스코프만 전체 삭제했을 때 cart 스코프 데이터는 그대로 보존되어야 함
    sharedStorage.clearScope();

    expect(sharedStorage.getItem('preferences', prefSchema, { mode: 'indigo' })).toEqual({
      mode: 'indigo',
    });
    expect(cartStorage.getItem('preferences', prefSchema, { mode: 'default' })).toEqual({
      mode: 'compact',
    });
  });

  it('EC-02: localStorage에 깨진 JSON이나 스키마 불일치 값이 들어 있어도 예외 없이 fallback을 반환한다', () => {
    const sharedStorage = createScopedStorage('shared');
    const themeSchema = z.enum(['indigo', 'emerald', 'rose', 'dark']);

    // 1) 깨진 JSON 문자열 주입
    window.localStorage.setItem('mfe:shared:theme', '{invalid-json');
    expect(sharedStorage.getItem('theme', themeSchema, 'indigo')).toBe('indigo');

    // 2) 스키마에 없는 오염된 값 주입
    window.localStorage.setItem('mfe:shared:theme', JSON.stringify('neon-pink'));
    expect(sharedStorage.getItem('theme', themeSchema, 'indigo')).toBe('indigo');
  });
});
