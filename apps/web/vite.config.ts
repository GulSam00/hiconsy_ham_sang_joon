import { fileURLToPath, URL } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { API_PREFIX } from '@study-room/shared';
import { defineConfig } from 'vite';

const API_TARGET = process.env.VITE_API_TARGET ?? 'http://localhost:3000';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    // 개발 중에는 같은 origin으로 프록시해 CORS 설정 없이 API를 호출한다.
    proxy: {
      [`/${API_PREFIX}`]: {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
