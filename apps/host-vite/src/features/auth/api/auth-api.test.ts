/**
 * @file auth-api.test.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description [TC-02, EC-01] 호스트 인증 API 클라이언트(fetchUsers, loginWithUserId)의 정상 조회·로그인 및 404 에러 정규화 단위 테스트입니다.
 */
import { describe, expect, it } from 'vitest';
import { fetchUsers, loginWithUserId } from './auth-api';

describe('auth-api 단위 테스트 (TC-02, EC-01)', () => {
  it('TC-02: fetchUsers는 백엔드 GET /api/users 응답을 Zod 검증 후 시드 사용자 배열로 반환한다', async () => {
    const users = await fetchUsers();

    expect(users).toHaveLength(2);
    expect(users[0]).toMatchObject({
      id: 'user-1',
      username: '홍길동 (VIP)',
      role: 'admin',
    });
  });

  it('TC-02: loginWithUserId는 POST /api/auth/login 성공 시 토큰이 포함된 사용자 엔티티를 반환한다', async () => {
    const loggedIn = await loginWithUserId('user-2');

    expect(loggedIn).toEqual({
      id: 'user-2',
      username: '이순신 (일반)',
      role: 'member',
      token: 'mock-jwt-token-user-2',
    });
  });

  it('EC-01: 존재하지 않는 사용자 ID로 로그인 시 표준 NOT_FOUND 에러로 정규화해 reject한다', async () => {
    await expect(loginWithUserId('unknown-user')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      status: 404,
      message: '요청한 사용자를 찾을 수 없습니다.',
    });
  });
});
