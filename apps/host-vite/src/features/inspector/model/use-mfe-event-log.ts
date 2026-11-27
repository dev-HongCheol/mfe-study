/**
 * @file use-mfe-event-log.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description 표준 4대 MFE 커스텀 이벤트(CART_UPDATED, AUTH_CHANGED, THEME_CHANGED, SYNC_MODE_CHANGED)를 useMfeEvent로 구독하여 MfeInspector 이벤트 로그 스트림으로 누적하는 커스텀 훅입니다 ([Study 04 #09, Study 14 § 3]).
 */
import { useCallback, useRef, useState } from 'react';
import {
  type AuthChangedEventPayload,
  type CartUpdatedEventPayload,
  MFE_EVENTS,
  type MfeEventMeta,
  type SyncModeChangedEventPayload,
  type ThemeChangedEventPayload,
  useMfeEvent,
} from 'remote_shared/utils';

/** MfeInspector에 기본으로 유지할 최대 이벤트 로그 개수 상수 */
const DEFAULT_MAX_LOG_ENTRIES = 30;

/**
 * @description MfeInspector 실시간 이벤트 스트림에 기록되는 단일 이벤트 로그 엔트리 인터페이스
 */
export interface MfeEventLogEntry {
  /** 리스트 렌더링용 고유 식별자 */
  id: string;

  /** 수신된 표준 MFE 이벤트 이름 (예: 'mfe:cart-updated') */
  eventName: string;

  /** 이벤트 발신자 식별자 (sourceId 미포함 레거시 이벤트는 'anonymous') */
  sourceId: string;

  /** 이벤트가 발생한 ISO-8601 시각 문자열 */
  timestamp: string;

  /** 승인자·학습자가 즉시 읽을 수 있는 한글 요약 문자열 */
  summary: string;

  /** 상세 디버깅용 직렬화 페이로드 문자열 */
  rawPayloadJson: string;
}

/**
 * @description useMfeEventLog 훅 반환 인터페이스
 */
export interface UseMfeEventLogResult {
  /** 최신순으로 정렬된 이벤트 로그 목록 */
  logs: readonly MfeEventLogEntry[];

  /** 누적된 이벤트 로그를 전부 비우는 함수 */
  clearLogs: () => void;
}

/**
 * 장바구니 변경 이벤트 페이로드를 사람이 읽기 쉬운 한글 요약 문구로 변환합니다.
 *
 * @param payload - CartUpdatedEventPayload
 * @returns 한글 요약 문자열
 */
function formatCartSummary(payload: CartUpdatedEventPayload): string {
  const target = payload.productName ?? (payload.productId ? `상품 #${payload.productId}` : '전체');
  const qtyText = payload.quantity ? ` (${payload.quantity}개)` : '';
  return `[${payload.action}] user=${payload.userId} · ${target}${qtyText} · host=${payload.sourceHost}`;
}

/**
 * 인증 변경 이벤트 페이로드를 한글 요약 문구로 변환합니다.
 *
 * @param payload - AuthChangedEventPayload
 * @returns 한글 요약 문자열
 */
function formatAuthSummary(payload: AuthChangedEventPayload): string {
  return `사용자 전환 → ${payload.username} (${payload.userId})`;
}

/**
 * 테마 변경 이벤트 페이로드를 한글 요약 문구로 변환합니다.
 *
 * @param payload - ThemeChangedEventPayload
 * @returns 한글 요약 문자열
 */
function formatThemeSummary(payload: ThemeChangedEventPayload): string {
  return `실시간 테마 변경 → ${payload.theme}`;
}

/**
 * 동기화 모드 변경 이벤트 페이로드를 한글 요약 문구로 변환합니다.
 *
 * @param payload - SyncModeChangedEventPayload
 * @returns 한글 요약 문자열
 */
function formatSyncModeSummary(payload: SyncModeChangedEventPayload): string {
  const label =
    payload.syncMode === 'mode-b-query'
      ? 'Mode B (싱글톤 sharedQueryClient)'
      : 'Mode A (독립 QueryClient + CustomEvent)';
  return `동기화 모드 전환 → ${label}`;
}

/**
 * 표준 4대 MFE 커스텀 이벤트를 관찰자 모드(ignoreSourceId 미지정)로 구독하여 실시간 로그를 유지하는 훅입니다.
 *
 * @param maxEntries - 유지할 최대 로그 개수 (기본값: 30)
 * @returns 최신순 이벤트 로그 배열 및 비우기 함수
 */
export function useMfeEventLog(maxEntries: number = DEFAULT_MAX_LOG_ENTRIES): UseMfeEventLogResult {
  /** 최신순 이벤트 로그 목록 상태 */
  const [logs, setLogs] = useState<MfeEventLogEntry[]>([]);

  /** 동일 밀리초에 연속 발행된 이벤트의 React key 충돌을 방지하기 위한 단조 증가 시퀀스 Ref */
  const sequenceRef = useRef<number>(0);

  /**
   * 수신된 이벤트를 표준 MfeEventLogEntry로 포장하여 최신순 상단에 추가합니다.
   */
  const appendLog = useCallback(
    (
      eventName: string,
      payload: unknown,
      timestamp: string,
      summary: string,
      meta?: MfeEventMeta,
    ) => {
      sequenceRef.current += 1;
      const entry: MfeEventLogEntry = {
        id: `${eventName}-${sequenceRef.current}`,
        eventName,
        sourceId: meta?.sourceId ?? 'anonymous',
        timestamp,
        summary,
        rawPayloadJson: JSON.stringify(payload),
      };

      setLogs((prev) => [entry, ...prev].slice(0, Math.max(1, maxEntries)));
    },
    [maxEntries],
  );

  // [Study 04 #09] MfeInspector는 모든 앱의 이벤트를 출처까지 감시하는 로거이므로 ignoreSourceId를 지정하지 않습니다.
  useMfeEvent(MFE_EVENTS.CART_UPDATED, (payload, meta) => {
    appendLog(
      MFE_EVENTS.CART_UPDATED,
      payload,
      payload.timestamp,
      formatCartSummary(payload),
      meta,
    );
  });

  useMfeEvent(MFE_EVENTS.AUTH_CHANGED, (payload, meta) => {
    appendLog(
      MFE_EVENTS.AUTH_CHANGED,
      payload,
      payload.timestamp,
      formatAuthSummary(payload),
      meta,
    );
  });

  useMfeEvent(MFE_EVENTS.THEME_CHANGED, (payload, meta) => {
    appendLog(
      MFE_EVENTS.THEME_CHANGED,
      payload,
      payload.timestamp,
      formatThemeSummary(payload),
      meta,
    );
  });

  useMfeEvent(MFE_EVENTS.SYNC_MODE_CHANGED, (payload, meta) => {
    appendLog(
      MFE_EVENTS.SYNC_MODE_CHANGED,
      payload,
      payload.timestamp,
      formatSyncModeSummary(payload),
      meta,
    );
  });

  /**
   * 누적된 이벤트 로그 목록을 즉시 비웁니다.
   */
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return {
    logs,
    clearLogs,
  };
}
