<script setup lang="ts">
import type { HealthResponse } from '@study-room/shared';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { fetchHealth } from './health';

type HealthState =
  { kind: 'loading' } | { kind: 'ok'; data: HealthResponse } | { kind: 'error'; message: string };

const state = ref<HealthState>({ kind: 'loading' });
const controller = new AbortController();

onMounted(async () => {
  try {
    state.value = { kind: 'ok', data: await fetchHealth(controller.signal) };
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }
    state.value = {
      kind: 'error',
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    };
  }
});

onBeforeUnmount(() => controller.abort());
</script>

<template>
  <main>
    <h1>자습실 예약</h1>
    <p v-if="state.kind === 'loading'">API 연결 확인 중...</p>
    <p v-else-if="state.kind === 'ok'">API 연결 정상 ({{ state.data.timestamp }})</p>
    <p v-else role="alert">API 연결 실패: {{ state.message }}</p>
  </main>
</template>
