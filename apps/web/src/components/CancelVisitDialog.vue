<script setup lang="ts">
import { VISIT_CANCEL_REASON_MAX_LENGTH } from '@study-room/shared';
import { computed, ref } from 'vue';
import { useCancelVisit } from '@/queries/useRoomVisits';
import { formatKst } from '@/utils/datetime';
import BaseDialog from './BaseDialog.vue';
import ErrorMessage from './ErrorMessage.vue';

/**
 * 강사 취소 (R11). 사유가 필수다. 서버와 같은 규칙(앞뒤 공백 제거 후 비면 없음)으로 버튼을 막는다.
 */
const props = defineProps<{ visit: { visitId: number; studentName: string; visitAt: string } }>();
const emit = defineEmits<{ close: []; canceled: [] }>();

const reason = ref('');
const trimmed = computed(() => reason.value.trim());
const cancel = useCancelVisit();

async function submit(): Promise<void> {
  if (trimmed.value === '') {
    return;
  }
  await cancel.mutateAsync({ visitId: props.visit.visitId, reason: trimmed.value });
  emit('canceled');
}
</script>

<template>
  <BaseDialog title="신청 취소" @close="emit('close')">
    <p class="mb-4 text-sm text-slate-600">
      <strong>{{ props.visit.studentName }}</strong> 학생의
      {{ formatKst(props.visit.visitAt) }} 방문 신청을 취소합니다. 사유는 학생에게 보여집니다.
    </p>
    <form @submit.prevent="submit().catch(() => undefined)">
      <label class="mb-1 block text-sm text-slate-600" for="cancel-reason">취소 사유 (필수)</label>
      <textarea
        id="cancel-reason"
        v-model="reason"
        rows="3"
        :maxlength="VISIT_CANCEL_REASON_MAX_LENGTH"
        class="mb-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        data-testid="cancel-reason"
      />
      <p class="mb-4 text-right text-xs text-slate-400">
        {{ reason.length }} / {{ VISIT_CANCEL_REASON_MAX_LENGTH }}
      </p>
      <ErrorMessage v-if="cancel.isError.value" class="mb-4" :error="cancel.error.value" />
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
          class="rounded-md bg-red-600 px-4 py-2 text-sm text-white enabled:hover:bg-red-500 disabled:opacity-50"
          :disabled="trimmed === '' || cancel.isPending.value"
        >
          {{ cancel.isPending.value ? '취소 중...' : '신청 취소' }}
        </button>
      </div>
    </form>
  </BaseDialog>
</template>
