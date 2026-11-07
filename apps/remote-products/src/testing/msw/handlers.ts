/**
 * @file handlers.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description MSW v2 기반 GET /api/products 및 POST /api/cart 표준 응답 봉투 모킹 핸들러입니다.
 */
import { http, HttpResponse } from 'msw';

/**
 * @description 테스트 픽스처용 상품 엔티티 인터페이스
 */
export interface MockProductFixture {
  /** 상품 고유 ID */
  id: number;
  /** 상품명 */
  name: string;
  /** 원화 정수 가격 */
  price: number;
  /** 상품 카테고리 */
  category: 'electronics' | 'office' | 'accessories';
  /** 남은 재고 수량 */
  stock: number;
  /** 상품 설명 */
  description: string;
  /** 등록 시각 */
  createdAt: string;
}

/** 백엔드 02-reset-seed.sql과 1:1 일치하는 6종 상품 시드 픽스처 */
export const MOCK_PRODUCTS_SEED: readonly MockProductFixture[] = [
  {
    id: 1,
    name: '기계식 무선 키보드 Pro',
    price: 129000,
    category: 'electronics',
    stock: 15,
    description: '로우 프로파일 적축 스위치와 멀티 페어링을 지원하는 개발자용 무선 키보드',
    createdAt: '2026-10-31T09:00:00.000Z',
  },
  {
    id: 2,
    name: '초경량 버티컬 마우스 Air',
    price: 68000,
    category: 'electronics',
    stock: 20,
    description: '손목 터널 증후군 예방을 위한 57도 인체공학 수직형 무선 마우스',
    createdAt: '2026-10-31T09:05:00.000Z',
  },
  {
    id: 3,
    name: '4K UHD 데스크 모니터 27인치',
    price: 389000,
    category: 'electronics',
    stock: 8,
    description: 'USB-C PD 65W 충전과 눈부심 방지 패널을 탑재한 코딩 특화 모니터',
    createdAt: '2026-10-31T09:10:00.000Z',
  },
  {
    id: 4,
    name: '모션 데스크 스탠딩 책상',
    price: 450000,
    category: 'office',
    stock: 5,
    description: '듀얼 모터 높이 조절과 4단계 메모리 프리셋을 제공하는 전동 데스크',
    createdAt: '2026-10-31T09:15:00.000Z',
  },
  {
    id: 5,
    name: '알루미늄 노트북 거치대 Stand',
    price: 42000,
    category: 'accessories',
    stock: 30,
    description: '발열 해소 통풍구와 6단 각도 조절이 가능한 고강도 알루미늄 스탠드',
    createdAt: '2026-10-31T09:20:00.000Z',
  },
  {
    id: 6,
    name: '한정판 코딩 장패드 XL (품절)',
    price: 25000,
    category: 'accessories',
    stock: 0,
    description: '단축키 치트시트가 각인된 방수 패브릭 데스크 매트 (재고 소진 테스트용)',
    createdAt: '2026-10-31T09:25:00.000Z',
  },
] as const;

/** 기본 MSW HTTP 핸들러 목록 */
export const handlers = [
  http.get('http://localhost:4000/api/products', ({ request }) => {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const search = url.searchParams.get('search')?.trim().toLowerCase() ?? '';

    const filtered = MOCK_PRODUCTS_SEED.filter((item) => {
      // [분기 설명] 특정 카테고리가 지정된 경우 일치하는 상품만 필터링합니다.
      if (category && item.category !== category) {
        return false;
      }
      // [분기 설명] 검색어가 지정된 경우 상품명 또는 설명에 부분 일치하는지 확인합니다.
      if (search) {
        const matchesName = item.name.toLowerCase().includes(search);
        const matchesDesc = item.description.toLowerCase().includes(search);
        return matchesName || matchesDesc;
      }
      return true;
    });

    return HttpResponse.json({
      success: true,
      data: filtered,
    });
  }),

  http.post('http://localhost:4000/api/cart', async ({ request }) => {
    const body = (await request.json()) as {
      userId: string;
      productId: number;
      quantity: number;
      addedFromHost: 'vite' | 'rspack' | 'standalone';
    };

    const targetProduct = MOCK_PRODUCTS_SEED.find((p) => p.id === body.productId);

    // [분기 설명] 존재하지 않는 상품 ID 요청 시 404 NOT_FOUND 에러 봉투를 반환합니다.
    if (!targetProduct) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '요청하신 상품을 찾을 수 없습니다.',
          },
        },
        { status: 404 },
      );
    }

    // [분기 설명] 재고가 0개이거나 요청 수량보다 부족할 때 400 OUT_OF_STOCK 에러 봉투를 반환합니다.
    if (targetProduct.stock < body.quantity || targetProduct.stock === 0) {
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

    return HttpResponse.json(
      {
        success: true,
        data: {
          id: 101,
          userId: body.userId,
          productId: targetProduct.id,
          productName: targetProduct.name,
          price: targetProduct.price,
          category: targetProduct.category,
          quantity: body.quantity,
          addedFromHost: body.addedFromHost,
          createdAt: '2026-11-07T07:00:00.000Z',
        },
      },
      { status: 201 },
    );
  }),
];
