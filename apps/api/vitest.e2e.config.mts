import { defineConfig } from 'vitest/config';
import { swcPlugin } from './vitest.swc.mjs';

export default defineConfig({
  plugins: [swcPlugin],
  test: {
    include: ['test/**/*.e2e-spec.ts'],
    environment: 'node',
    // e2e는 이후 SQLite 파일 DB를 공유하므로 파일 단위 병렬 실행을 끈다.
    fileParallelism: false,
  },
});
