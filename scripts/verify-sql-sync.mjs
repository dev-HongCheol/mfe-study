/**
 * @file verify-sql-sync.mjs
 * @app mfe-study-root (Scope: root / api)
 * @exposed false
 * @description 백엔드(apps/api-server/sql/)의 필수 3종 SQL 파일(01-schema.sql, 02-reset-seed.sql, 03-drop-all.sql)의 SHA-256 해시 동기화 여부 및 Node.js 22 내장 node:sqlite(:memory:) 순차 실행 무결성을 검증합니다.
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { WORKSPACE_ROOT, isDirectExecution } from './harness-utils.mjs';

/** 상시 세트로 관리되어야 하는 필수 3종 SQL 파일명 목록 */
export const REQUIRED_SQL_FILES = ['01-schema.sql', '02-reset-seed.sql', '03-drop-all.sql'];

/** 해시 기록 파일명 */
const HASH_FILE_NAME = '.sql-hashes.json';

/**
 * 문자열 콘텐츠의 SHA-256 해시값을 계산합니다 (`CRLF`와 `LF` 차이로 인한 해시 불일치를 막기 위해 `LF`로 정규화 후 계산).
 *
 * @param {string} content - 해시를 계산할 SQL 파일 내용
 * @returns {string} 16진수 SHA-256 해시 문자열
 */
export function computeNormalizedSha256(content) {
  const normalized = String(content).replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalized, 'utf-8').digest('hex');
}

/**
 * 지정된 SQL 폴더 내 3종 SQL 파일의 현재 SHA-256 해시를 계산하여 .sql-hashes.json에 저장합니다.
 *
 * @param {string} [sqlDir] - 3종 SQL 파일이 위치한 디렉토리 경로
 * @returns {Record<string, string>} 파일별 기록된 해시 맵
 */
export function updateSqlHashes(sqlDir = resolve(WORKSPACE_ROOT, 'apps', 'api-server', 'sql')) {
  /** 파일별 계산된 해시를 담을 객체 */
  const hashes = {};
  for (const fileName of REQUIRED_SQL_FILES) {
    const filePath = resolve(sqlDir, fileName);
    if (!existsSync(filePath)) {
      throw new Error(`필수 SQL 파일이 존재하지 않습니다: ${filePath}`);
    }
    hashes[fileName] = computeNormalizedSha256(readFileSync(filePath, 'utf-8'));
  }

  const hashFilePath = resolve(sqlDir, HASH_FILE_NAME);
  writeFileSync(hashFilePath, `${JSON.stringify(hashes, null, 2)}\n`, 'utf-8');
  return hashes;
}

/**
 * 3종 SQL 파일의 해시 일치 여부와 Node.js 22 내장 node:sqlite 인메모리 순차 실행(01 -> 02 -> 03 -> 01 -> 02) 무결성을 검증합니다.
 *
 * @param {string} [sqlDir] - 검증할 SQL 폴더 경로
 * @returns {{ valid: boolean, skipped?: boolean, error?: string }} 검증 결과 객체
 */
export function verifySqlSync(sqlDir = resolve(WORKSPACE_ROOT, 'apps', 'api-server', 'sql')) {
  // [분기 설명] 아직 Step 1.1(백엔드 구축) 이전이라 sql/ 폴더가 생성되지 않은 상태라면 통과(skipped) 처리합니다.
  if (!existsSync(sqlDir)) {
    return { valid: true, skipped: true };
  }

  const hashFilePath = resolve(sqlDir, HASH_FILE_NAME);
  if (!existsSync(hashFilePath)) {
    return {
      valid: false,
      error: `[SQL Sync 실패] ${HASH_FILE_NAME} 파일이 없습니다. 3종 SQL 작성 후 "pnpm sql:update"를 실행하세요.`,
    };
  }

  let savedHashes;
  try {
    savedHashes = JSON.parse(readFileSync(hashFilePath, 'utf-8'));
  } catch (err) {
    return {
      valid: false,
      error: `[SQL Sync 실패] ${HASH_FILE_NAME} 파싱 실패: ${err.message}`,
    };
  }

  /** 각 SQL 파일의 텍스트 내용을 보관하는 맵 */
  const sqlContents = {};

  // 1) 3종 파일 존재 및 해시 일치 여부 검증
  for (const fileName of REQUIRED_SQL_FILES) {
    const filePath = resolve(sqlDir, fileName);
    if (!existsSync(filePath)) {
      return {
        valid: false,
        error: `[SQL Sync 실패] 필수 SQL 파일이 누락되었습니다: ${fileName}`,
      };
    }

    const content = readFileSync(filePath, 'utf-8');
    sqlContents[fileName] = content;
    const currentHash = computeNormalizedSha256(content);

    if (savedHashes[fileName] !== currentHash) {
      return {
        valid: false,
        error: `[SQL Sync 실패] "${fileName}" 파일이 수정되었으나 해시(${HASH_FILE_NAME})가 갱신되지 않았습니다. 3종 SQL(01, 02, 03)을 모두 세트로 점검한 뒤 "pnpm sql:update"를 실행하세요.`,
      };
    }
  }

  // 2) Node.js 22 내장 node:sqlite (:memory:)에서 01 -> 02 -> 03 -> 01 -> 02 순차 멱등성 및 _schema_comments 검증
  try {
    const memoryDb = new DatabaseSync(':memory:');
    memoryDb.exec('PRAGMA foreign_keys = ON;');

    // 1차 생성 및 시드 투입
    memoryDb.exec(sqlContents['01-schema.sql']);
    memoryDb.exec(sqlContents['02-reset-seed.sql']);

    // 전체 삭제 후 재세팅(멱등성 확인)
    memoryDb.exec(sqlContents['03-drop-all.sql']);
    memoryDb.exec(sqlContents['01-schema.sql']);
    memoryDb.exec(sqlContents['02-reset-seed.sql']);

    // _schema_comments 메타 테이블 존재 및 최소 1건 이상 코멘트 등록 여부 확인
    const commentCountRow = memoryDb.prepare('SELECT COUNT(*) AS cnt FROM _schema_comments').get();
    if (!commentCountRow || Number(commentCountRow.cnt) === 0) {
      memoryDb.close();
      return {
        valid: false,
        error:
          '[SQL Sync 실패] _schema_comments 테이블에 등록된 테이블/컬럼 한글 설명이 0건입니다.',
      };
    }

    memoryDb.close();
    return { valid: true };
  } catch (err) {
    return {
      valid: false,
      error: `[SQL Sync 인메모리 실행 오류] 3종 SQL 순차 실행 중 에러가 발생했습니다: ${err.message}`,
    };
  }
}

// CLI 직접 실행 시 처리 (--update 지원)
if (isDirectExecution(import.meta.url)) {
  if (process.argv.includes('--update')) {
    const updated = updateSqlHashes();
    console.log('✅ 3종 SQL SHA-256 해시 업데이트 완료:', updated);
    process.exit(0);
  }

  const result = verifySqlSync();
  if (!result.valid) {
    console.error(result.error);
    process.exit(1);
  }
  console.log(
    result.skipped
      ? 'ℹ️ apps/api-server/sql 폴더가 아직 없어 SQL 검증을 건너뜁니다.'
      : '✅ 3종 SQL 해시 및 인메모리 멱등성 검증 통과!',
  );
}
