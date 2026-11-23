/**
 * @file App.tsx
 * @app remote-cart (Scope: cart | Port: 3003)
 * @exposed false
 * @description http://localhost:3003 단독 실행(Standalone) 쇼케이스 컴포넌트입니다. 유저 전환, Mode A/B 전환, CSS 격리 토글, 테마 전환, 1.5초 지연 및 수동 이벤트 시뮬레이터를 제공합니다.
 */
import { useState } from 'react';
import { AVAILABLE_THEMES, type ThemeMode, useTheme } from 'remote_shared/theme';
import {
  Badge,
  Button,
  Card,
  Container,
  Flex,
  Heading,
  Select,
  type SelectOptionItem,
  Stack,
} from 'remote_shared/ui';
import {
  CART_QUERY_KEY,
  MFE_EVENTS,
  type SyncMode,
  mfeEventBus,
  normalizeError,
  sharedQueryClient,
  useMfeEvent,
} from 'remote_shared/utils';
import { CartWidget } from './exposed/CartWidget';
import { postIncrementCartItem } from './features/cart/api/cart-api';
import { loadCartPreferences, saveCartPreferences } from './features/cart/model/cart-schema';

/** 단독 실행에서 장바구니가 비어 있을 때 순환 담기 테스트에 사용하는 시드 상품 ID 목록 (재고 보유 상품 1~5번) */
const SAMPLE_PRODUCT_IDS: readonly number[] = [1, 2, 3, 4, 5] as const;

/** 단독 실행 테스트용 사용자 선택 옵션 상수 */
const USER_SELECT_OPTIONS: SelectOptionItem[] = [
  { value: 'user-1', label: '홍길동 (VIP · user-1)' },
  { value: 'user-2', label: '이순신 (일반 · user-2)' },
  { value: '__guest__', label: '게스트 (비로그인 차단 테스트)' },
];

/** 상태 동기화 학습 모드 선택 옵션 상수 */
const SYNC_MODE_OPTIONS: SelectOptionItem[] = [
  { value: 'mode-a-event', label: 'Mode A — 독립 QueryClient + CustomEvent' },
  { value: 'mode-b-query', label: 'Mode B — 싱글톤 sharedQueryClient' },
];

/** 테마 선택 드롭다운 옵션 목록 */
const THEME_SELECT_OPTIONS: SelectOptionItem[] = AVAILABLE_THEMES.map((item) => ({
  value: item.value,
  label: item.label,
}));

/**
 * Port 3003 단독 실행 시 장바구니 원격 위젯의 모든 MFE 학습 시나리오를 검증할 수 있는 쇼케이스 앱입니다.
 *
 * @returns 단독 실행 쇼케이스 JSX 엘리먼트
 */
