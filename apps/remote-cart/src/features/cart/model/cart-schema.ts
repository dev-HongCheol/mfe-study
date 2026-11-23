/**
 * @file cart-schema.ts
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description 장바구니 도메인 엔티티 Zod 스키마, 비인증 방어 정규화, 파생 합계 정수 연산 및 DEV/PROD 환경별 에러 리포트 이원화 유틸리티입니다 ([Study 05 #03, #04, #10]).
 */
import { sumBy } from 'es-toolkit';
import type { HostOriginType, NormalizedError } from 'remote_shared/utils';
import { ZodError, z } from 'zod';

/**
 * @description 단일 장바구니 조인 뷰 항목 인터페이스 (루트 SSOT § 5.1.2 CartItemView 1:1 정합)
 */
export interface CartItemView {
  /** 장바구니 항목 고유 번호 (PK) */
  id: number;

  /** 장바구니 소유 사용자 ID */
  userId: string;

  /** 담긴 상품 고유 번호 */
  productId: number;

  /** INNER JOIN으로 조회된 상품명 */
  productName: string;

  /** 상품 단가 (원화 정수) */
  price: number;

  /** 상품 카테고리 구분 */
  category: 'electronics' | 'office' | 'accessories';

  /** 담긴 수량 (1 이상의 정수) */
  quantity: number;

  /** 이 상품을 장바구니에 담은 호스트 출처 */
  addedFromHost: HostOriginType;

  /** 장바구니 등록 또는 최근 수량 갱신 시각 */
  createdAt: string;
}

/**
 * @description DELETE /api/cart/:id 삭제 응답 인터페이스 (루트 SSOT § 5.1.3 #8)
 */
export interface DeleteCartResult {
  /** 삭제된 장바구니 항목 ID 또는 전체 비우기 키워드('all') */
  deletedId: number | 'all';

  /** 실제 삭제된 행 개수 */
  deletedCount: number;
}

/**
 * @description 장바구니 항목 배열로부터 렌더링 중 즉시 계산되는 파생 요약 인터페이스
 */
export interface CartTotalsSummary {
  /** 장바구니에 담긴 고유 상품 종류 개수 */
  itemCount: number;

  /** 모든 상품의 수량 합계 (정수) */
  totalQuantity: number;

  /** 모든 상품의 원화 총금액 합계 (정수) */
  totalPrice: number;
}

/**
 * @description Zod 스키마 검증 실패 시 개별 필드 불일치 좌표 인터페이스 (Study 05 #10)
 */
export interface CartSchemaIssueDetail {
  /** 실패한 데이터 경로 문자열 (예: '[0].createdAt') */
  path: string;

  /** Zod 이슈 코드 (예: 'invalid_type') */
  code: string;

  /** 상세 실패 사유 메시지 */
  message: string;
}

/**
 * @description 실행 환경(DEV vs PROD)별로 이원화된 장바구니 에러 리포트 인터페이스 (Study 05 #10)
 */
export interface CartErrorReport {
  /** 표준 에러 코드 */
  code: string;

  /** 사용자 표시용 안내 메시지 */
  userMessage: string;

  /** 개발 환경(DEV)에서만 노출되는 스키마 불일치 필드 목록 (PROD에서는 빈 배열) */
  devDetails: CartSchemaIssueDetail[];
}

/** 상품 카테고리 한글 라벨 매핑 상수 */
export const CART_CATEGORY_LABELS: Readonly<Record<CartItemView['category'], string>> = {
  electronics: '전자기기',
  office: '오피스',
  accessories: '액세서리',
};

/** 호스트 출처별 표시 배지 라벨 매핑 상수 */
export const HOST_ORIGIN_LABELS: Readonly<Record<HostOriginType, string>> = {
  vite: 'Host: Vite',
  rspack: 'Host: Rspack',
  standalone: 'Standalone',
};

/** 단일 장바구니 조인 뷰 항목 런타임 검증용 Zod 스키마 */
export const cartItemViewSchema: z.ZodType<CartItemView> = z.object({
  id: z.number().int().positive(),
  userId: z.string().min(1),
  productId: z.number().int().positive(),
  productName: z.string().min(1),
  price: z.number().int().nonnegative(),
  category: z.enum(['electronics', 'office', 'accessories']),
  quantity: z.number().int().positive(),
  addedFromHost: z.enum(['vite', 'rspack', 'standalone']),
  createdAt: z.string().min(1),
});

/** 장바구니 목록 조회(GET /api/cart) 응답 배열 검증용 Zod 스키마 */
export const cartItemListSchema: z.ZodType<CartItemView[]> = z.array(cartItemViewSchema);

/** 장바구니 삭제(DELETE /api/cart/:id) 응답 검증용 Zod 스키마 */
export const deleteCartResultSchema: z.ZodType<DeleteCartResult> = z.object({
  deletedId: z.union([z.number().int().positive(), z.literal('all')]),
  deletedCount: z.number().int().nonnegative(),
});

