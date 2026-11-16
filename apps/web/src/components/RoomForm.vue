<script setup lang="ts">
import { ROOM_MAX_PERSONNEL_LIMIT, ROOM_TITLE_MAX_LENGTH } from '@study-room/shared';
import { reactive, ref, watch } from 'vue';
import type { RoomInput } from '@/api/rooms';
import {
  serverErrorsToRoomForm,
  validateRoomForm,
  type RoomFormErrors,
  type RoomFormValues,
} from '@/utils/room-form';
import ErrorMessage from './ErrorMessage.vue';

/**
 * 자습실 등록·수정 폼. 화면 검증을 먼저 하고, 통과하면 서버에 보낼 값을 submit으로 올린다.
 * 서버 에러 중 필드에 붙일 수 있는 것은 필드 아래에, 나머지는 폼 위에 보여준다.
 */
const props = defineProps<{
  initial: RoomFormValues;
  submitLabel: string;
  pending: boolean;
  serverError?: unknown;
}>();
const emit = defineEmits<{ submit: [input: RoomInput]; cancel: [] }>();

const values = reactive<RoomFormValues>({ ...props.initial });
const fieldErrors = ref<RoomFormErrors>({});
const generalError = ref<unknown>(null);

watch(
  () => props.serverError,
  (error) => {
    if (error === undefined || error === null) {
      fieldErrors.value = {};
      generalError.value = null;
      return;
    }
    const mapped = serverErrorsToRoomForm(error);
    fieldErrors.value = mapped ?? {};
    generalError.value = mapped === null ? error : null;
  },
);

function submit(): void {
  const result = validateRoomForm(values);
  if (!result.ok) {
    fieldErrors.value = result.errors;
    return;
  }
  fieldErrors.value = {};
  emit('submit', result.input);
}
</script>

<template>
  <form class="space-y-4" novalidate @submit.prevent="submit">
    <ErrorMessage v-if="generalError" :error="generalError" />

    <label class="block text-sm">
      <span class="mb-1 block text-slate-600">이름</span>
      <input
        v-model="values.title"
        type="text"
        :maxlength="ROOM_TITLE_MAX_LENGTH"
        class="w-full rounded-md border border-slate-300 px-3 py-2"
        data-testid="room-title"
      />
      <span v-if="fieldErrors.title" class="mt-1 block text-xs text-red-600">{{
        fieldErrors.title
      }}</span>
    </label>

    <label class="block text-sm">
      <span class="mb-1 block text-slate-600">최대 인원</span>
      <input
        v-model.number="values.maxPersonnel"
        type="number"
        min="1"
        :max="ROOM_MAX_PERSONNEL_LIMIT"
        class="w-40 rounded-md border border-slate-300 px-3 py-2"
        data-testid="room-max"
      />
      <span v-if="fieldErrors.maxPersonnel" class="mt-1 block text-xs text-red-600">
        {{ fieldErrors.maxPersonnel }}
      </span>
    </label>

    <div class="grid gap-4 sm:grid-cols-2">
      <label class="block text-sm">
        <span class="mb-1 block text-slate-600">운영 시작 (KST)</span>
        <input
          v-model="values.startDate"
          type="datetime-local"
          class="w-full rounded-md border border-slate-300 px-3 py-2"
          data-testid="room-start"
        />
        <span v-if="fieldErrors.startDate" class="mt-1 block text-xs text-red-600">
          {{ fieldErrors.startDate }}
        </span>
      </label>
      <label class="block text-sm">
        <span class="mb-1 block text-slate-600">운영 종료 (KST)</span>
        <input
          v-model="values.endDate"
          type="datetime-local"
          class="w-full rounded-md border border-slate-300 px-3 py-2"
          data-testid="room-end"
        />
        <span v-if="fieldErrors.endDate" class="mt-1 block text-xs text-red-600">{{
          fieldErrors.endDate
        }}</span>
      </label>
    </div>

    <div class="flex justify-end gap-2">
      <button
        type="button"
        class="rounded-md border border-slate-300 px-4 py-2 text-sm"
        @click="emit('cancel')"
      >
        취소
      </button>
      <button
        type="submit"
        class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white enabled:hover:bg-slate-700 disabled:opacity-50"
        :disabled="props.pending"
      >
        {{ props.pending ? '저장 중...' : props.submitLabel }}
      </button>
    </div>
  </form>
</template>
