/**
 * @file auth.schema.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description [POST /api/auth/login] 계정 전환 로그인 요청 Body를 검증하는 Zod 스키마입니다.
 */
import { z } from 'zod';

/** 로그인 요청 Body 검증 Zod 스키마 */
export const loginBodySchema = z.object({
  userId: z.string().trim().min(1, '사용자 ID(userId)는 필수입니다.'),
});

/**
 * @description 로그인 요청 Body 타입
 */
export type LoginBodyInput = z.infer<typeof loginBodySchema>;
