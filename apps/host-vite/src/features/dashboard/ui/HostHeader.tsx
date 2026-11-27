/**
 * @file HostHeader.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description 호스트 식별 배지(Vite Host :3000), 로그인/사용자 전환(비로그인 포함), 실시간 4종 테마 전환, 1.5초 로딩 지연 시뮬레이션 토글을 제공하는 글로벌 제어 헤더 컴포넌트입니다 ([Study 14 § 2]).
 */
import { AVAILABLE_THEMES, useTheme } from 'remote_shared/theme';
import {
  Badge,
  Button,
  Card,
  Flex,
  Heading,
  Select,
  type SelectOptionItem,
  Stack,
} from 'remote_shared/ui';
import type { ThemeMode } from 'remote_shared/utils';
import type { UserEntity } from '../../auth/model/auth-schema';
import { GUEST_USER_OPTION_VALUE } from '../../auth/model/use-host-auth';

/**
 * @description HostHeader 컴포넌트 Props 인터페이스
 */
export interface HostHeaderProps {
  /** 백엔드에서 조회된 시드 사용자 목록 */
  users: readonly UserEntity[];

  /** 현재 로그인된 사용자 ID (비로그인 시 null) */
  activeUserId: string | null;

  /** 로그인 API 요청 진행 여부 */
  isAuthPending: boolean;

  /** 인증 API 오류 안내 메시지 (정상 시 null) */
  authErrorMessage: string | null;

  /** 1.5초 네트워크 로딩 지연 시뮬레이션 활성화 여부 */
  simulateDelay: boolean;

  /** 사용자 전환 선택 시 호출되는 콜백 */
  onSelectUser: (nextUserValue: string) => void;

  /** 1.5초 지연 시뮬레이션 토글 버튼 클릭 시 호출되는 콜백 */
  onToggleDelay: () => void;
}

/** 실시간 4종 테마 드롭다운 옵션 배열 상수 */
const THEME_OPTIONS: SelectOptionItem[] = AVAILABLE_THEMES.map((item) => ({
  value: item.value,
  label: item.label,
}));

/**
 * 공통 껍데기 호스트(host-vite :3000)의 최상단 글로벌 제어 헤더 컴포넌트입니다.
 *
 * @param props - 인증 목록·활성 사용자·지연 토글 상태 및 제어 콜백
 * @returns 글로벌 헤더 엘리먼트
 */
export function HostHeader({
  users,
  activeUserId,
  isAuthPending,
  authErrorMessage,
  simulateDelay,
  onSelectUser,
  onToggleDelay,
}: HostHeaderProps) {
  const { theme, setTheme } = useTheme();

  /** 비로그인(게스트) 옵션을 최상단에 포함한 사용자 선택 드롭다운 옵션 목록 */
  const userSelectOptions: SelectOptionItem[] = [
    { value: GUEST_USER_OPTION_VALUE, label: '게스트 (비로그인)' },
    ...users.map((user) => ({
      value: user.id,
      label: `${user.username} (${user.id})`,
    })),
  ];

  /** 현재 Select 컴포넌트에 바인딩할 선택 값 (비로그인 시 게스트 센티널) */
  const currentUserValue = activeUserId ?? GUEST_USER_OPTION_VALUE;

  return (
    <header className="host-header">
      <Card padding="md" elevated={true} className="host-header-card">
        <Stack gap="md">
          <Flex justify="between" align="center" gap="md" wrap="wrap">
            <Flex align="center" gap="sm" wrap="wrap">
              <Heading level={1} className="host-title">
                MFE Study 통합 대시보드
              </Heading>
              <Badge tone="brand">Vite Host · Port 3000</Badge>
              <Badge tone={activeUserId ? 'success' : 'neutral'}>
                {activeUserId ? `로그인: ${activeUserId}` : '비로그인 (읽기 전용)'}
              </Badge>
            </Flex>

            <Badge tone="neutral">Consumes: shared(:3004) · products(:3002) · cart(:3003)</Badge>
          </Flex>

          <Flex align="center" gap="md" wrap="wrap" className="host-header-controls">
            <Select
              ariaLabel="로그인 사용자 선택"
              label="사용자"
              options={userSelectOptions}
              value={currentUserValue}
              disabled={isAuthPending}
              onChange={onSelectUser}
            />

            <Select
              ariaLabel="실시간 테마 선택"
              label="테마"
              options={THEME_OPTIONS}
              value={theme}
              onChange={(nextTheme) => setTheme(nextTheme as ThemeMode)}
            />

            <Button
              variant={simulateDelay ? 'primary' : 'secondary'}
              size="md"
              onClick={onToggleDelay}
            >
              {simulateDelay ? '1.5초 지연 시뮬레이션: ON' : '1.5초 지연 시뮬레이션: OFF'}
            </Button>
          </Flex>

          {authErrorMessage ? (
            <div role="alert" className="host-auth-error-banner">
              인증 오류: {authErrorMessage}
            </div>
          ) : null}
        </Stack>
      </Card>
    </header>
  );
}
