import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, join, resolve } from 'node:path';
import { TEST_DATABASE_FILE_NAME, TEST_DATABASE_URL } from './test-database.mjs';

/** SQLite 본 파일과 WAL 모드의 부속 파일 */
const SQLITE_FILE_SUFFIXES = ['', '-wal', '-shm', '-journal'] as const;

/**
 * 테스트 실행 전 테스트 DB를 새로 만든다.
 *
 * `prisma migrate reset` 대신 "파일 삭제 → migrate deploy"를 쓴다.
 * 테스트 DB는 테스트가 만들고 버리는 파일이라 파일 단위로 지우는 것이 가장 단순하고,
 * reset처럼 대상 DB를 통째로 지우는 명령을 테스트 코드에 두지 않기 위해서다.
 */
export default function setup(): void {
  const databasePath = resolve(process.cwd(), TEST_DATABASE_URL.replace(/^file:/, ''));

  // 설정 실수로 개발 DB를 지우는 일을 막는다.
  if (basename(databasePath) !== TEST_DATABASE_FILE_NAME) {
    throw new Error(`테스트 DB 경로가 예상과 다릅니다: ${databasePath}`);
  }
  for (const suffix of SQLITE_FILE_SUFFIXES) {
    rmSync(`${databasePath}${suffix}`, { force: true });
  }

  // npx 대신 Prisma CLI를 현재 Node로 직접 실행해 OS(Windows 포함)와 무관하게 동작하게 한다.
  // npm 스크립트는 apps/api에서 실행되므로 그 기준으로 prisma 패키지를 찾는다 (워크스페이스 호이스팅 포함).
  const requireFromApi = createRequire(join(process.cwd(), 'package.json'));
  const prismaCli = requireFromApi.resolve('prisma/build/index.js');
  try {
    execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
      stdio: 'pipe',
    });
  } catch (error: unknown) {
    // execFileSync 에러에는 자식 프로세스의 stderr가 담겨 있다. 원인을 그대로 보여줘야 디버깅할 수 있다.
    const stderr =
      error instanceof Error && 'stderr' in error && Buffer.isBuffer(error.stderr)
        ? error.stderr.toString()
        : '';
    throw new Error(`테스트 DB 마이그레이션(prisma migrate deploy)에 실패했습니다.\n${stderr}`, {
      cause: error,
    });
  }
}
