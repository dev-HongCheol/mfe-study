/**
 * @file App.tsx
 * @app remote-products (Scope: products | Port: 3002)
 * @exposed false
 * @description Port 3002 단독 실행(Standalone) 시 유저 전환, Mode A vs Mode B 전환, 실시간 4종 테마 전환, 1.5초 로딩 지연 시뮬레이션 및 이벤트 수신 모니터를 실험할 수 있는 쇼케이스 컴포넌트입니다.
 */
import { useState } from 'react';
import { AVAILABLE_THEMES, useTheme } from 'remote_shared/theme';
import {
  Badge,
  Button,
  Collapsible,
  Container,
  Flex,
  Heading,
  Select,
  type SelectOptionItem,
  Stack,
} from 'remote_shared/ui';
import {
  type CartUpdatedEventPayload,
  MFE_EVENTS,
  type SyncMode,
  type ThemeMode,
  useMfeEvent,
} from 'remote_shared/utils';
import { ProductList } from './exposed/ProductList.js';

/** 단독 실행 쇼케이스용 사용자 선택 옵션 상수 */
const USER_OPTIONS: SelectOptionItem[] = [
  { value: 'user-1', label: '홍길동 (user-1 / VIP)' },
  { value: 'user-2', label: '이순신 (user-2 / 일반)' },
];

/** 단독 실행 쇼케이스용 상태 동기화 모드 선택 옵션 상수 */
const SYNC_MODE_OPTIONS: SelectOptionItem[] = [
  { value: 'mode-a-event', label: 'Mode A: 독립 QueryClient + CustomEvent' },
  { value: 'mode-b-query', label: 'Mode B: 싱글톤 sharedQueryClient 공유' },
];

/**
 * Port 3002 단독 실행(Standalone) 쇼케이스 루트 컴포넌트입니다.
 *
 * @returns 단독 실행 대시보드 JSX 엘리먼트
 */
export function App() {
  const { theme, setTheme } = useTheme();

  /** 현재 선택된 시뮬레이션 사용자 ID 상태 */
  const [userId, setUserId] = useState<string>('user-1');

  /** 현재 선택된 상태 동기화 모드 상태 */
  const [syncMode, setSyncMode] = useState<SyncMode>('mode-a-event');

  /** 1.5초 로딩 지연 시뮬레이션 활성화 상태 */
  const [simulateDelay, setSimulateDelay] = useState<boolean>(false);

  /** Standalone 화면에서 포착된 최근 mfe:cart-updated 이벤트 로그 목록 */
  const [eventLogs, setEventLogs] = useState<CartUpdatedEventPayload[]>([]);

  // Mode A에서 발행되는 mfe:cart-updated 커스텀 이벤트를 실시간 포착하여 모니터에 기록합니다.
  useMfeEvent(MFE_EVENTS.CART_UPDATED, (payload) => {
    setEventLogs((prev) => [payload, ...prev].slice(0, 5));
  });

  /** 테마 Select 드롭다운 옵션 배열 */
  const themeOptions: SelectOptionItem[] = AVAILABLE_THEMES.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  return (
    <Container maxWidth="xl">
      <Stack gap="lg">
        <header className="prod-showcase-toolbar">
          <Stack gap="md">
            <Flex justify="between" align="center" gap="md" wrap="wrap">
              <Flex align="center" gap="sm" wrap="wrap">
                <Heading level={1}>상품 카탈로그 리모트 쇼케이스</Heading>
                <Badge tone="brand">Standalone (:3002)</Badge>
              </Flex>
              <Badge tone="neutral">Consumes: remote_shared (:3004)</Badge>
            </Flex>

            <Flex align="center" gap="md" wrap="wrap">
              <Select
                ariaLabel="시뮬레이션 사용자 선택"
                label="사용자"
                options={USER_OPTIONS}
                value={userId}
                onChange={setUserId}
              />

              <Select
                ariaLabel="상태 동기화 모드 선택"
                label="동기화 모드"
                options={SYNC_MODE_OPTIONS}
                value={syncMode}
                onChange={(val) => setSyncMode(val as SyncMode)}
              />

              <Select
                ariaLabel="실시간 테마 선택"
                label="테마"
                options={themeOptions}
                value={theme}
                onChange={(val) => setTheme(val as ThemeMode)}
              />

              <Button
                variant={simulateDelay ? 'primary' : 'secondary'}
                size="md"
                onClick={() => setSimulateDelay((prev) => !prev)}
              >
                {simulateDelay ? '1.5초 지연 시뮬레이션: ON' : '1.5초 지연 시뮬레이션: OFF'}
              </Button>
            </Flex>

            <Collapsible title={`실시간 mfe:cart-updated 이벤트 수신 로그 (${eventLogs.length}건)`}>
              {eventLogs.length === 0 ? (
                <p className="prod-stock-count">
                  아직 수신된 이벤트가 없습니다. (Mode A에서 상품을 담으면 이곳에 CustomEvent
                  페이로드가 기록됩니다.)
                </p>
              ) : (
                <Stack gap="xs">
                  {eventLogs.map((log, idx) => (
                    <div key={`${log.timestamp}-${idx}`} className="prod-event-log-item">
                      [{log.timestamp}] user={log.userId} | product={log.productName} (#
                      {log.productId}) | qty={log.quantity} | host={log.sourceHost}
                    </div>
                  ))}
                </Stack>
              )}
            </Collapsible>
          </Stack>
        </header>

        <main>
          <ProductList
            userId={userId}
            hostType="standalone"
            syncMode={syncMode}
            simulateDelay={simulateDelay}
          />
        </main>
      </Stack>
    </Container>
  );
}

export default App;
