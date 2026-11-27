/**
 * @file RuntimeStatusTab.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description MfeInspector의 2번째 탭으로 연결된 원격 앱 3종 메타 카드(RemoteModuleDescriptor[])와 sharedQueryClient 실시간 캐시 테이블(SharedQueryCacheEntrySnapshot[])을 렌더링하는 컴포넌트입니다 ([Study 14 § 3]).
 */
import { Badge, Flex, Heading, Stack } from 'remote_shared/ui';
import { type SyncMode, formatDate } from 'remote_shared/utils';
import {
  HOST_REMOTE_DESCRIPTORS,
  HOST_SHARED_SINGLETONS,
} from '../../dashboard/model/host-remotes';
import type { SharedQueryCacheEntrySnapshot } from '../model/use-shared-query-cache';

/**
 * @description RuntimeStatusTab 컴포넌트 Props 인터페이스
 */
export interface RuntimeStatusTabProps {
  /** 현재 활성 상태 동기화 모드 */
  syncMode: SyncMode;

  /** host-vite 인스턴스의 고유 이벤트 발신자 ID */
  hostSourceId: string;

  /** sharedQueryClient 실시간 캐시 스냅샷 배열 */
  cacheEntries: readonly SharedQueryCacheEntrySnapshot[];
}

/**
 * 연결된 3대 리모트 메타 정보, 싱글톤 공유 의존성 목록, sharedQueryClient 실시간 캐시 상태를 표시하는 탭 컴포넌트입니다.
 *
 * @param props - 활성 동기화 모드, 호스트 sourceId, 공용 캐시 스냅샷 목록
 * @returns 런타임 · 캐시 상태 탭 엘리먼트
 */
export function RuntimeStatusTab({ syncMode, hostSourceId, cacheEntries }: RuntimeStatusTabProps) {
  return (
    <Stack gap="md">
      <Stack gap="sm">
        <Flex justify="between" align="center" gap="sm" wrap="wrap">
          <Heading level={4}>연결된 원격 마이크로 앱 (3종)</Heading>
          <Badge tone="neutral">Host sourceId: {hostSourceId}</Badge>
        </Flex>

        <div className="host-runtime-grid">
          {HOST_REMOTE_DESCRIPTORS.map((remote) => (
            <article key={remote.remoteName} className="host-remote-meta-card">
              <Flex justify="between" align="center" gap="xs">
                <p className="host-remote-meta-title">{remote.remoteName}</p>
                <Badge tone="brand">:{remote.port}</Badge>
              </Flex>
              <p className="host-remote-meta-line">{remote.label}</p>
              <p className="host-remote-meta-line">{remote.bundlerLabel}</p>
              <p className="host-remote-meta-line">소비 경로: {remote.consumedPaths.join(', ')}</p>
            </article>
          ))}
        </div>

        <Flex align="center" gap="xs" wrap="wrap">
          <Badge tone="success">Shared Singletons (6종)</Badge>
          {HOST_SHARED_SINGLETONS.map((pkgLabel) => (
            <Badge key={pkgLabel} tone="neutral">
              {pkgLabel}
            </Badge>
          ))}
        </Flex>
      </Stack>

      <Stack gap="sm">
        <Flex justify="between" align="center" gap="sm" wrap="wrap">
          <Heading level={4}>
            sharedQueryClient 실시간 캐시 스냅샷 ({cacheEntries.length}건)
          </Heading>
          <Badge tone={syncMode === 'mode-b-query' ? 'success' : 'warning'}>
            {syncMode === 'mode-b-query'
              ? 'Mode B 활성 — 공용 캐시 직접 공유 중'
              : 'Mode A 활성 — 각 리모트가 독립 캐시 사용 중'}
          </Badge>
        </Flex>

        {cacheEntries.length === 0 ? (
          <p className="host-empty-message">
            현재 sharedQueryClient 공용 캐시가 비어 있습니다. Mode B로 전환하고 로그인하면 장바구니
            쿼리 캐시가 이곳에 실시간으로 표시됩니다.
          </p>
        ) : (
          <div className="host-cache-table-wrap">
            <table className="host-cache-table">
              <thead>
                <tr>
                  <th className="host-cache-table-head-cell">Query Key</th>
                  <th className="host-cache-table-head-cell">Status</th>
                  <th className="host-cache-table-head-cell">Fetch</th>
                  <th className="host-cache-table-head-cell">Observers</th>
                  <th className="host-cache-table-head-cell">Invalidated</th>
                  <th className="host-cache-table-head-cell">Updated At</th>
                </tr>
              </thead>
              <tbody>
                {cacheEntries.map((entry) => (
                  <tr key={entry.queryKeyLabel}>
                    <td className="host-cache-table-cell">
                      <code className="host-cache-key-code">{entry.queryKeyLabel}</code>
                    </td>
                    <td className="host-cache-table-cell">
                      <Badge
                        tone={
                          entry.status === 'success'
                            ? 'success'
                            : entry.status === 'error'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {entry.status}
                      </Badge>
                    </td>
                    <td className="host-cache-table-cell">{entry.fetchStatus}</td>
                    <td className="host-cache-table-cell">{entry.observerCount}</td>
                    <td className="host-cache-table-cell">
                      {entry.isInvalidated ? '예' : '아니오'}
                    </td>
                    <td className="host-cache-table-cell">
                      {entry.dataUpdatedAt > 0
                        ? formatDate(new Date(entry.dataUpdatedAt).toISOString(), 'HH:mm:ss')
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Stack>
    </Stack>
  );
}
