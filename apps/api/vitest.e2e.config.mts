import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './test/test-database.mjs';
import { swcPlugin } from './vitest.swc.mjs';

export default defineConfig({
  plugins: [swcPlugin],
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    env: { DATABASE_URL: TEST_DATABASE_URL },
    // 모든 테스트 파일이 같은 SQLite 파일을 공유하므로 파일 단위 병렬 실행을 끈다.
    fileParallelism: false,
  },
});
