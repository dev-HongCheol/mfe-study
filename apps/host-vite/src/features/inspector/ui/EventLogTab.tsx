/**
 * @file EventLogTab.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description MfeInspector의 1번째 탭으로 표준 4대 이벤트 스트림(발신자 sourceId · 발생 시각 · 한글 요약)과 [로그 비우기] 버튼을 렌더링하는 컴포넌트입니다 ([Study 14 § 2]).
 */
import { Badge, Button, Flex, Stack } from 'remote_shared/ui';
import { formatDate } from 'remote_shared/utils';
import type { MfeEventLogEntry } from '../model/use-mfe-event-log';

/**
 * @description EventLogTab 컴포넌트 Props 인터페이스
 */
export interface EventLogTabProps {
  /** 최신순으로 누적된 이벤트 로그 목록 */
  logs: readonly MfeEventLogEntry[];

  /** [로그 비우기] 버튼 클릭 시 호출되는 콜백 */
  onClearLogs: () => void;
}

/**
 * MfeInspector 실시간 이벤트 스트림 탭 본문 컴포넌트입니다.
 *
 * @param props - 이벤트 로그 배열 및 비우기 콜백
 * @returns 이벤트 스트림 목록 엘리먼트
 */
export function EventLogTab({ logs, onClearLogs }: EventLogTabProps) {
  return (
    <Stack gap="sm">
      <Flex justify="between" align="center" gap="sm" wrap="wrap">
        <Badge tone="neutral">누적 이벤트 {logs.length}건 (최신순)</Badge>
        <Button variant="ghost" size="sm" disabled={logs.length === 0} onClick={onClearLogs}>
          로그 비우기
        </Button>
      </Flex>

      {logs.length === 0 ? (
        <p className="host-empty-message">
          수신된 MFE 이벤트가 없습니다. 사용자 전환·테마 변경·모드 전환 또는 Mode A 상품 담기를
          실행하면 이곳에 실시간 기록됩니다.
        </p>
      ) : (
        <div className="host-event-log-list">
          {logs.map((entry) => (
            <article key={entry.id} className="host-event-log-item">
              <Flex justify="between" align="center" gap="sm" wrap="wrap">
                <Flex align="center" gap="xs" wrap="wrap">
                  <Badge tone="brand">{entry.eventName}</Badge>
                  <Badge tone="neutral">source: {entry.sourceId}</Badge>
                </Flex>
                <span className="host-event-log-meta">
                  {formatDate(entry.timestamp, 'HH:mm:ss')}
                </span>
              </Flex>
              <p className="host-event-log-summary">{entry.summary}</p>
            </article>
          ))}
        </div>
      )}
    </Stack>
  );
}
