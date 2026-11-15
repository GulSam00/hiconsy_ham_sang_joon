<script setup lang="ts">
import BaseDialog from './BaseDialog.vue';
import ErrorMessage from './ErrorMessage.vue';

const props = defineProps<{
  title: string;
  confirmLabel: string;
  pending?: boolean;
  error?: unknown;
}>();
const emit = defineEmits<{ confirm: []; close: [] }>();
</script>

<template>
  <BaseDialog :title="props.title" @close="emit('close')">
    <div class="mb-4 text-sm text-slate-600"><slot /></div>
    <ErrorMessage v-if="props.error" class="mb-4" :error="props.error" />
    <div class="flex justify-end gap-2">
      <button
        type="button"
        class="rounded-md border border-slate-300 px-4 py-2 text-sm"
        @click="emit('close')"
      >
        닫기
      </button>
      <button
        type="button"
        class="rounded-md bg-red-600 px-4 py-2 text-sm text-white enabled:hover:bg-red-500 disabled:opacity-50"
        :disabled="props.pending"
        @click="emit('confirm')"
      >
        {{ props.pending ? '처리 중...' : props.confirmLabel }}
      </button>
    </div>
  </BaseDialog>
</template>
