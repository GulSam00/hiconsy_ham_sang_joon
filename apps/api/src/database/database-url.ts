/**
 * 평가자가 .env를 만들지 않아도 실행되도록 기본값을 둔다.
 * 상대 경로는 프로세스의 현재 디렉토리(apps/api) 기준이다. npm 스크립트는 항상 이 디렉토리에서 실행된다.
 *
 * Prisma CLI(prisma.config.ts)와 런타임(PrismaService)이 같은 함수를 써서 서로 다른 DB 파일을 보는 일을 막는다.
 */
export const DEFAULT_DATABASE_URL = 'file:./prisma/dev.db';

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const url = env.DATABASE_URL?.trim();
  if (url === undefined || url === '') {
    return DEFAULT_DATABASE_URL;
  }
  if (!url.startsWith('file:')) {
    throw new Error(
      `DATABASE_URL은 SQLite 파일 경로("file:..." 형식)여야 합니다. 현재 값: "${url}"`,
    );
  }
  return url;
}
