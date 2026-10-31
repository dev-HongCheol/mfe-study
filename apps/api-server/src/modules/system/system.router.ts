/**
 * @file system.router.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description [Study 05 #05] 서버 헬스체크(GET /api/health) 및 스키마 한글 코멘트 사전 조회(GET /api/schema-comments) 라우터를 제공합니다.
 */
import type { DatabaseSync } from 'node:sqlite';
import { Router } from 'express';
import { getDatabaseHealth } from '../../db/client.js';
import { sendSuccess } from '../../middlewares/response.js';
import type { SchemaCommentRecord, SchemaCommentRow } from '../../types/contracts.js';

/**
 * 시스템 진단 및 스키마 코멘트 조회를 담당하는 Express Router를 생성합니다.
 *
 * @param db - 주입할 SQLite DatabaseSync 인스턴스
 * @returns 구성된 Express Router 인스턴스
 */
export function createSystemRouter(db: DatabaseSync): Router {
  const router = Router();

  // 1) GET /api/health — SQLite PRAGMA(journal_mode, foreign_keys) 실시간 자가 점검
  router.get('/health', (_req, res) => {
    const health = getDatabaseHealth(db);
    return sendSuccess(res, health);
  });

  // 2) GET /api/schema-comments — _schema_comments 전체 한글 설명을 카멜 케이스로 반환
  router.get('/schema-comments', (_req, res) => {
    const rows = db
      .prepare(
        'SELECT table_name, column_name, comment FROM _schema_comments ORDER BY table_name ASC, column_name ASC',
      )
      .all() as unknown as SchemaCommentRow[];

    const records: SchemaCommentRecord[] = rows.map((row) => ({
      tableName: row.table_name,
      columnName: row.column_name ?? null,
      comment: row.comment,
    }));

    return sendSuccess(res, records);
  });

  return router;
}
