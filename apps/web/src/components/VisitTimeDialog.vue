<script setup lang="ts">
import type { RoomResponse } from '@study-room/shared';
import { computed, ref } from 'vue';
import { useNow } from '@/composables/useNow';
import { formatKst, toKstInputValue } from '@/utils/datetime';
import { validateVisitTime, visitTimeBounds } from '@/utils/visit-form';
import BaseDialog from './BaseDialog.vue';
import ErrorMessage from './ErrorMessage.vue';

/**
 * 방문 시각 선택 (신청·시간 수정 공용). 저장은 부모가 하고, 서버 에러는 부모가 내려준다.
 * 시각 검사는 화면에서 먼저 하지만 최종 판단은 서버다 (R4).
 */
const props = defineProps<{
  title: string;
  room: Pick<RoomResponse, 'title' | 'startDate' | 'endDate'>;
  submitLabel: string;
  initialVisitAt?: string;
  pending: boolean;
  serverError?: unknown;
}>();
const emit = defineEmits<{ submit: [visitAt: string]; close: [] }>();

const now = useNow();
const value = ref(props.initialVisitAt === undefined ? '' : toKstInputValue(props.initialVisitAt));
const clientError = ref<string | null>(null);
const bounds = computed(() => visitTimeBounds(props.room, now.value));

function submit(): void {
  const result = validateVisitTime(value.value, props.room, now.value);
  if (!result.ok) {
    clientError.value = result.message;
    return;
  }
  clientError.value = null;
  emit('submit', result.visitAt);
}
</script>

<template>
  <BaseDialog :title="props.title" @close="emit('close')">
    <p class="mb-4 text-sm text-slate-600">
      <strong>{{ props.room.title }}</strong><br />
      운영 기간: {{ formatKst(props.room.startDate) }} ~ {{ formatKst(props.room.endDate) }}
    </p>
    <form novalidate @submit.prevent="submit">
      <label class="mb-4 block text-sm">
        <span class="mb-1 block text-slate-600">방문 일시 (KST)</span>
        <input
          v-model="value"
          type="datetime-local"
          :min="bounds.min"
          :max="bounds.max"
          class="w-full rounded-md border border-slate-300 px-3 py-2"
          data-testid="visit-at"
        />
        <span v-if="clientError" class="mt-1 block text-xs text-red-600">{{ clientError }}</span>
      </label>
      <ErrorMessage v-if="props.serverError" class="mb-4" :error="props.serverError" />
      <div class="flex justify-end gap-2">
        <button
          type="button"
          class="rounded-md border border-slate-300 px-4 py-2 text-sm"
          @click="emit('close')"
        >
          닫기
        </button>
        <button
          type="submit"
          class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white enabled:hover:bg-slate-700 disabled:opacity-50"
          :disabled="props.pending"
        >
          {{ props.pending ? '처리 중...' : props.submitLabel }}
        </button>
      </div>
    </form>
  </BaseDialog>
</template>
