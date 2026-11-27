/**
 * @file use-host-auth.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description 시드 사용자 목록 조회, 호스트 스코프 localStorage 세션 복원·보존, 로그인/비로그인 전환 및 mfe:auth-changed 이벤트 전파를 총괄하는 커스텀 훅입니다 ([Study 14 § 3]).
 */
import { useCallback, useEffect, useState } from 'react';
import {
  DEFAULT_API_BASE_URL,
  MFE_EVENTS,
  createScopedStorage,
  mfeEventBus,
  normalizeError,
} from 'remote_shared/utils';
import { HOST_STORAGE_SCOPE_ID } from '../../dashboard/model/host-preferences';
import { fetchUsers, loginWithUserId } from '../api/auth-api';
import {
  type HostStoredAuthSession,
  type UserEntity,
  hostStoredAuthSessionSchema,
} from './auth-schema';

/** 호스트 인증 세션을 저장하는 localStorage 내부 키 상수 (전체 키: mfe:host-vite:auth-session) */
export const HOST_AUTH_STORAGE_KEY = 'auth-session';

/** 헤더 사용자 드롭다운에서 비로그인(게스트) 상태를 나타내는 센티널 옵션 값 상수 */
export const GUEST_USER_OPTION_VALUE = '__guest__';

/** host-vite 전용 네임스페이스 localStorage 래퍼 인스턴스 */
const hostAuthStorage = createScopedStorage(HOST_STORAGE_SCOPE_ID);

/**
 * @description useHostAuth 훅이 반환하는 호스트 인증 상태 및 제어 함수 인터페이스
 */
export interface UseHostAuthResult {
  /** 백엔드에서 조회한 선택 가능 사용자 목록 */
  users: readonly UserEntity[];

  /** 현재 로그인된 세션 객체 (비로그인 시 null) */
  session: HostStoredAuthSession | null;

  /** 로그인 요청 진행 여부 */
  isAuthPending: boolean;

  /** 사용자 목록 조회 또는 로그인 실패 시 표시할 한글 에러 메시지 (정상 시 null) */
  authErrorMessage: string | null;

  /** 사용자 ID 또는 게스트 센티널 값으로 인증 상태를 전환하는 핸들러 */
  selectUser: (nextUserValue: string) => Promise<void>;
}

/**
 * localStorage에 저장된 호스트 인증 세션을 Zod 검증 후 안전하게 복원합니다.
 *
 * @returns 유효한 세션 객체 또는 비로그인 null
 */
function loadStoredAuthSession(): HostStoredAuthSession | null {
  return hostAuthStorage.getItem<HostStoredAuthSession | null>(
    HOST_AUTH_STORAGE_KEY,
    hostStoredAuthSessionSchema.nullable(),
    null,
  );
}

/**
 * 호스트 전역 로그인 세션을 관리하고 하위 리모트로 AUTH_CHANGED 이벤트를 전파하는 훅입니다.
 *
 * @param hostSourceId - host-vite 발신자 식별자 (mfeEventBus sourceId 첨부용)
 * @param apiBaseUrl - 백엔드 API 기본 URL
 * @returns 인증 사용자 목록, 현재 세션, 에러 상태 및 전환 함수
 */
export function useHostAuth(
  hostSourceId: string,
  apiBaseUrl: string = DEFAULT_API_BASE_URL,
): UseHostAuthResult {
  /** 백엔드 GET /api/users로 불러온 테스트 사용자 목록 상태 */
  const [users, setUsers] = useState<UserEntity[]>([]);

  /** 현재 로그인된 사용자 세션 상태 (초기값은 스토리지 복원 결과 또는 비로그인 null) */
  const [session, setSession] = useState<HostStoredAuthSession | null>(() =>
    loadStoredAuthSession(),
  );

  /** 로그인 요청 진행 상태 */
  const [isAuthPending, setIsAuthPending] = useState<boolean>(false);

  /** 인증 API 오류 안내 메시지 상태 */
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  // 마운트 시 시드 사용자 목록을 조회하며 언마운트 시 진행 중인 요청을 AbortController로 취소합니다 ([Study 08]).
  useEffect(() => {
    const controller = new AbortController();

    void fetchUsers(apiBaseUrl, controller.signal)
      .then((loadedUsers) => {
        if (!controller.signal.aborted) {
          setUsers(loadedUsers);
        }
      })
      .catch((err: unknown) => {
        // [분기 설명] 언마운트 취소로 인한 AbortError는 정상 종료이므로 에러 배너를 띄우지 않습니다.
        if (controller.signal.aborted) {
          return;
        }
        const normalized = normalizeError(err);
        setAuthErrorMessage(normalized.message);
      });

    return () => {
      controller.abort();
    };
  }, [apiBaseUrl]);

  /**
   * 헤더 드롭다운에서 사용자가 선택한 값으로 로그인하거나 비로그인(게스트) 상태로 전환합니다.
   */
  const selectUser = useCallback(
    async (nextUserValue: string): Promise<void> => {
      setAuthErrorMessage(null);

      // [분기 설명 1] 게스트(비로그인) 선택 시 저장된 세션을 즉시 제거하고 userId=null 상태로 복귀합니다.
      if (nextUserValue === GUEST_USER_OPTION_VALUE || nextUserValue.trim().length === 0) {
        hostAuthStorage.removeItem(HOST_AUTH_STORAGE_KEY);
        setSession(null);
        return;
      }

      setIsAuthPending(true);
      try {
        const loggedIn = await loginWithUserId(nextUserValue, apiBaseUrl);
        const nextSession: HostStoredAuthSession = {
          userId: loggedIn.id,
          username: loggedIn.username,
          role: loggedIn.role,
          token: loggedIn.token,
        };

        hostAuthStorage.setItem(HOST_AUTH_STORAGE_KEY, nextSession);
        setSession(nextSession);

        // [분기 설명 2] 로그인 성공 직후 하위 리모트와 MfeInspector가 즉시 감지할 수 있도록 sourceId와 함께 방송합니다.
        mfeEventBus.emit(
          MFE_EVENTS.AUTH_CHANGED,
          {
            userId: nextSession.userId,
            username: nextSession.username,
            token: nextSession.token,
            timestamp: new Date().toISOString(),
          },
          { sourceId: hostSourceId },
        );
      } catch (err: unknown) {
        const normalized = normalizeError(err);
        setAuthErrorMessage(normalized.message);
      } finally {
        setIsAuthPending(false);
      }
    },
    [apiBaseUrl, hostSourceId],
  );

  return {
    users,
    session,
    isAuthPending,
    authErrorMessage,
    selectUser,
  };
}
