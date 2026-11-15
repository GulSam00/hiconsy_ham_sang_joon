import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

const DEFAULT_PORT = 3000;

function resolvePort(raw: string | undefined): number {
  if (raw === undefined || raw === '') {
    return DEFAULT_PORT;
  }
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`PORT 환경 변수가 올바르지 않습니다: "${raw}" (1~65535 사이 정수여야 합니다)`);
  }
  return port;
}

async function bootstrap(): Promise<void> {
  const port = resolvePort(process.env.PORT);
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  await app.listen(port);
  Logger.log(`API 서버가 http://localhost:${port} 에서 실행 중입니다.`, 'Bootstrap');
}

bootstrap().catch((error: unknown) => {
  Logger.error(
    'API 서버 기동에 실패했습니다.',
    error instanceof Error ? error.stack : String(error),
    'Bootstrap',
  );
  process.exit(1);
});