/**
 * Props 또는 이벤트로 전달된 사용자 ID를 정규화합니다.
 * 미전달·null·공백 문자열인 경우 임의 유저로 절대 폴백하지 않고 null을 반환합니다 ([SSOT § 5.4.3]).
 *
 * @param rawUserId - 원본 사용자 ID
 * @returns 공백 제거된 유효 사용자 ID 또는 null
 */
export function normalizeUserId(rawUserId?: string | null): string | null {
  // [분기 설명] 문자열이 아니거나 trim 결과가 비어 있으면 비로그인(null) 상태로 엄격 판정합니다.
  if (typeof rawUserId !== 'string') {
    return null;
  }
  const trimmed = rawUserId.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 장바구니 항목 배열에서 총 품목 수, 총 수량, 원화 총액을 정수 연산으로 산출합니다 ([Study 05 #03, #04]).
 *
 * @param items - 장바구니 항목 목록
 * @returns 파생 합계 요약 객체
 */
export function calculateCartTotals(
  items: ReadonlyArray<{ price: number; quantity: number }>,
): CartTotalsSummary {
  const itemCount = items.length;
  const totalQuantity = sumBy(items, (item) => Math.max(0, Math.round(item.quantity)));
  const totalPrice = sumBy(
    items,
    (item) => Math.max(0, Math.round(item.price)) * Math.max(0, Math.round(item.quantity)),
  );

  return {
    itemCount,
    totalQuantity,
    totalPrice,
  };
}

/**
 * ZodError의 path 배열을 읽기 쉬운 경로 문자열(예: '[0].createdAt')로 변환합니다.
 *
 * @param pathSegments - Zod 이슈의 path 세그먼트 배열
 * @returns 포맷된 필드 경로 문자열
 */
function formatZodPath(pathSegments: ReadonlyArray<string | number>): string {
  if (pathSegments.length === 0) {
    return '(root)';
  }
  return pathSegments
    .map((segment, index) => {
      // [분기 설명] 숫자 인덱스는 배열 표기('[0]')로, 문자열 키는 점 표기('.field')로 결합합니다.
      if (typeof segment === 'number') {
        return `[${segment}]`;
      }
      return index === 0 ? segment : `.${segment}`;
    })
    .join('');
}

/**
 * 알 수 없는 원본 에러에서 Zod 스키마 불일치 좌표 목록을 추출합니다 ([Study 05 #10]).
 *
 * @param originalError - NormalizedError.originalError 값
 * @returns 추출된 CartSchemaIssueDetail 배열
 */
export function extractCartSchemaIssues(originalError: unknown): CartSchemaIssueDetail[] {
  // [분기 설명] ZodError 인스턴스이거나 직렬화된 issues 배열을 가진 객체만 안전하게 파싱합니다.
  if (originalError instanceof ZodError) {
    return originalError.issues.map((issue) => ({
      path: formatZodPath(issue.path),
      code: issue.code,
      message: issue.message,
    }));
  }

  if (
    typeof originalError === 'object' &&
    originalError !== null &&
    'issues' in originalError &&
    Array.isArray((originalError as { issues?: unknown }).issues)
  ) {
    const rawIssues = (
      originalError as {
        issues: Array<{ path?: Array<string | number>; code?: string; message?: string }>;
      }
    ).issues;
    return rawIssues.map((issue) => ({
      path: formatZodPath(Array.isArray(issue.path) ? issue.path : []),
      code: typeof issue.code === 'string' ? issue.code : 'invalid_type',
      message: typeof issue.message === 'string' ? issue.message : '스키마 검증에 실패했습니다.',
    }));
  }

  return [];
}

/**
 * 정규화된 에러를 실행 환경(DEV vs PROD)에 따라 이원화된 리포트로 변환합니다 ([Study 05 #10]).
 *
 * @param error - remote_shared/utils의 normalizeError로 변환된 표준 에러 객체
 * @param isDev - 개발 환경 여부 (기본값: import.meta.env.DEV)
 * @returns 환경별 CartErrorReport 객체
 */
export function formatCartErrorReport(
  error: NormalizedError,
  isDev: boolean = Boolean(import.meta.env?.DEV),
): CartErrorReport {
  const isSchemaInvalid = error.code === 'RESPONSE_SCHEMA_INVALID';

  // [분기 설명] 운영 환경(PROD)에서는 내부 DB·스키마 필드명이 노출되지 않도록 devDetails를 빈 배열로 격리합니다.
  if (!isDev) {
    return {
      code: error.code,
      userMessage: isSchemaInvalid
        ? '일시적인 데이터 형식 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
        : error.message,
      devDetails: [],
    };
  }

  return {
    code: error.code,
    userMessage: error.message,
    devDetails: isSchemaInvalid ? extractCartSchemaIssues(error.originalError) : [],
  };
}
