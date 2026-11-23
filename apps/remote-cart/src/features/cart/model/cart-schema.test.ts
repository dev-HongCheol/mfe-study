/**
 * @file cart-schema.test.ts
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description [TC-01, EC-02, EC-03] 장바구니 Zod 스키마, 파생 합계 정수 연산, normalizeUserId, 스코프 스토리지 및 DEV/PROD 에러 리포트 이원화 단위 테스트입니다.
 */
import type { NormalizedError } from 'remote_shared/utils';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import {
  DEFAULT_CART_PREFERENCES,
  calculateCartTotals,
  cartItemListSchema,
  deleteCartResultSchema,
  formatCartErrorReport,
  loadCartPreferences,
  normalizeUserId,
  saveCartPreferences,
} from './cart-schema';

describe('cart-schema (TC-01, EC-02, EC-03)', () => {
  it('TC-01: 유효한 CartItemView 배열과 삭제 응답을 검증하고 파생 합계를 정수 연산으로 산출한다', () => {
    const items = cartItemListSchema.parse([
      {
        id: 1,
        userId: 'user-1',
        productId: 1,
        productName: '기계식 무선 키보드 Pro',
        price: 129000,
        category: 'electronics',
        quantity: 1,
        addedFromHost: 'vite',
        createdAt: '2026-11-23 14:00:00',
      },
      {
        id: 2,
        userId: 'user-1',
        productId: 5,
        productName: '알루미늄 노트북 거치대 Stand',
        price: 42000,
        category: 'accessories',
        quantity: 2,
        addedFromHost: 'standalone',
        createdAt: '2026-11-23 14:05:00',
      },
    ]);

    expect(items).toHaveLength(2);
    expect(calculateCartTotals(items)).toEqual({
      itemCount: 2,
      totalQuantity: 3,
      totalPrice: 213000,
    });

    const deleteSingle = deleteCartResultSchema.parse({ deletedId: 1, deletedCount: 1 });
    const deleteAll = deleteCartResultSchema.parse({ deletedId: 'all', deletedCount: 2 });
    expect(deleteSingle).toEqual({ deletedId: 1, deletedCount: 1 });
    expect(deleteAll).toEqual({ deletedId: 'all', deletedCount: 2 });
  });

  it('TC-01: normalizeUserId는 유효 ID만 공백 제거해 반환하고 null/공백은 임의 유저 폴백 없이 null을 반환한다', () => {
    expect(normalizeUserId('  user-1  ')).toBe('user-1');
    expect(normalizeUserId(undefined)).toBeNull();
    expect(normalizeUserId(null)).toBeNull();
    expect(normalizeUserId('')).toBeNull();
    expect(normalizeUserId('   ')).toBeNull();
  });

  it('TC-01: saveCartPreferences는 mfe:cart:preferences 키로 격리 저장하고 loadCartPreferences가 복원한다', () => {
    saveCartPreferences({ cssIsolated: false });

    const storedRaw = window.localStorage.getItem('mfe:cart:preferences');
    expect(storedRaw).not.toBeNull();
    expect(loadCartPreferences()).toEqual({ cssIsolated: false });
  });

  it('EC-02: 손상된 로컬 스토리지 JSON이나 잘못된 스키마 값이 저장되어 있으면 기본값으로 안전 복구한다', () => {
    window.localStorage.setItem('mfe:cart:preferences', '{bad-json');
    expect(loadCartPreferences()).toEqual(DEFAULT_CART_PREFERENCES);

    window.localStorage.setItem('mfe:cart:preferences', JSON.stringify({ cssIsolated: 'yes' }));
    expect(loadCartPreferences()).toEqual(DEFAULT_CART_PREFERENCES);
  });

  it('EC-03: RESPONSE_SCHEMA_INVALID 에러 리포트는 DEV에서만 실패 필드 좌표를 노출하고 PROD에서는 숨긴다', () => {
    const parsed = cartItemListSchema.safeParse([{ id: -1, productName: '' }]);
    expect(parsed.success).toBe(false);
    const zodError = !parsed.success ? parsed.error : new ZodError([]);

    const normalized: NormalizedError = {
      code: 'RESPONSE_SCHEMA_INVALID',
      message: '서버 응답 데이터 형식이 계약과 일치하지 않습니다.',
      originalError: zodError,
    };

    const devReport = formatCartErrorReport(normalized, true);
    expect(devReport.code).toBe('RESPONSE_SCHEMA_INVALID');
    expect(devReport.devDetails.length).toBeGreaterThan(0);
    expect(devReport.devDetails.some((detail) => detail.path.includes('[0].'))).toBe(true);

    const prodReport = formatCartErrorReport(normalized, false);
    expect(prodReport.devDetails).toEqual([]);
    expect(prodReport.userMessage).not.toContain('createdAt');
  });
});
