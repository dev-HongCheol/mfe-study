/**
 * @file auth-api.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description 백엔드(Port 4000) GET /api/users 및 POST /api/auth/login 엔드포인트를 호출하고 Zod 스키마로 경계 검증하는 호스트 인증 API 클라이언트입니다.
 */
import { DEFAULT_API_BASE_URL, createApiClient, unwrapApiResponse } from 'remote_shared/utils';
import { type UserEntity, userEntitySchema, userListSchema } from '../model/auth-schema';

/**
 * 백엔드에 등록된 테스트용 시드 사용자 전체 목록을 조회합니다.
 *
 * @param apiBaseUrl - 백엔드 API 기본 URL (기본값: http://localhost:4000/api)
 * @param signal - 비동기 요청 취소용 AbortSignal (선택적)
 * @returns Zod 검증을 통과한 UserEntity 배열
 */
export async function fetchUsers(
  apiBaseUrl: string = DEFAULT_API_BASE_URL,
  signal?: AbortSignal,
): Promise<UserEntity[]> {
  const client = createApiClient(apiBaseUrl);
  return unwrapApiResponse(client.get('users', { signal }), userListSchema);
}

/**
 * 지정된 사용자 ID로 백엔드 테스트 로그인을 수행하고 인증 토큰이 포함된 사용자 엔티티를 반환합니다.
 *
 * @param userId - 로그인할 사용자 고유 ID (예: 'user-1')
 * @param apiBaseUrl - 백엔드 API 기본 URL (기본값: http://localhost:4000/api)
 * @returns Zod 검증을 통과한 로그인 사용자 엔티티
 */
export async function loginWithUserId(
  userId: string,
  apiBaseUrl: string = DEFAULT_API_BASE_URL,
): Promise<UserEntity> {
  const client = createApiClient(apiBaseUrl);
  return unwrapApiResponse(
    client.post('auth/login', {
      json: { userId },
    }),
    userEntitySchema,
  );
}
