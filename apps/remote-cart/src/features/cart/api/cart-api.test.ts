/**
 * @file cart-api.test.ts
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description [TC-02] GET /api/cart, POST /api/cart, DELETE /api/cart/:id HTTP 호출, Zod 언래핑 및 AbortSignal 지연 취소 단위 테스트입니다.
 */
import { describe, expect, it } from 'vitest';
import {
  delayWithSignal,
  deleteCartItemApi,
  fetchCartItems,
  postIncrementCartItem,
} from './cart-api';

describe('cart-api (TC-02)', () => {
  it('TC-02: fetchCartItems는 지정 사용자의 장바구니 항목 배열을 Zod 검증 후 언래핑 반환한다', async () => {
    const items = await fetchCartItems({ userId: 'user-1' });

    expect(items).toHaveLength(2);
    expect(items[0]?.productName).toBe('기계식 무선 키보드 Pro');
    expect(items[0]?.createdAt).toBeTruthy();
  });

  it('TC-02: postIncrementCartItem은 POST /api/cart를 호출해 수량이 누적된 항목을 반환한다', async () => {
    const updated = await postIncrementCartItem({
      userId: 'user-1',
      productId: 1,
      quantity: 1,
      addedFromHost: 'rspack',
    });

    expect(updated.productId).toBe(1);
    expect(updated.quantity).toBe(2);
    expect(updated.addedFromHost).toBe('rspack');
  });

  it('TC-02: deleteCartItemApi는 단건 삭제(id)와 전체 비우기(all) 응답을 정확히 언래핑한다', async () => {
    const singleResult = await deleteCartItemApi({ targetId: 1, userId: 'user-1' });
    expect(singleResult).toEqual({ deletedId: 1, deletedCount: 1 });

    const allResult = await deleteCartItemApi({ targetId: 'all', userId: 'user-1' });
    expect(allResult).toEqual({ deletedId: 'all', deletedCount: 1 });
  });

  it('TC-02: delayWithSignal은 대기 중 AbortController.abort() 호출 시 즉시 타이머를 해제하고 AbortError로 거부한다', async () => {
    const controller = new AbortController();
    const delayPromise = delayWithSignal(1500, controller.signal);

    controller.abort();

    await expect(delayPromise).rejects.toMatchObject({ name: 'AbortError' });
  });
});
