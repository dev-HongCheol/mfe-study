/**
 * @file query-client.test.ts
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description [TC-04] Mode B 싱글톤 상태 동기화용 sharedQueryClient 인스턴스 및 CART_QUERY_KEY 상수 테스트입니다.
 */
import { describe, expect, it } from 'vitest';
import {
  CART_QUERY_KEY as exposedKey,
  sharedQueryClient as exposedQueryClient,
} from '../../../exposed/utils.js';
import { CART_QUERY_KEY, createMfeQueryClient, sharedQueryClient } from './query-client.js';

describe('sharedQueryClient & CART_QUERY_KEY (TC-04)', () => {
  it('sharedQueryClient는 exposed/utils에서도 항상 동일한 메모리 참조를 유지하는 싱글톤이며 CART_QUERY_KEY는 ["cart"]이다', () => {
    expect(sharedQueryClient).toBe(exposedQueryClient);
    expect(CART_QUERY_KEY).toEqual(['cart']);
    expect(exposedKey).toBe(CART_QUERY_KEY);

    // Mode A용 독립 클라이언트 팩토리는 매번 새로운 인스턴스를 생성해야 함
    const localA = createMfeQueryClient();
    const localB = createMfeQueryClient();
    expect(localA).not.toBe(sharedQueryClient);
    expect(localA).not.toBe(localB);
  });
});
