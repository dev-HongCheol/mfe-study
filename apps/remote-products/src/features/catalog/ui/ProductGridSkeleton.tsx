/**
 * @file ProductGridSkeleton.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description 1.5초 지연 로딩 시뮬레이션 시 실제 상품 카드 그리드(min-height: 240px)와 1:1 매칭되어 CLS(화면 덜컥거림)를 방지하는 스켈레톤 컴포넌트입니다 ([Study 05 #13]).
 */
import { Card, Grid, Skeleton, Stack } from 'remote_shared/ui';

/** 기본 스켈레톤 카드 렌더링 개수 상수 (시드 상품 6종과 동일) */
const DEFAULT_SKELETON_CARD_COUNT = 6;

/**
 * @description ProductGridSkeleton 컴포넌트 Props 인터페이스
 */
export interface ProductGridSkeletonProps {
  /** 표시할 스켈레톤 카드 개수 (기본값: 6) */
  count?: number;
}

/**
 * 상품 목록 로딩 중에 실제 카드 그리드와 동일한 규격의 스켈레톤 레이아웃을 렌더링합니다.
 *
 * @param props - 스켈레톤 카드 개수 설정
 * @returns 6-카드 스켈레톤 그리드 JSX 엘리먼트
 */
export function ProductGridSkeleton({
  count = DEFAULT_SKELETON_CARD_COUNT,
}: ProductGridSkeletonProps) {
  /** 렌더링할 스켈레톤 인덱스 배열 */
  const skeletonIndices = Array.from({ length: Math.max(1, count) }, (_, idx) => idx);

  return (
    <Grid columns={3} gap="md" data-testid="product-grid-skeleton" aria-busy="true">
      {skeletonIndices.map((idx) => (
        <Card key={idx} padding="md" className="prod-skeleton-card">
          <Stack gap="sm">
            <Skeleton variant="text" width="45%" height="1.25rem" />
            <Skeleton variant="text" width="85%" height="1.5rem" />
            <Skeleton variant="rect" width="100%" height="3rem" />
          </Stack>
          <Stack gap="sm">
            <Skeleton variant="text" width="50%" height="1.25rem" />
            <Skeleton variant="rect" width="100%" height="2.25rem" />
          </Stack>
        </Card>
      ))}
    </Grid>
  );
}
