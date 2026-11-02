/**
 * @file server.ts
 * @app api-server (Scope: api | Port: 4000)
 * @exposed false
 * @description mfe_study.db 파일 데이터베이스를 초기화하고 Port 4000에서 백엔드 API 서버를 구동하는 진입점입니다.
 */
import { createApp } from './app.js';
import { DEFAULT_DB_PATH, createDatabaseClient } from './db/client.js';

/** 백엔드 API 서버 고정 포트 번호 (루트 SSOT § 5.5 계약) */
const PORT = Number(process.env.PORT ?? 4000);

/** 서버에서 사용할 SQLite 데이터베이스 인스턴스 */
const db = createDatabaseClient({
  dbPath: DEFAULT_DB_PATH,
  autoInitialize: true,
});

const app = createApp(db);

const server = app.listen(PORT, () => {
  console.log(
    `🚀 [api-server] SQLite(WAL/FK) 백엔드 API 서버가 http://localhost:${PORT} 에서 구동 중입니다.`,
  );
});

/**
 * 프로세스 종료 시그널(SIGINT, SIGTERM) 수신 시 HTTP 서버와 SQLite 파일 커넥션을 안전하게 닫습니다.
 *
 * @returns void
 */
function handleGracefulShutdown(): void {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on('SIGINT', handleGracefulShutdown);
process.on('SIGTERM', handleGracefulShutdown);
