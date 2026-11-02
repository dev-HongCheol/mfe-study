/**
 * @file client.test.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description [TC-01 / EC-01] SQLite 커넥션 초기화(PRAGMA foreign_keys, WAL/memory 모드) 및 runInTransaction(COMMIT / ROLLBACK) 라이프사이클을 검증하는 단위 테스트입니다.
 */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createDatabaseClient, getDatabaseHealth, runInTransaction } from './client.js';

describe('DB 클라이언트 및 트랜잭션 라이프사이클 검증 (TC-01 & EC-01)', () => {
  /** 파일 기반 WAL 모드 검증을 위한 임시 디렉토리 경로 */
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'mfe-api-db-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('TC-01: 파일 DB(wal)와 인메모리 DB(memory)에서 PRAGMA가 활성화되고 runInTransaction 성공 시 COMMIT되어야 한다', () => {
    // 1) 파일 기반 DB 검증 (journal_mode = 'wal', foreign_keys = true)
    const fileDbPath = join(tempDir, 'test-wal.db');
    const fileDb = createDatabaseClient({ dbPath: fileDbPath, autoInitialize: true });
    const fileHealth = getDatabaseHealth(fileDb);

    expect(fileHealth.status).toBe('ok');
    expect(fileHealth.foreignKeys).toBe(true);
    expect(fileHealth.dbMode).toBe('wal');
    fileDb.close();

    // 2) 인메모리 DB 검증 (journal_mode = 'memory', foreign_keys = true) 및 COMMIT 검증
    const memoryDb = createDatabaseClient({ dbPath: ':memory:', autoInitialize: true });
    const memoryHealth = getDatabaseHealth(memoryDb);

    expect(memoryHealth.foreignKeys).toBe(true);
    expect(memoryHealth.dbMode).toBe('memory');

    // 트랜잭션 내부에서 신규 사용자 추가 후 정상 종료 -> COMMIT 확인
    const insertedId = runInTransaction(memoryDb, () => {
      memoryDb
        .prepare('INSERT INTO users (id, username, role, token) VALUES (?, ?, ?, ?)')
        .run('user-tx-ok', '트랜잭션 유저', 'member', 'token-tx-ok');
      return 'user-tx-ok';
    });

    expect(insertedId).toBe('user-tx-ok');
    const savedUser = memoryDb
      .prepare('SELECT id, username FROM users WHERE id = ?')
      .get('user-tx-ok') as { id: string; username: string } | undefined;
    expect(savedUser?.username).toBe('트랜잭션 유저');

    memoryDb.close();
  });

  it('EC-01: runInTransaction 도중 예외가 발생하면 자동 ROLLBACK되어 이전 쿼리가 원상복구되어야 한다', () => {
    const memoryDb = createDatabaseClient({ dbPath: ':memory:', autoInitialize: true });

    expect(() =>
      runInTransaction(memoryDb, () => {
        memoryDb
          .prepare('INSERT INTO users (id, username, role, token) VALUES (?, ?, ?, ?)')
          .run('user-tx-fail', '롤백될 유저', 'member', 'token-tx-fail');

        // 의도적 에러 발생 -> 앞선 INSERT까지 취소되어야 함
        throw new Error('트랜잭션 도중 강제 예외 발생');
      }),
    ).toThrow('트랜잭션 도중 강제 예외 발생');

    const rolledBackUser = memoryDb
      .prepare('SELECT id FROM users WHERE id = ?')
      .get('user-tx-fail');
    expect(rolledBackUser).toBeUndefined();

    memoryDb.close();
  });
});
