/**
 * @file cli.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description 터미널에서 3종 SQL(schema, reset, drop, setup)을 수동으로 실행할 수 있는 크로스 플랫폼 DB 관리 CLI 스크립트입니다.
 */
import { DEFAULT_DB_PATH, createDatabaseClient, executeSqlFile } from './client.js';

/** CLI 인자로 전달 가능한 명령어 타입 */
type DbCliCommand = 'schema' | 'reset' | 'drop' | 'setup';

/**
 * 전달받은 명령어에 따라 mfe_study.db에 3종 SQL 파일을 실행합니다.
 *
 * @param command - 실행할 DB 관리 명령 ('schema' | 'reset' | 'drop' | 'setup')
 * @returns void
 */
export function runDbCli(command: DbCliCommand): void {
  const db = createDatabaseClient({ dbPath: DEFAULT_DB_PATH, autoInitialize: false });

  try {
    // [분기 설명] 각 CLI 명령에 맞춰 3종 SQL 파일을 단독 또는 조합(setup = schema + reset)으로 실행합니다.
    switch (command) {
      case 'schema':
        executeSqlFile(db, '01-schema.sql');
        console.log('✅ [DB CLI] 01-schema.sql 스키마 및 한글 코멘트 생성 완료');
        break;
      case 'reset':
        executeSqlFile(db, '01-schema.sql');
        executeSqlFile(db, '02-reset-seed.sql');
        console.log('✅ [DB CLI] 02-reset-seed.sql 시드 데이터 초기화 완료');
        break;
      case 'drop':
        executeSqlFile(db, '03-drop-all.sql');
        console.log('✅ [DB CLI] 03-drop-all.sql 전체 테이블·인덱스 삭제 완료');
        break;
      case 'setup':
        executeSqlFile(db, '03-drop-all.sql');
        executeSqlFile(db, '01-schema.sql');
        executeSqlFile(db, '02-reset-seed.sql');
        console.log('✅ [DB CLI] DB 전체 클린 재설치(03 -> 01 -> 02) 완료');
        break;
      default:
        console.error(`❌ 지원하지 않는 명령어입니다: ${String(command)}`);
        process.exitCode = 1;
    }
  } finally {
    db.close();
  }
}

// 터미널 직접 실행 시 첫 번째 인자(schema | reset | drop | setup)로 실행
const rawArg = (process.argv[2] ?? 'setup') as DbCliCommand;
runDbCli(rawArg);
