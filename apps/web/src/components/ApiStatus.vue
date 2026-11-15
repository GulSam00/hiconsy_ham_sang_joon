<script setup lang="ts">
import { useHealth } from '@/queries/useHealth';

const { isSuccess, isError } = useHealth();
</script>

<template>
  <span class="inline-flex items-center gap-1.5 text-xs text-slate-500">
    <span
      class="size-2 rounded-full"
      :class="isSuccess ? 'bg-emerald-500' : isError ? 'bg-red-500' : 'bg-slate-300'"
      aria-hidden="true"
    />
    {{ isSuccess ? 'API 연결됨' : isError ? 'API 연결 끊김' : 'API 확인 중' }}
  </span>
</template>
