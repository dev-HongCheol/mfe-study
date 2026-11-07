/**
 * @file catalog-schema.ts
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed true (types via ./ProductList)
 * @description 상품 카탈로그 도메인 엔티티, 필터 스키마(Zod), 노출 컴포넌트 Props 계약 및 createScopedStorage('products') 영속화 도우미입니다 ([Study 04 #10, Study 05 #10]).
 */
import type { CartUpdatedEventPayload, HostOriginType, SyncMode } from 'remote_shared/utils';
import { createScopedStorage } from 'remote_shared/utils';
import { z } from 'zod';

/** 상품 카테고리 유니온 타입 */
export type ProductCategory = 'electronics' | 'office' | 'accessories';

/** 상품 카테고리 필터 유니온 타입 ('all' 전체 보기 포함) */
export type ProductCategoryFilter = 'all' | ProductCategory;

/**
 * @description 상품 엔티티 인터페이스 (루트 SSOT § 5.1.2 ProductEntity 계약 준수)
 */
export interface ProductEntity {
  /** 상품 고유 식별자 (INTEGER PK) */
  id: number;

  /** 상품 표시 이름 */
  name: string;

  /** 원화 정수 가격 (부동소수점 오차 방지를 위한 원 단위 정수) */
  price: number;

  /** 상품 카테고리 구분 ('electronics' | 'office' | 'accessories') */
  category: ProductCategory;

  /** 현재 남은 재고 수량 (0이면 품절 상태) */
  stock: number;

  /** 상품 상세 설명 문구 */
  description: string;

  /** 등록 일시 (ISO-8601 문자열) */
  createdAt: string;
}

/**
 * @description 장바구니 항목 뷰 인터페이스 (루트 SSOT § 5.1.2 CartItemView 계약 준수)
 */
export interface CartItemView {
  /** 장바구니 항목 고유 식별자 */
  id: number;

  /** 소유 사용자 ID */
  userId: string;

  /** 참조 상품 ID */
  productId: number;

  /** 조인된 상품명 */
  productName: string;

  /** 조인된 상품 단가 (원화 정수) */
  price: number;

  /** 조인된 상품 카테고리 */
  category: ProductCategory;

  /** 담긴 수량 (1 ~ 99) */
  quantity: number;

  /** 상품을 담은 호스트 출처 ('vite' | 'rspack' | 'standalone') */
  addedFromHost: HostOriginType;

  /** 최초 추가 일시 */
  createdAt: string;
}

/** 단일 상품 엔티티 런타임 검증용 Zod 스키마 */
export const productEntitySchema: z.ZodType<ProductEntity> = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  price: z.number().int().nonnegative(),
  category: z.enum(['electronics', 'office', 'accessories']),
  stock: z.number().int().nonnegative(),
  description: z.string(),
  createdAt: z.string(),
});

/** 상품 목록 배열 런타임 검증용 Zod 스키마 */
export const productEntityListSchema: z.ZodType<ProductEntity[]> = z.array(productEntitySchema);

/** 장바구니 추가 응답(CartItemView) 런타임 검증용 Zod 스키마 */
export const cartItemViewSchema: z.ZodType<CartItemView> = z.object({
  id: z.number().int().positive(),
  userId: z.string().min(1),
  productId: z.number().int().positive(),
  productName: z.string().min(1),
  price: z.number().int().nonnegative(),
  category: z.enum(['electronics', 'office', 'accessories']),
  quantity: z.number().int().min(1).max(99),
  addedFromHost: z.enum(['vite', 'rspack', 'standalone']),
  createdAt: z.string(),
});

/**
 * @description 상품 카탈로그 필터 바 상태 인터페이스
 */
export interface ProductFilterValues {
  /** 선택된 카테고리 필터 ('all' | 'electronics' | 'office' | 'accessories') */
  category: ProductCategoryFilter;

  /** 상품명·설명 부분 일치 검색 키워드 (양끝 공백 제거, 최대 50자) */
  search: string;
}

