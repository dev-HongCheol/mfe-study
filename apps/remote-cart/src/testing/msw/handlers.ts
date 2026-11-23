/**
 * @file handlers.ts
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description MSW v2 기반 장바구니 REST API(GET /api/cart, POST /api/cart, DELETE /api/cart/:id) 모킹 핸들러 및 시드 픽스처입니다.
 */
import { http, HttpResponse } from 'msw';
import type { HostOriginType } from '../stubs/remote-shared-utils';

/**
 * @description MSW 테스트 픽스처용 장바구니 항목 인터페이스 (SSOT § 5.1.2 CartItemView 1:1 정합)
 */
export interface MockCartItem {
  /** 장바구니 항목 고유 ID */
  id: number;

  /** 소유 사용자 ID */
  userId: string;

  /** 상품 고유 ID */
  productId: number;

  /** 상품명 */
  productName: string;

  /** 단가 (원화 정수) */
  price: number;

  /** 상품 카테고리 */
  category: 'electronics' | 'office' | 'accessories';

  /** 담긴 수량 */
  quantity: number;

  /** 담은 호스트 출처 */
  addedFromHost: HostOriginType;

  /** 등록/갱신 시각 */
  createdAt: string;
}

/** 기본 시드 장바구니 데이터 (apps/api-server/sql/02-reset-seed.sql과 일치) */
export const INITIAL_MOCK_CART_ITEMS: readonly MockCartItem[] = [
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
];

/** 테스트 실행 중 가변적으로 변경되는 인메모리 장바구니 저장소 */
let mockCartStore: MockCartItem[] = INITIAL_MOCK_CART_ITEMS.map((item) => ({ ...item }));

/** 다음 장바구니 항목 생성용 자동 증가 ID */
let nextCartItemId = 3;

/**
 * 인메모리 장바구니 모킹 저장소를 초기 시드 상태로 복원합니다.
 */
export function resetMockCartFixtures(): void {
  mockCartStore = INITIAL_MOCK_CART_ITEMS.map((item) => ({ ...item }));
  nextCartItemId = 3;
}

/**
 * 테스트 시나리오에서 외부 앱(remote-products)이 백엔드 DB에 새 상품을 추가한 상황을 모킹합니다.
 *
 * @param item - 추가할 MockCartItem (id 생략 시 자동 부여)
 * @returns 저장된 MockCartItem
 */
export function seedExtraMockCartItem(
  item: Omit<MockCartItem, 'id'> & { id?: number },
): MockCartItem {
  const created: MockCartItem = {
    ...item,
    id: item.id ?? nextCartItemId++,
  };
  mockCartStore.push(created);
  return created;
}

/** 기본 MSW 장바구니 API 핸들러 목록 */
export const cartHandlers = [
  // 1) GET /api/cart?userId=...
  http.get('http://localhost:4000/api/cart', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId')?.trim() ?? '';

    // [분기 설명] userId가 누락된 경우 백엔드와 동일하게 400 VALIDATION_ERROR 반환
    if (!userId) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '조회할 사용자 ID(userId)는 필수입니다.',
          },
        },
        { status: 400 },
      );
    }

    const userItems = mockCartStore.filter((item) => item.userId === userId);
    return HttpResponse.json({
      success: true,
      data: userItems,
    });
  }),

  // 2) POST /api/cart (수량 추가 원자적 UPSERT 모킹)
  http.post('http://localhost:4000/api/cart', async ({ request }) => {
    const body = (await request.json()) as {
      userId?: string;
      productId?: number;
      quantity?: number;
      addedFromHost?: HostOriginType;
    };

    if (!body.userId || !body.productId || !body.quantity || body.quantity < 1) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '장바구니 담기 요청 데이터가 올바르지 않습니다.',
          },
        },
        { status: 400 },
      );
    }

    // [분기 설명] 상품 ID 6번은 품절 시드 상품으로 400 OUT_OF_STOCK 반환
    if (body.productId === 6) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'OUT_OF_STOCK',
            message: '선택하신 상품의 재고가 부족합니다.',
          },
        },
        { status: 400 },
      );
    }

    const existing = mockCartStore.find(
      (item) => item.userId === body.userId && item.productId === body.productId,
    );

    if (existing) {
      existing.quantity += body.quantity;
      existing.addedFromHost = body.addedFromHost ?? 'standalone';
      existing.createdAt = '2026-11-23 15:00:00';
      return HttpResponse.json({
        success: true,
        data: { ...existing },
      });
    }

    const created: MockCartItem = {
      id: nextCartItemId++,
      userId: body.userId,
      productId: body.productId,
      productName: `테스트 상품 #${body.productId}`,
      price: 50000,
      category: 'electronics',
      quantity: body.quantity,
      addedFromHost: body.addedFromHost ?? 'standalone',
      createdAt: '2026-11-23 15:00:00',
    };
    mockCartStore.push(created);

    return HttpResponse.json({
      success: true,
      data: created,
    });
  }),

  // 3) DELETE /api/cart/:id?userId=...
  http.delete('http://localhost:4000/api/cart/:id', ({ params, request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId')?.trim() ?? '';
    const rawId = String(params.id ?? '');

    if (!userId) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '사용자 ID(userId)가 필요합니다.',
          },
        },
        { status: 400 },
      );
    }

    // [분기 설명] targetId === 'all'이면 해당 유저의 장바구니를 전체 비우기 처리합니다.
    if (rawId === 'all') {
      const beforeCount = mockCartStore.length;
      mockCartStore = mockCartStore.filter((item) => item.userId !== userId);
      const deletedCount = beforeCount - mockCartStore.length;
      return HttpResponse.json({
        success: true,
        data: {
          deletedId: 'all',
          deletedCount,
        },
      });
    }

    const numericId = Number(rawId);
    const targetIdx = mockCartStore.findIndex(
      (item) => item.id === numericId && item.userId === userId,
    );

    if (targetIdx === -1) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: `삭제할 장바구니 항목(ID: ${rawId})을 찾을 수 없습니다.`,
          },
        },
        { status: 404 },
      );
    }

    mockCartStore.splice(targetIdx, 1);
    return HttpResponse.json({
      success: true,
      data: {
        deletedId: numericId,
        deletedCount: 1,
      },
    });
  }),
];
