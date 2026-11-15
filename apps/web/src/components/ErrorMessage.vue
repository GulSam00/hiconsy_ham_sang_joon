<script setup lang="ts">
import { computed } from 'vue';
import { errorMessageOf } from '@/utils/error-message';

const props = defineProps<{ error: unknown; retry?: () => void }>();

const message = computed(() => errorMessageOf(props.error));
</script>

<template>
  <div
    role="alert"
    class="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
  >
    <span>{{ message }}</span>
    <button
      v-if="props.retry"
      type="button"
      class="shrink-0 rounded border border-red-300 px-2 py-1 hover:bg-red-100"
      @click="props.retry"
    >
      다시 시도
    </button>
  </div>
</template>
