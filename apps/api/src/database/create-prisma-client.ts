import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '../generated/prisma/client';
import { resolveDatabaseUrl } from './database-url';

/**
 * 다른 쓰기가 DB 잠금을 잡고 있을 때 SQLITE_BUSY로 바로 실패하지 않고 기다리는 최대 시간.
 * SQLite는 쓰기를 DB 단위로 직렬화하므로, 동시 신청이 몰릴 때 짧게 대기하게 한다.
 */
export const SQLITE_BUSY_TIMEOUT_MS = 5_000;

/** PrismaService(런타임)와 시드 스크립트가 같은 연결 설정을 쓰도록 한 곳에서 만든다. */
export function createPrismaAdapter(url: string = resolveDatabaseUrl()): PrismaBetterSqlite3 {
  return new PrismaBetterSqlite3({ url, timeout: SQLITE_BUSY_TIMEOUT_MS });
}

/**
 * WAL 모드: 읽기가 쓰기를 막지 않아 동시 요청 처리량이 좋아진다. DB 파일에 기록되는 설정이다.
 * SQLite 전용 PRAGMA는 이 함수에만 둔다. PostgreSQL로 옮기면 이 호출만 지우면 된다.
 */
export async function applySqlitePragmas(client: PrismaClient): Promise<void> {
  await client.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
}

export function createPrismaClient(url?: string): PrismaClient {
  return new PrismaClient({ adapter: createPrismaAdapter(url) });
}
