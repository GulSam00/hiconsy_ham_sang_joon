import { defineConfig } from 'vitest/config';
import { swcPlugin } from './vitest.swc.mjs';

export default defineConfig({
  plugins: [swcPlugin],
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
