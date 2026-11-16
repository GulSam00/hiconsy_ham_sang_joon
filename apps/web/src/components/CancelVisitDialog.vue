<script setup lang="ts">
import { VISIT_CANCEL_REASON_MAX_LENGTH } from '@study-room/shared';
import { computed, ref } from 'vue';
import { useCancelVisit } from '@/queries/useRoomVisits';
import { formatKst } from '@/utils/datetime';
import BaseDialog from './BaseDialog.vue';
import ErrorMessage from './ErrorMessage.vue';

/**
 * 신청 취소 대화상자. 강사(R11)는 사유가 필수이고, 학생은 선택이다.
 * 서버와 같은 규칙(앞뒤 공백 제거 후 비면 사유 없음)을 쓴다.
 */
const props = withDefaults(
  defineProps<{
    visit: { visitId: number; studentName?: string; visitAt: string };
    reasonRequired?: boolean;
  }>(),
  { reasonRequired: true },
);
const emit = defineEmits<{ close: []; canceled: [] }>();

const reason = ref('');
const trimmed = computed(() => reason.value.trim());
const canSubmit = computed(() => !props.reasonRequired || trimmed.value !== '');
const cancel = useCancelVisit();

async function submit(): Promise<void> {
  if (!canSubmit.value) {
    return;
  }
  await cancel.mutateAsync({
    visitId: props.visit.visitId,
    reason: trimmed.value === '' ? undefined : trimmed.value,
  });
  emit('canceled');
}
</script>

<template>
  <BaseDialog title="신청 취소" @close="emit('close')">
    <p class="mb-4 text-sm text-slate-600">
      <template v-if="props.visit.studentName">
        <strong>{{ props.visit.studentName }}</strong> 학생의
      </template>
      {{ formatKst(props.visit.visitAt) }} 방문 신청을 취소합니다.
      <template v-if="props.reasonRequired">사유는 학생에게 보여집니다.</template>
      <template v-else>취소하면 자리가 다른 학생에게 돌아갑니다.</template>
    </p>
    <form @submit.prevent="submit().catch(() => undefined)">
      <label class="mb-1 block text-sm text-slate-600" for="cancel-reason">
        취소 사유 {{ props.reasonRequired ? '(필수)' : '(선택)' }}
      </label>
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
          :disabled="!canSubmit || cancel.isPending.value"
        >
          {{ cancel.isPending.value ? '취소 중...' : '신청 취소' }}
        </button>
      </div>
    </form>
  </BaseDialog>
</template>
