/**
 * @file handlers.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description host-vite 단독 TDD 테스트를 위한 GET /api/users 및 POST /api/auth/login MSW 핸들러와 시드 픽스처입니다.
 */
import { http, HttpResponse } from 'msw';

/** 테스트용 기본 백엔드 API 베이스 URL 상수 */
export const MOCK_API_BASE_URL = 'http://localhost:4000/api';

/**
 * @description 백엔드 UserEntity 계약과 동일한 테스트용 시드 사용자 인터페이스
 */
export interface MockUserFixture {
  /** 사용자 고유 식별자 */
  id: string;

  /** 화면 표시용 이름 */
  username: string;

  /** 사용자 권한 등급 */
  role: 'admin' | 'member';

  /** 테스트용 인증 토큰 */
  token: string;
}

/** 백엔드 02-reset-seed.sql과 동일한 테스트 사용자 시드 목록 상수 */
export const MOCK_USERS: readonly MockUserFixture[] = [
  {
    id: 'user-1',
    username: '홍길동 (VIP)',
    role: 'admin',
    token: 'mock-jwt-token-user-1',
  },
  {
    id: 'user-2',
    username: '이순신 (일반)',
    role: 'member',
    token: 'mock-jwt-token-user-2',
  },
] as const;

/** host-vite 인증 API 기본 MSW 핸들러 목록 */
export const handlers = [
  http.get(`${MOCK_API_BASE_URL}/users`, () => {
    return HttpResponse.json({
      success: true,
      data: MOCK_USERS,
    });
  }),

  http.post(`${MOCK_API_BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { userId?: string };
    const matched = MOCK_USERS.find((user) => user.id === body.userId);

    // [분기 설명] 존재하지 않는 사용자 ID로 로그인 시 백엔드 정본과 동일하게 404 NOT_FOUND 봉투를 반환합니다.
    if (!matched) {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: '요청한 사용자를 찾을 수 없습니다.',
          },
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      success: true,
      data: matched,
    });
  }),
];
