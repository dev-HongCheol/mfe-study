/**
 * @file catalog-api.test.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description [TC-02] fetchProducts, postAddToCart API 호출 및 AbortSignal 지연 취소 단위 테스트입니다.
 */
import { describe, expect, it } from 'vitest';
import { delayWithSignal, fetchProducts, postAddToCart } from './catalog-api.js';

describe('catalog-api (TC-02)', () => {
  it('TC-02: fetchProducts는 카테고리 및 검색어 쿼리로 상품을 필터링하고 표준 응답 봉투를 언래핑한다', async () => {
    const products = await fetchProducts({
      category: 'electronics',
      search: '키보드',
    });

    expect(products).toHaveLength(1);
    expect(products[0]?.name).toBe('기계식 무선 키보드 Pro');
    expect(products[0]?.price).toBe(129000);
  });

  it('TC-02: postAddToCart는 POST /api/cart 요청을 전송하고 추가된 장바구니 항목(CartItemView)을 반환한다', async () => {
    const addedItem = await postAddToCart({
      userId: 'user-1',
      productId: 1,
      quantity: 2,
      addedFromHost: 'standalone',
    });

    expect(addedItem.userId).toBe('user-1');
    expect(addedItem.productId).toBe(1);
    expect(addedItem.productName).toBe('기계식 무선 키보드 Pro');
    expect(addedItem.quantity).toBe(2);
    expect(addedItem.addedFromHost).toBe('standalone');
  });

  it('TC-02: delayWithSignal 진행 도중 AbortController.abort()가 호출되면 즉시 AbortError로 중단된다', async () => {
    const controller = new AbortController();
    const promise = delayWithSignal(1500, controller.signal);

    setTimeout(() => {
      controller.abort();
    }, 20);

    await expect(promise).rejects.toThrow();
  });
});
