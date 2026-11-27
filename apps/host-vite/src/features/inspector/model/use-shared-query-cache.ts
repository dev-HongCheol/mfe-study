/**
 * @file use-shared-query-cache.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description TanStack Query v5의 sharedQueryClient.getQueryCache().subscribe() 및 getAll() 공식 API로 공용 캐시 상태를 불변 스냅샷 배열로 관찰하는 커스텀 훅입니다 ([Study 14 § 3.1]).
 */
import { useEffect, useState } from 'react';
import { sharedQueryClient } from 'remote_shared/utils';

/**
 * @description MfeInspector 런타임 탭에서 관찰하는 sharedQueryClient 캐시 항목 스냅샷 인터페이스
 */
export interface SharedQueryCacheEntrySnapshot {
  /** 직렬화된 쿼리 키 문자열 (예: '["cart","user-1"]') */
  queryKeyLabel: string;

  /** 현재 쿼리 데이터 상태 ('pending' | 'error' | 'success') */
  status: 'pending' | 'error' | 'success';

  /** 현재 네트워크 페치 상태 ('fetching' | 'paused' | 'idle') */
  fetchStatus: 'fetching' | 'paused' | 'idle';

  /** 이 쿼리를 현재 구독 중인 활성 옵저버 수 */
  observerCount: number;

  /** 마지막 성공 데이터 갱신 타임스탬프 (ms, 미갱신 시 0) */
  dataUpdatedAt: number;

  /** invalidateQueries로 무효화 도장이 찍혔는지 여부 */
  isInvalidated: boolean;
}

/**
 * sharedQueryClient의 현재 전체 캐시 항목을 읽기 전용 스냅샷 배열로 추출합니다.
 *
 * @returns SharedQueryCacheEntrySnapshot 배열
 */
export function captureSharedQueryCacheSnapshots(): SharedQueryCacheEntrySnapshot[] {
  return sharedQueryClient
    .getQueryCache()
    .getAll()
    .map((query) => ({
      queryKeyLabel: JSON.stringify(query.queryKey),
      status: query.state.status,
      fetchStatus: query.state.fetchStatus,
      observerCount: query.getObserversCount(),
      dataUpdatedAt: query.state.dataUpdatedAt,
      isInvalidated: query.state.isInvalidated,
    }));
}

/**
 * sharedQueryClient의 QueryCache 변화를 실시간으로 구독해 스냅샷 목록을 반환하는 훅입니다.
 *
 * @returns 실시간 SharedQueryCacheEntrySnapshot 배열
 */
export function useSharedQueryCacheSnapshot(): readonly SharedQueryCacheEntrySnapshot[] {
  /** 현재 sharedQueryClient 캐시 스냅샷 목록 상태 */
  const [snapshots, setSnapshots] = useState<SharedQueryCacheEntrySnapshot[]>(() =>
    captureSharedQueryCacheSnapshots(),
  );

  // [Study 14 § 3.1] 공식 queryCache.subscribe()로 쿼리 추가·무효화·갱신 시 스냅샷을 재추출하며 언마운트 시 구독을 해제합니다.
  useEffect(() => {
    const queryCache = sharedQueryClient.getQueryCache();
    const syncSnapshots = () => {
      setSnapshots(captureSharedQueryCacheSnapshots());
    };

    syncSnapshots();
    return queryCache.subscribe(syncSnapshots);
  }, []);

  return snapshots;
}
