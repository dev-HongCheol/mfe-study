/**
 * @file App.tsx
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description Vite 7 공통 껍데기 호스트(Port 3000)의 최상위 애플리케이션 컴포넌트입니다. 인증, 동기화 모드, 로딩 지연 상태를 관리하고 HostHeader · DashboardWorkspace · MfeInspector를 조합합니다 ([Study 14 § 2]).
 */
import { useCallback, useRef, useState } from 'react';
import { Container, Stack } from 'remote_shared/ui';
import { MFE_EVENTS, type SyncMode, mfeEventBus } from 'remote_shared/utils';
import { useHostAuth } from './features/auth/model/use-host-auth';
import {
  type HostPreferences,
  createHostEventSourceId,
  loadHostPreferences,
  saveHostPreferences,
} from './features/dashboard/model/host-preferences';
import { DashboardWorkspace } from './features/dashboard/ui/DashboardWorkspace';
import { HostHeader } from './features/dashboard/ui/HostHeader';
import './features/dashboard/ui/host-dashboard.css';
import { MfeInspector } from './features/inspector/ui/MfeInspector';

/**
 * host-vite(:3000) 통합 대시보드 루트 컴포넌트입니다.
 *
 * @returns 3단 호스트 대시보드 JSX 엘리먼트
 */
export function App() {
  /** 이 호스트 인스턴스 생명주기 동안 유지되는 고유 이벤트 발신자 ID Ref */
  const hostSourceIdRef = useRef<string | null>(null);
  if (hostSourceIdRef.current === null) {
    hostSourceIdRef.current = createHostEventSourceId();
  }
  const hostSourceId = hostSourceIdRef.current;

  /** localStorage에서 복원·동기화되는 호스트 학습 환경설정 상태 (syncMode, simulateDelay) */
  const [preferences, setPreferences] = useState<HostPreferences>(() => loadHostPreferences());

  const { users, session, isAuthPending, authErrorMessage, selectUser } = useHostAuth(hostSourceId);

  /**
   * MfeInspector에서 상태 동기화 모드(Mode A <-> Mode B)를 전환할 때 상태·스토리지·이벤트를 일괄 갱신합니다.
   */
  const handleChangeSyncMode = useCallback(
    (nextSyncMode: SyncMode) => {
      setPreferences((prev) => {
        // [분기 설명] 이미 동일한 모드가 활성화되어 있으면 불필요한 스토리지 쓰기와 이벤트 중복 발행을 건너뜁니다.
        if (prev.syncMode === nextSyncMode) {
          return prev;
        }
        const nextPrefs: HostPreferences = {
          ...prev,
          syncMode: nextSyncMode,
        };
        saveHostPreferences(nextPrefs);
        return nextPrefs;
      });

      mfeEventBus.emit(
        MFE_EVENTS.SYNC_MODE_CHANGED,
        {
          syncMode: nextSyncMode,
          timestamp: new Date().toISOString(),
        },
        { sourceId: hostSourceId },
      );
    },
    [hostSourceId],
  );

  /**
   * 1.5초 네트워크 로딩 지연 시뮬레이션 토글 상태를 반전하고 스토리지에 보존합니다.
   */
  const handleToggleDelay = useCallback(() => {
    setPreferences((prev) => {
      const nextPrefs: HostPreferences = {
        ...prev,
        simulateDelay: !prev.simulateDelay,
      };
      saveHostPreferences(nextPrefs);
      return nextPrefs;
    });
  }, []);

  /** 하위 2대 도메인 리모트에 전달할 로그인 사용자 ID (비로그인 시 null 고정) */
  const activeUserId = session?.userId ?? null;

  return (
    <div className="host-shell-page">
      <Container maxWidth="xl">
        <Stack gap="lg">
          <HostHeader
            users={users}
            activeUserId={activeUserId}
            isAuthPending={isAuthPending}
            authErrorMessage={authErrorMessage}
            simulateDelay={preferences.simulateDelay}
            onSelectUser={(nextValue) => {
              void selectUser(nextValue);
            }}
            onToggleDelay={handleToggleDelay}
          />

          <DashboardWorkspace
            userId={activeUserId}
            syncMode={preferences.syncMode}
            simulateDelay={preferences.simulateDelay}
          />

          <MfeInspector
            syncMode={preferences.syncMode}
            hostSourceId={hostSourceId}
            onChangeSyncMode={handleChangeSyncMode}
          />
        </Stack>
      </Container>
    </div>
  );
}

export default App;
