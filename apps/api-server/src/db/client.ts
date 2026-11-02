import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

/** 현재 파일(src/db/client.ts)의 디렉토리 경로 */
const CURRENT_DIR = dirname(fileURLToPath(import.meta.url));

/** api-server 루트 디렉토리 경로 (apps/api-server) */
export const API_SERVER_ROOT = resolve(CURRENT_DIR, '..', '..');

/** 3종 SQL 파일이 보관된 sql/ 디렉토리 경로 */
export const SQL_DIR = resolve(API_SERVER_ROOT, 'sql');

/** 기본 파일 데이터베이스 경로 (apps/api-server/mfe_study.db) */
export const DEFAULT_DB_PATH = resolve(API_SERVER_ROOT, 'mfe_study.db');

/** 실행 가능한 표준 3종 SQL 파일명 타입 */
export type SqlFileName = '01-schema.sql' | '02-reset-seed.sql' | '03-drop-all.sql';

/**
 * @description SQLite 데이터베이스 연결 생성 옵션 인터페이스
 */
export interface DatabaseClientOptions {
  /** 데이터베이스 파일 경로 (기본값: 'apps/api-server/mfe_study.db', 테스트 시 ':memory:' 또는 임시 파일 경로) */
  dbPath?: string;

  /** 연결 직후 users 테이블이 없거나 비어 있을 때 01-schema.sql과 02-reset-seed.sql을 자동 실행할지 여부 (기본값: true) */
  autoInitialize?: boolean;
}

/**
 * @description GET /api/health 엔드포인트가 반환하는 DB 엔진 및 서버 상태 페이로드 인터페이스
 */
export interface HealthStatusPayload {
  /** API 서버 프로세스 정상 가동 상태 ('ok') */
  status: 'ok';

  /** 현재 SQLite 커넥션에 적용된 저널 모드 조회값 (파일 DB: 'wal', 인메모리 DB: 'memory') */
  dbMode: string;

  /** PRAGMA foreign_keys 마스터 스위치가 실제로 켜져(1) 있는지 여부 */
  foreignKeys: boolean;
}

/**
 * 지정된 3종 SQL 파일 중 하나를 읽어 주어진 DatabaseSync 인스턴스에서 실행합니다.
 *
 * @param db - 대상 SQLite DatabaseSync 인스턴스
 * @param fileName - 실행할 SQL 파일명 ('01-schema.sql' | '02-reset-seed.sql' | '03-drop-all.sql')
 * @returns void
 */
export function executeSqlFile(db: DatabaseSync, fileName: SqlFileName): void {
  const filePath = resolve(SQL_DIR, fileName);
  const sqlContent = readFileSync(filePath, 'utf-8');
  db.exec(sqlContent);
}

/**
 * SQLite 데이터베이스 커넥션을 생성하고 외래키(FOREIGN KEY) 및 WAL 저널 모드를 활성화합니다.
 *
 * @param options - DB 파일 경로 및 자동 스키마·시드 초기화 여부 옵션
 * @returns 초기화된 DatabaseSync 인스턴스
 */
export function createDatabaseClient(options: DatabaseClientOptions = {}): DatabaseSync {
  const dbPath = options.dbPath ?? DEFAULT_DB_PATH;
  const autoInitialize = options.autoInitialize ?? true;

  const db = new DatabaseSync(dbPath);

  // [Study 05 #05 방어 설계]
  // SQLite는 하위 호환성 때문에 커넥션을 열 때마다 외래키 검사가 기본적으로 OFF(0) 상태입니다.
  // 따라서 커넥션 생성 직후 반드시 외래키 마스터 스위치와 동시성 WAL 모드를 강제로 켭니다.
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec('PRAGMA journal_mode = WAL;');

  // [분기 설명] autoInitialize가 활성화된 경우, 스키마(01-schema.sql)를 보장하고
  // 아직 시드 유저가 0건인 초기 상태라면 시드 데이터(02-reset-seed.sql)까지 자동으로 채워 넣습니다.
  if (autoInitialize) {
    executeSqlFile(db, '01-schema.sql');
    const userCountRow = db.prepare('SELECT COUNT(*) AS cnt FROM users').get() as
      | { cnt: number | bigint }
      | undefined;

    if (!userCountRow || Number(userCountRow.cnt) === 0) {
      executeSqlFile(db, '02-reset-seed.sql');
    }
  }

  return db;
}

