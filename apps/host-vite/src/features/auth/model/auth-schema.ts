/**
 * @file auth-schema.ts
 * @app host-vite (Scope: host-vite | Port: 3000)
 * @exposed false
 * @description 호스트 글로벌 인증 컨텍스트의 사용자 엔티티(UserEntity) 및 localStorage 세션(HostStoredAuthSession) 타입과 Zod 런타임 검증 스키마를 정의합니다 ([Study 14 § 3]).
 */
import { z } from 'zod';

/**
 * @description 백엔드 GET /api/users 및 POST /api/auth/login 응답의 사용자 엔티티 인터페이스
 */
export interface UserEntity {
  /** 사용자 고유 식별자 (예: 'user-1', 'user-2') */
  id: string;

  /** 화면 표시용 사용자 이름 (예: '홍길동 (VIP)') */
  username: string;

  /** 사용자 권한 등급 ('admin' | 'member') */
  role: 'admin' | 'member';

  /** 테스트용 인증 베어러 토큰 */
  token: string;
}

/**
 * @description 호스트 localStorage(mfe:host-vite:auth-session)에 영속 저장되는 인증 세션 인터페이스
 */
export interface HostStoredAuthSession {
  /** 로그인된 사용자 고유 식별자 */
  userId: string;

  /** 화면 표시용 사용자 이름 */
  username: string;

  /** 사용자 권한 등급 */
  role: 'admin' | 'member';

  /** 백엔드 POST /api/auth/login에서 발급된 인증 토큰 */
  token: string;
}

/** 단일 사용자 엔티티 런타임 검증용 Zod 스키마 */
export const userEntitySchema: z.ZodType<UserEntity> = z.object({
  id: z.string().min(1),
  username: z.string().min(1),
  role: z.enum(['admin', 'member']),
  token: z.string().min(1),
});

/** 사용자 목록 배열 런타임 검증용 Zod 스키마 */
export const userListSchema: z.ZodType<UserEntity[]> = z.array(userEntitySchema);

/** 호스트 localStorage 인증 세션 런타임 검증용 Zod 스키마 */
export const hostStoredAuthSessionSchema: z.ZodType<HostStoredAuthSession> = z.object({
  userId: z.string().min(1),
  username: z.string().min(1),
  role: z.enum(['admin', 'member']),
  token: z.string().min(1),
});
