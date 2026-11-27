/**
 * @file MfeInspector.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description Collapsible + Tabs 기반으로 Mode A(CustomEvent) <-> Mode B(sharedQueryClient) 실시간 전환, 4대 표준 이벤트 스트림 및 런타임·캐시 스냅샷을 통합 제공하는 MFE 학습 모니터 컴포넌트입니다 ([Study 01 § 4, Study 14 § 2]).
 */
import {
  Badge,
  Button,
  Card,
  Collapsible,
  Flex,
  Stack,
  type TabItem,
  Tabs,
} from 'remote_shared/ui';
import type { SyncMode } from 'remote_shared/utils';
import { useMfeEventLog } from '../model/use-mfe-event-log';
import { useSharedQueryCacheSnapshot } from '../model/use-shared-query-cache';
import { EventLogTab } from './EventLogTab';
import { RuntimeStatusTab } from './RuntimeStatusTab';

/**
 * @description MfeInspector 컴포넌트 Props 인터페이스
 */
export interface MfeInspectorProps {
  /** 현재 활성화된 상태 동기화 학습 모드 */
  syncMode: SyncMode;

  /** host-vite 인스턴스의 고유 이벤트 발신자 ID */
  hostSourceId: string;

  /** 사용자가 Mode A / Mode B 스위치를 클릭했을 때 호출되는 콜백 */
  onChangeSyncMode: (nextMode: SyncMode) => void;
}

/**
 * 호스트 하단에 배치되는 접이식 실시간 MFE 학습 모니터 컴포넌트입니다.
 *
 * @param props - 동기화 모드 상태, 호스트 sourceId, 모드 전환 콜백
 * @returns MfeInspector 섹션 엘리먼트
 */
export function MfeInspector({ syncMode, hostSourceId, onChangeSyncMode }: MfeInspectorProps) {
  const { logs, clearLogs } = useMfeEventLog();
  const cacheEntries = useSharedQueryCacheSnapshot();

  /** Tabs 컴포넌트에 전달할 2대 관측 탭 정의 배열 */
  const tabItems: TabItem[] = [
    {
      value: 'events',
      label: `실시간 이벤트 로그 (${logs.length})`,
      content: <EventLogTab logs={logs} onClearLogs={clearLogs} />,
    },
    {
      value: 'runtime',
      label: `런타임 · 캐시 상태 (${cacheEntries.length})`,
      content: (
        <RuntimeStatusTab
          syncMode={syncMode}
          hostSourceId={hostSourceId}
          cacheEntries={cacheEntries}
        />
      ),
    },
  ];

  return (
    <section aria-label="MfeInspector 실시간 학습 모니터" className="host-inspector-section">
      <Card padding="md" elevated={true} className="host-inspector-card">
        <Collapsible
          defaultOpen={true}
          title={`MfeInspector — 실시간 MFE 학습 모니터 (현재: ${
            syncMode === 'mode-b-query' ? 'Mode B: sharedQueryClient' : 'Mode A: CustomEvent'
          })`}
        >
          <Stack gap="md">
            <div className="host-inspector-mode-bar">
              <Stack gap="xs">
                <Flex justify="between" align="center" gap="sm" wrap="wrap">
                  <Flex align="center" gap="sm" wrap="wrap">
                    <Badge tone="brand">상태 동기화 비교 모드</Badge>
                    <Button
                      variant={syncMode === 'mode-a-event' ? 'primary' : 'secondary'}
                      size="sm"
                      aria-pressed={syncMode === 'mode-a-event'}
                      onClick={() => onChangeSyncMode('mode-a-event')}
                    >
                      Mode A: 독립 QueryClient + CustomEvent
                    </Button>
                    <Button
                      variant={syncMode === 'mode-b-query' ? 'primary' : 'secondary'}
                      size="sm"
                      aria-pressed={syncMode === 'mode-b-query'}
                      onClick={() => onChangeSyncMode('mode-b-query')}
                    >
                      Mode B: 싱글톤 sharedQueryClient
                    </Button>
                  </Flex>
                </Flex>

                <p className="host-inspector-mode-desc">
                  {syncMode === 'mode-a-event'
                    ? 'Mode A(약결합): 각 리모트가 독립 QueryClient를 사용하고, mfe:cart-updated CustomEvent 신호(sourceId 자기 에코 차단 적용)로 동기화합니다.'
                    : 'Mode B(강결합): 두 리모트가 remote-shared 싱글톤 sharedQueryClient 캐시를 직접 공유하며 CustomEvent 없이 invalidateQueries로 동기화합니다.'}
                </p>
              </Stack>
            </div>

            <Tabs items={tabItems} defaultValue="events" />
          </Stack>
        </Collapsible>
      </Card>
    </section>
  );
}