/**
 * 현재 SQLite 커넥션의 PRAGMA 상태(journal_mode, foreign_keys)를 실시간으로 조회하여 반환합니다.
 *
 * @param db - 점검할 SQLite DatabaseSync 인스턴스
 * @returns 서버 상태 및 DB PRAGMA 활성화 정보
 */
export function getDatabaseHealth(db: DatabaseSync): HealthStatusPayload {
  const journalRow = db.prepare('PRAGMA journal_mode;').get() as
    | { journal_mode?: string }
    | undefined;
  const fkRow = db.prepare('PRAGMA foreign_keys;').get() as
    | { foreign_keys?: number | bigint }
    | undefined;

  return {
    status: 'ok',
    dbMode: String(journalRow?.journal_mode ?? 'unknown').toLowerCase(),
    foreignKeys: Number(fkRow?.foreign_keys ?? 0) === 1,
  };
}

/**
 * Node.js 22 내장 node:sqlite(DatabaseSync)에서 BEGIN IMMEDIATE ~ COMMIT / ROLLBACK 트랜잭션 라이프사이클을 보장합니다.
 *
 * @param db - 트랜잭션을 실행할 DatabaseSync 인스턴스
 * @param work - 트랜잭션 내부에서 동기적으로 실행할 콜백 함수
 * @returns 콜백 함수(work)의 실행 결과값
 */
export function runInTransaction<T>(db: DatabaseSync, work: () => T): T {
  // [Study 05 #06 방어 설계]
  // 일반 BEGIN(DEFERRED)과 달리 BEGIN IMMEDIATE는 트랜잭션 시작 즉시 쓰기 잠금(Lock)을 선점하여,
  // 재고 조회(SELECT)와 장바구니 수정(UPSERT) 사이에 다른 요청이 끼어드는 동시성 경합을 차단합니다.
  db.exec('BEGIN IMMEDIATE;');
  try {
    const result = work();
    db.exec('COMMIT;');
    return result;
  } catch (err) {
    // [분기 설명] 작업 도중 재고 부족이나 제약조건 위반 등 예외가 발생하면 즉시 ROLLBACK하여 원상복구합니다.
    // 단, SQLite 엔진이 치명적 오류로 트랜잭션을 이미 자동 종료한 경우 ROLLBACK의 2차 예외가 원본 예외(err)를 덮어쓰지 않도록 보호합니다.
    try {
      db.exec('ROLLBACK;');
    } catch {
      // 이미 롤백된 상태이므로 원본 예외 보존을 위해 무시
    }
    throw err;
  }
}

/**
 * apps/api-server/sql/ 폴더 내 3종 SQL 파일과 .sql-hashes.json의 SHA-256 해시 일치 여부를 자체 검증합니다.
 *
 * @returns 모든 3종 SQL 해시가 일치하는지 여부
 */
export function verifyLocalSqlHashes(): boolean {
  const hashFilePath = resolve(SQL_DIR, '.sql-hashes.json');
  if (!existsSync(hashFilePath)) {
    return false;
  }

  const savedHashes = JSON.parse(readFileSync(hashFilePath, 'utf-8')) as Record<string, string>;
  const requiredFiles: SqlFileName[] = ['01-schema.sql', '02-reset-seed.sql', '03-drop-all.sql'];

  for (const fileName of requiredFiles) {
    const filePath = resolve(SQL_DIR, fileName);
    if (!existsSync(filePath)) {
      return false;
    }
    const normalized = readFileSync(filePath, 'utf-8').replace(/\r\n/g, '\n');
    const actualHash = createHash('sha256').update(normalized, 'utf-8').digest('hex');
    if (savedHashes[fileName] !== actualHash) {
      return false;
    }
  }

  return true;
}
