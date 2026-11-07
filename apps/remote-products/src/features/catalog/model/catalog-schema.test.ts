/**
 * @file catalog-schema.test.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description [TC-01, EC-01] 상품 카탈로그 Zod 스키마 검증 및 createScopedStorage('products') 필터 영속화 단위 테스트입니다.
 */
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRODUCT_FILTER,
  loadCatalogFilter,
  productEntityListSchema,
  productFilterSchema,
  resetCatalogFilter,
  saveCatalogFilter,
} from './catalog-schema.js';

describe('catalog-schema & products 스코프 스토리지 (TC-01, EC-01)', () => {
  it('TC-01: 유효한 필터 입력 시 검색어 공백을 자동 trim하고 mfe:products:catalog-filter 키에 격리 저장·복원한다', () => {
    const parsed = productFilterSchema.parse({
      category: 'electronics',
      search: '  키보드  ',
    });

    expect(parsed).toEqual({
      category: 'electronics',
      search: '키보드',
    });

    saveCatalogFilter({
      category: 'office',
      search: '모션 데스크',
    });

    expect(window.localStorage.getItem('mfe:products:catalog-filter')).not.toBeNull();
    expect(loadCatalogFilter()).toEqual({
      category: 'office',
      search: '모션 데스크',
    });

    resetCatalogFilter();
    expect(loadCatalogFilter()).toEqual(DEFAULT_PRODUCT_FILTER);
  });

  it('TC-01: productEntityListSchema는 정상적인 상품 목록 데이터를 통과시킨다', () => {
    const validList = [
      {
        id: 1,
        name: '기계식 무선 키보드 Pro',
        price: 129000,
        category: 'electronics',
        stock: 15,
        description: '설명',
        createdAt: '2026-10-31T09:00:00.000Z',
      },
    ];

    const result = productEntityListSchema.safeParse(validList);
    expect(result.success).toBe(true);
  });

  it('EC-01: 로컬 스토리지가 깨진 JSON이거나 잘못된 카테고리로 오염된 경우 기본 필터로 안전 복구한다', () => {
    window.localStorage.setItem('mfe:products:catalog-filter', '{broken-json');
    expect(loadCatalogFilter()).toEqual(DEFAULT_PRODUCT_FILTER);

    window.localStorage.setItem(
      'mfe:products:catalog-filter',
      JSON.stringify({ category: 'toys', search: '장난감' }),
    );
    expect(loadCatalogFilter()).toEqual(DEFAULT_PRODUCT_FILTER);
  });

  it('EC-01: 검색어가 50자를 초과하면 Zod 스키마 검증 에러를 반환한다', () => {
    const tooLongSearch = '가'.repeat(51);
    const result = productFilterSchema.safeParse({
      category: 'all',
      search: tooLongSearch,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain('최대 50자');
    }
  });
});
