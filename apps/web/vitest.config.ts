import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    // localStorage, DOM 이벤트가 필요한 저장소·컴포넌트 테스트용. jsdom보다 가볍다.
    environment: 'happy-dom',
  },
});
