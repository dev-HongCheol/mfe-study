/**
 * @file ProductFilterBar.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description remote_shared/ui의 Select·Button과 React Hook Form + Zod를 결합한 상품 카테고리·키워드 검색 필터 바 컴포넌트입니다 ([Study 05 #10, #15]).
 */
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Badge, Button, Flex, Select, type SelectOptionItem } from 'remote_shared/ui';
import {
  CATEGORY_LABELS,
  type ProductCategoryFilter,
  type ProductFilterValues,
  productFilterSchema,
} from '../model/catalog-schema.js';

/** 카테고리 드롭다운 선택 옵션 목록 상수 */
const CATEGORY_SELECT_OPTIONS: SelectOptionItem[] = [
  { value: 'all', label: CATEGORY_LABELS.all },
  { value: 'electronics', label: CATEGORY_LABELS.electronics },
  { value: 'office', label: CATEGORY_LABELS.office },
  { value: 'accessories', label: CATEGORY_LABELS.accessories },
];

/**
 * @description ProductFilterBar 컴포넌트 Props 인터페이스
 */
export interface ProductFilterBarProps {
  /** 현재 적용된 카테고리 및 검색어 필터 상태 */
  filter: ProductFilterValues;

  /** 현재 조회된 상품 총 개수 (결과 배지 표시용) */
  totalCount: number;

  /** 필터 변경 시 상위 카탈로그 뷰에 알리는 콜백 함수 */
  onFilterChange: (nextFilter: ProductFilterValues) => void;

  /** 필터 초기화 버튼 클릭 시 호출되는 콜백 함수 */
  onReset: () => void;
}

/**
 * 상품 카테고리 선택(Select) 및 키워드 검색 폼(React Hook Form + Zod)을 렌더링하는 컴포넌트입니다.
 *
 * @param props - 현재 필터 상태, 총 상품 수 및 변경·초기화 핸들러
 * @returns 필터 바 JSX 엘리먼트
 */
export function ProductFilterBar({
  filter,
  totalCount,
  onFilterChange,
  onReset,
}: ProductFilterBarProps) {
  /** 검색어 입력 및 Zod 유효성 검증을 관리하는 React Hook Form 인스턴스 */
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFilterValues>({
    resolver: zodResolver(productFilterSchema),
    defaultValues: filter,
  });

  // 상위에서 필터 초기화 등으로 filter 값이 바뀌면 폼 입력값도 동기화합니다.
  useEffect(() => {
    reset(filter);
  }, [filter, reset]);

  /**
   * 카테고리 Select 변경 시 즉시 필터를 갱신합니다.
   *
   * @param nextCategory - 선택된 카테고리 문자열
   */
  const handleCategoryChange = (nextCategory: string) => {
    const parsed = productFilterSchema.safeParse({
      category: nextCategory as ProductCategoryFilter,
      search: filter.search,
    });
    // [분기 설명] 유효한 카테고리 값일 때만 상위 필터 상태를 즉시 업데이트합니다.
    if (parsed.success) {
      onFilterChange(parsed.data);
    }
  };

  /**
   * 검색어 폼 제출이 Zod 검증을 통과했을 때 호출됩니다.
   *
   * @param values - 검증 및 trim 완료된 필터 값
   */
  const onSubmitSearch = (values: ProductFilterValues) => {
    onFilterChange({
      category: filter.category,
      search: values.search,
    });
  };

  /**
   * 필터 초기화 버튼 클릭 시 폼과 상위 상태를 모두 기본값으로 되돌립니다.
   */
  const handleResetClick = () => {
    reset({ category: 'all', search: '' });
    onReset();
  };

  return (
    <div className="prod-filter-bar">
      <Flex justify="between" align="center" gap="md" wrap="wrap">
        <Flex align="center" gap="sm" wrap="wrap">
          <Select
            ariaLabel="상품 카테고리 선택"
            options={CATEGORY_SELECT_OPTIONS}
            value={filter.category}
            onChange={handleCategoryChange}
          />
          <Badge tone="brand" className="prod-count-num">
            조회 결과 {totalCount}건
          </Badge>
        </Flex>

        <form
          className="prod-search-form"
          onSubmit={handleSubmit(onSubmitSearch)}
          noValidate={true}
        >
          <div className="prod-search-input-wrap">
            <input
              type="search"
              aria-label="상품 검색어 입력"
              placeholder="상품명 또는 설명 키워드 검색 (최대 50자)"
              className="prod-search-input"
              {...register('search')}
            />
            {errors.search?.message ? (
              <span role="alert" className="prod-field-error">
                {errors.search.message}
              </span>
            ) : null}
          </div>

          <Button type="submit" variant="primary" size="md">
            검색
          </Button>
          <Button type="button" variant="secondary" size="md" onClick={handleResetClick}>
            필터 초기화
          </Button>
        </form>
      </Flex>
    </div>
  );
}