/** 상품 카탈로그 필터 폼 및 스토리지 검증용 Zod 스키마 */
export const productFilterSchema: z.ZodType<ProductFilterValues> = z.object({
  category: z.enum(['all', 'electronics', 'office', 'accessories']),
  search: z.string().trim().max(50, '검색어는 최대 50자까지 입력할 수 있습니다.'),
});

/** 카탈로그 필터 초기 기본값 상수 */
export const DEFAULT_PRODUCT_FILTER: ProductFilterValues = {
  category: 'all',
  search: '',
};

/** 카테고리 코드별 한글 표시 라벨 매핑 상수 */
export const CATEGORY_LABELS: Record<ProductCategoryFilter, string> = {
  all: '전체 카테고리',
  electronics: '전자기기 (Electronics)',
  office: '오피스 가구 (Office)',
  accessories: '데스크 액세서리 (Accessories)',
};

/**
 * @description remote_products/ProductList 노출 컴포넌트 Props 인터페이스 (루트 SSOT § 5.4.2 계약 준수)
 */
export interface ProductListProps {
  /** 현재 로그인된 사용자 고유 ID (기본값: 'user-1') */
  userId?: string;

  /** 이 컴포넌트를 마운트한 상위 호스트 종류 (기본값: 'standalone') */
  hostType?: HostOriginType;

  /** 상태 동기화 아키텍처 비교 모드 (기본값: 'mode-a-event') */
  syncMode?: SyncMode;

  /** 1.5초 네트워크 로딩 지연(Skeleton UI 확인) 시뮬레이션 활성화 여부 (기본값: false) */
  simulateDelay?: boolean;

  /** 로딩 지연 시뮬레이션 시간(ms) 오버라이드 (테스트 가속용, 기본값: 1500) */
  delayMs?: number;

  /** 백엔드 API 기본 URL 오버라이드 (런타임 환경 주입용, 기본값: 'http://localhost:4000/api') */
  apiBaseUrl?: string;

  /** 장바구니 담기 완료 시 상위 호스트에 알리는 선택적 콜백 함수 */
  onCartAdded?: (payload: CartUpdatedEventPayload) => void;
}

/** products 서비스 전용 격리 로컬 스토리지 인스턴스 (mfe:products:*) */
export const productsScopedStorage = createScopedStorage('products');

/** 로컬 스토리지 내 카탈로그 필터 저장 키 이름 상수 */
export const CATALOG_FILTER_STORAGE_KEY = 'catalog-filter';

/**
 * 로컬 스토리지(mfe:products:catalog-filter)에서 저장된 필터 값을 안전하게 불러옵니다.
 *
 * @returns 검증된 ProductFilterValues (오염 또는 미존재 시 DEFAULT_PRODUCT_FILTER 반환)
 */
export function loadCatalogFilter(): ProductFilterValues {
  return productsScopedStorage.getItem(
    CATALOG_FILTER_STORAGE_KEY,
    productFilterSchema,
    DEFAULT_PRODUCT_FILTER,
  );
}

/**
 * 현재 카탈로그 필터 상태를 로컬 스토리지(mfe:products:catalog-filter)에 저장합니다.
 *
 * @param filter - 저장할 필터 값 객체
 * @returns 없음
 */
export function saveCatalogFilter(filter: ProductFilterValues): void {
  const parsed = productFilterSchema.safeParse(filter);
  // [분기 설명] 유효한 스키마를 통과한 필터 값만 로컬 스토리지에 기록하여 오염을 방지합니다.
  if (parsed.success) {
    productsScopedStorage.setItem(CATALOG_FILTER_STORAGE_KEY, parsed.data);
  }
}

/**
 * 로컬 스토리지에 저장된 카탈로그 필터를 기본값으로 초기화합니다.
 *
 * @returns 초기화된 기본 필터 객체
 */
export function resetCatalogFilter(): ProductFilterValues {
  productsScopedStorage.removeItem(CATALOG_FILTER_STORAGE_KEY);
  return { ...DEFAULT_PRODUCT_FILTER };
}
