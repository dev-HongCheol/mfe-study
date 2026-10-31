/**
 * @file auth.service.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description 사용자 전체 목록 조회 및 userId 기반 계정 전환 로그인 비즈니스 로직을 수행합니다.
 */
import type { DatabaseSync } from 'node:sqlite';
import { AppError } from '../../middlewares/response.js';
import type { UserEntity } from '../../types/contracts.js';

/**
 * 시드 등록된 모든 테스트 사용자 목록을 조회합니다.
 *
 * @param db - SQLite DatabaseSync 인스턴스
 * @returns 전체 사용자 엔티티 배열
 */
export function listUsers(db: DatabaseSync): UserEntity[] {
  const rows = db
    .prepare('SELECT id, username, role, token FROM users ORDER BY id ASC')
    .all() as unknown as UserEntity[];

  return rows;
}

/**
 * 지정된 userId로 사용자를 조회하여 로그인 정보 및 토큰을 반환합니다.
 *
 * @param db - SQLite DatabaseSync 인스턴스
 * @param userId - 로그인할 대상 사용자 고유 ID
 * @returns 조회된 사용자 엔티티 (존재하지 않으면 404 AppError 발생)
 */
export function loginByUserId(db: DatabaseSync, userId: string): UserEntity {
  const user = db
    .prepare('SELECT id, username, role, token FROM users WHERE id = ?')
    .get(userId) as unknown as UserEntity | undefined;

  // [분기 설명] 요청한 userId가 users 테이블에 존재하지 않으면 표준 404 NOT_FOUND 비즈니스 예외를 던집니다.
  if (!user) {
    throw new AppError({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: `해당 사용자(${userId})를 찾을 수 없습니다.`,
    });
  }

  return user;
}
