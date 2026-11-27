/**
 * @file App.tsx
 * @app remote-shared (Scope: shared | Port: 3004)
 * @exposed false
 * @description http://localhost:3004 단독 실행 시 ./ui(13종 컴포넌트), ./theme(4종 실시간 테마), ./utils 동작을 검증하는 인터랙티브 쇼케이스입니다.
 */
import { useRef, useState } from 'react';
import { useTheme } from './exposed/theme';
import {
  Badge,
  Button,
  Card,
  Collapsible,
  Container,
  Flex,
  Grid,
  Heading,
  Select,
  Skeleton,
  Splitter,
  Stack,
  Tabs,
} from './exposed/ui';
import {
  MFE_EVENTS,
  createMfeEventSourceId,
  formatCurrency,
  formatDate,
  isThemeMode,
  mfeEventBus,
  useMfeEvent,
} from './exposed/utils';

/** 단독 실행 쇼케이스에서 샘플 이벤트를 발행할 때 사용하는 발신자 ID 접두사 상수 */
const SHOWCASE_EVENT_SOURCE_PREFIX = 'remote-shared-showcase';

/**
 * remote-shared 단독 실행(Standalone Port 3004) 카탈로그 쇼케이스 컴포넌트입니다.
 *
 * @returns 쇼케이스 화면 엘리먼트
 */
export function App() {
  const { theme, setTheme, availableThemes } = useTheme();

  /** 단독 실행 쇼케이스 인스턴스 생명주기 동안 유지되는 고유 이벤트 발신자 ID Ref */
  const showcaseSourceIdRef = useRef<string | null>(null);
  // [분기 설명] 최초 렌더 시 1회만 발신자 ID를 생성해 샘플 이벤트 발행 시 anonymous 출처가 찍히지 않도록 합니다.
  if (showcaseSourceIdRef.current === null) {
    showcaseSourceIdRef.current = createMfeEventSourceId(SHOWCASE_EVENT_SOURCE_PREFIX);
  }
  const showcaseSourceId = showcaseSourceIdRef.current;

  /** 이벤트 버스 수신 확인용 최근 로그 메시지 상태 */
  const [lastEventLog, setLastEventLog] = useState<string>('아직 수신된 이벤트가 없습니다.');

  /** 스켈레톤 미리보기 토글 상태 */
  const [showSkeleton, setShowSkeleton] = useState<boolean>(false);

  // mfe:cart-updated 이벤트를 실시간 구독하여 단독 실행 화면에서도 이벤트 버스와 발신자 출처(sourceId)를 검증합니다.
  useMfeEvent(MFE_EVENTS.CART_UPDATED, (payload, meta) => {
    const sourceLabel = meta?.sourceId ?? 'anonymous';
    setLastEventLog(
      `[${payload.sourceHost} | ${sourceLabel}] ${payload.productName ?? '상품'} (수량: ${payload.quantity ?? 1}) - ${formatDate(payload.timestamp)}`,
    );
  });

  return (
    <Container maxWidth="xl" style={{ paddingTop: '1.5rem', paddingBottom: '2.5rem' }}>
      <Stack gap="lg">
        <Card elevated padding="lg">
          <Flex justify="between" align="center" wrap="wrap" gap="md">
            <Stack gap="sm">
              <Flex align="center" gap="sm">
                <Badge tone="brand">Port 3004</Badge>
                <Badge tone="neutral">Scope: shared</Badge>
                <Badge tone="success">Theme: {theme}</Badge>
              </Flex>
              <Heading level={1}>remote-shared 디자인 시스템 &amp; 유틸리티 쇼케이스</Heading>
            </Stack>

            <Flex align="center" gap="sm" wrap="wrap">
              <Select
                ariaLabel="실시간 테마 선택"
                value={theme}
                options={availableThemes.map((item) => ({
                  label: item.label,
                  value: item.value,
                }))}
                onChange={(next) => {
                  // [분기 설명] Select onChange의 string 값을 강제 캐스팅(as)하지 않고 isThemeMode 가드로 검증한 뒤 적용합니다.
                  if (isThemeMode(next)) {
                    setTheme(next);
                  }
                }}
              />
              <Button variant="secondary" size="sm" onClick={() => setTheme('dark')}>
                Dark 테마 전환
              </Button>
            </Flex>
          </Flex>
        </Card>

        <Tabs
          defaultValue="components"
          items={[
            {
              value: 'components',
              label: 'UI 컴포넌트 & 레이아웃',
              content: (
                <Stack gap="md">
                  <Grid columns={2} gap="md">
                    <Card padding="md">
                      <Stack gap="sm">
                        <Heading level={3}>Button &amp; Badge 변형</Heading>
                        <Flex gap="sm" wrap="wrap">
                          <Button variant="primary">Primary</Button>
                          <Button variant="secondary">Secondary</Button>
                          <Button variant="danger">Danger</Button>
                          <Button isLoading>로딩 잠금</Button>
                        </Flex>
                      </Stack>
                    </Card>

                    <Card padding="md">
                      <Stack gap="sm">
                        <Flex justify="between" align="center">
                          <Heading level={3}>CLS 방지 Skeleton &amp; 포맷터</Heading>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSkeleton((prev) => !prev)}
                          >
                            {showSkeleton ? '실제 데이터 보기' : '스켈레톤 보기'}
                          </Button>
                        </Flex>
                        {showSkeleton ? (
                          <Skeleton variant="text" count={2} />
                        ) : (
                          <div>샘플 금액: {formatCurrency(129000)}</div>
                        )}
                      </Stack>
                    </Card>
                  </Grid>

                  <Splitter
                    defaultSize={[50, 50]}
                    panels={[
                      {
                        id: 'panel-left',
                        content: <Card padding="md">좌측 리사이즈 패널 (Ark UI Splitter)</Card>,
                      },
                      {
                        id: 'panel-right',
                        content: <Card padding="md">우측 리사이즈 패널 (Ark UI Splitter)</Card>,
                      },
                    ]}
                  />
                </Stack>
              ),
            },
            {
              value: 'utils',
              label: '이벤트 버스 & 유틸리티',
              content: (
                <Card padding="md">
                  <Stack gap="sm">
                    <Heading level={3}>mfeEventBus (Zod 런타임 검증 내장)</Heading>
                    <div>최근 이벤트: {lastEventLog}</div>
                    <Flex gap="sm">
                      <Button
                        size="sm"
                        onClick={() =>
                          mfeEventBus.emit(
                            MFE_EVENTS.CART_UPDATED,
                            {
                              action: 'add',
                              userId: 'user-1',
                              productId: 1,
                              productName: '기계식 무선 키보드 Pro',
                              quantity: 1,
                              sourceHost: 'standalone',
                              timestamp: new Date().toISOString(),
                            },
                            { sourceId: showcaseSourceId },
                          )
                        }
                      >
                        샘플 장바구니 이벤트 발행
                      </Button>
                    </Flex>
                  </Stack>
                </Card>
              ),
            },
          ]}
        />

        <Collapsible title="타 서비스 소비 규칙 요약 (remote_shared)">
          <div>
            호스트 및 도메인 리모트는 @ark-ui/react와 clsx를 직접 설치하지 않고 remote_shared/ui를
            통해 소비합니다.
          </div>
        </Collapsible>
      </Stack>
    </Container>
  );
}

export default App;