export function App() {
  const { theme, setTheme } = useTheme();

  /** 단독 실행에서 선택된 사용자 식별자 상태 ('__guest__'이면 비로그인 null로 전달) */
  const [selectedUser, setSelectedUser] = useState<string>('user-1');

  /** 단독 실행에서 선택된 상태 동기화 모드 상태 */
  const [syncMode, setSyncMode] = useState<SyncMode>('mode-a-event');

  /** 1.5초 로딩 지연 시뮬레이션 토글 상태 */
  const [simulateDelay, setSimulateDelay] = useState<boolean>(false);

  /** CSS 격리 vs 오염 비교 토글 상태 (로컬 스토리지 mfe:cart:preferences 복원) */
  const [cssIsolated, setCssIsolated] = useState<boolean>(() => loadCartPreferences().cssIsolated);

  /** 최근 발생한 MFE 이벤트 로그 목록 상태 (최대 5건 유지) */
  const [eventLogs, setEventLogs] = useState<string[]>([]);

  /** 단독 실행 샘플 상품 담기 요청 진행 여부 상태 */
  const [isAddingSample, setIsAddingSample] = useState<boolean>(false);

  /** 다음 샘플 상품 담기 시 사용할 순환 인덱스 상태 */
  const [sampleCursor, setSampleCursor] = useState<number>(0);

  useMfeEvent(MFE_EVENTS.CART_UPDATED, (payload) => {
    const entry = `[${payload.action}] user=${payload.userId} product=${payload.productName ?? payload.productId ?? 'all'} (${payload.sourceHost})`;
    setEventLogs((prev) => [entry, ...prev].slice(0, 5));
  });

  /** 실제 CartWidget에 전달할 사용자 ID ('__guest__'인 경우 null로 비로그인 차단 검증) */
  const effectiveUserId = selectedUser === '__guest__' ? null : selectedUser;

  /**
   * CSS 격리 토글을 전환하고 스코프 스토리지 저장 및 이벤트를 발행합니다.
   */
  const handleToggleCssIsolation = () => {
    const nextIsolated = !cssIsolated;
    setCssIsolated(nextIsolated);
    saveCartPreferences({ cssIsolated: nextIsolated });
    mfeEventBus.emit(MFE_EVENTS.CSS_ISOLATION_CHANGED, {
      cssIsolated: nextIsolated,
      timestamp: new Date().toISOString(),
    });
  };

  /**
   * 단독 실행 화면에서 실제 POST /api/cart를 호출해 샘플 상품 1개를 담고 현재 syncMode로 동기화합니다.
   * 장바구니를 비운 뒤에도 DB 리셋 없이 Port 3003 단독으로 반복 테스트할 수 있게 돕습니다.
   */
  const handleAddSampleItem = async () => {
    // [분기 설명] 비로그인 상태이거나 이미 요청 중이면 중복 호출을 차단합니다.
    if (!effectiveUserId || isAddingSample) {
      return;
    }

    const targetProductId = SAMPLE_PRODUCT_IDS[sampleCursor % SAMPLE_PRODUCT_IDS.length] ?? 1;
    setIsAddingSample(true);
    try {
      const added = await postIncrementCartItem({
        userId: effectiveUserId,
        productId: targetProductId,
        quantity: 1,
        addedFromHost: 'standalone',
      });
      setSampleCursor((prev) => (prev + 1) % SAMPLE_PRODUCT_IDS.length);

      // [분기 설명] 실제 DB 저장 후 현재 선택된 모드에 맞춰 Mode A는 이벤트 발행, Mode B는 공유 캐시 무효화를 수행합니다.
      if (syncMode === 'mode-b-query') {
        await sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
        setEventLogs((prev) =>
          [
            `[샘플 담기 · Mode B] ${added.productName} (+1) → sharedQueryClient 무효화`,
            ...prev,
          ].slice(0, 5),
        );
      } else {
        mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, {
          action: 'add',
          userId: added.userId,
          productId: added.productId,
          productName: added.productName,
          quantity: 1,
          sourceHost: 'standalone',
          timestamp: added.createdAt || new Date().toISOString(),
        });
      }
    } catch (err) {
      const normalized = normalizeError(err);
      setEventLogs((prev) =>
        [`[샘플 담기 실패] [${normalized.code}] ${normalized.message}`, ...prev].slice(0, 5),
      );
    } finally {
      setIsAddingSample(false);
    }
  };

  /**
   * 단독 실행 화면에서 상품 앱(remote-products)이 동기화 신호를 보낸 상황을 수동 시뮬레이션합니다.
   */
  const handleSimulateRemoteSync = () => {
    if (!effectiveUserId) {
      return;
    }

    // [분기 설명] 현재 선택된 모드에 맞춰 Mode A는 CustomEvent 발행, Mode B는 sharedQueryClient 무효화를 실행합니다.
    if (syncMode === 'mode-b-query') {
      void sharedQueryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      setEventLogs((prev) =>
        [`[Mode B 시뮬레이션] sharedQueryClient.invalidateQueries(['cart'])`, ...prev].slice(0, 5),
      );
    } else {
      mfeEventBus.emit(MFE_EVENTS.CART_UPDATED, {
        action: 'add',
        userId: effectiveUserId,
        productName: '원격 시뮬레이션 신호',
        sourceHost: 'standalone',
        timestamp: new Date().toISOString(),
      });
    }
  };

  return (
    <div className="cart-standalone-page">
      <Container maxWidth="lg">
        <Stack gap="lg">
          <Card padding="md" elevated={true} className="cart-standalone-toolbar">
            <Stack gap="md">
              <Flex justify="between" align="center" gap="sm" wrap="wrap">
                <div>
                  <Heading level={2}>장바구니 원격 앱 — Standalone 쇼케이스</Heading>
                  <p className="cart-header-subtext">
                    Rsbuild(Rspack) · Port 3003 · Vite 공급자(remote_shared:3004) 이종 번들러 소비
                  </p>
                </div>
                <Badge tone="brand">./CartWidget 노출 중</Badge>
              </Flex>

              <Flex align="center" gap="sm" wrap="wrap">
                <Select
                  ariaLabel="테스트 사용자 선택"
                  label="사용자"
                  options={USER_SELECT_OPTIONS}
                  value={selectedUser}
                  onChange={setSelectedUser}
                />
                <Select
                  ariaLabel="상태 동기화 모드 선택"
                  label="동기화 모드"
                  options={SYNC_MODE_OPTIONS}
                  value={syncMode}
                  onChange={(value) => setSyncMode(value as SyncMode)}
                />
                <Select
                  ariaLabel="실시간 디자인 테마 선택"
                  label="테마"
                  options={THEME_SELECT_OPTIONS}
                  value={theme}
                  onChange={(value) => setTheme(value as ThemeMode)}
                />
              </Flex>

              <Flex align="center" gap="sm" wrap="wrap">
                <Button
                  variant={cssIsolated ? 'secondary' : 'danger'}
                  size="sm"
                  onClick={handleToggleCssIsolation}
                >
                  {cssIsolated ? 'CSS 격리: ON (정상)' : 'CSS 격리: OFF (오염 실험)'}
                </Button>
                <Button
                  variant={simulateDelay ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSimulateDelay((prev) => !prev)}
                >
                  {simulateDelay ? '1.5초 지연: ON' : '1.5초 지연: OFF'}
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  isLoading={isAddingSample}
                  disabled={!effectiveUserId || isAddingSample}
                  onClick={() => {
                    void handleAddSampleItem();
                  }}
                >
                  샘플 상품 담기 (POST /api/cart)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!effectiveUserId}
                  onClick={handleSimulateRemoteSync}
                >
                  원격 동기화 신호 테스트 ({syncMode === 'mode-b-query' ? 'Mode B' : 'Mode A'})
                </Button>
              </Flex>

              {eventLogs.length > 0 ? (
                <pre className="cart-standalone-log-box">{eventLogs.join('\n')}</pre>
              ) : null}
            </Stack>
          </Card>

          <CartWidget
            userId={effectiveUserId}
            hostType="standalone"
            syncMode={syncMode}
            simulateDelay={simulateDelay}
            cssIsolated={cssIsolated}
          />
        </Stack>
      </Container>
    </div>
  );
}

export default App;
