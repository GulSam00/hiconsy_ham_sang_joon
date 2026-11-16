<script setup lang="ts">
import type { ConflictingVisit } from '@study-room/shared';
import { computed } from 'vue';
import { formatKst } from '@/utils/datetime';
import type { RoomConflict } from '@/utils/conflicts';

/**
 * 자습실 수정 충돌(R6, R7) 안내. 강사가 예정 신청을 골라 취소(R11)한 뒤 다시 저장하는 흐름을 돕는다.
 * 지난 방문은 취소할 수 없으므로(R5) 버튼 대신 안내만 보여준다.
 */
const props = defineProps<{ conflict: RoomConflict }>();
const emit = defineEmits<{ cancelVisit: [visit: ConflictingVisit]; retry: []; dismiss: [] }>();

const visits = computed(() =>
  props.conflict.kind === 'CAPACITY'
    ? props.conflict.details.cancellableVisits
    : props.conflict.details.conflicts,
);

const summary = computed(() => {
  if (props.conflict.kind === 'CAPACITY') {
    const { activeCount, requestedMaxPersonnel } = props.conflict.details;
    return `현재 신청 ${activeCount}명이 새 정원 ${requestedMaxPersonnel}명보다 많습니다. ${activeCount - requestedMaxPersonnel}명 이상의 예정 신청을 취소한 뒤 다시 저장하세요.`;
  }
  return '바꾸려는 운영 기간 밖에 있는 신청이 있습니다. 예정 신청은 취소한 뒤 다시 저장할 수 있지만, 지난 방문이 걸리면 그 기간으로는 바꿀 수 없습니다.';
});
</script>

<template>
  <section
    role="alert"
    class="rounded-md border border-amber-300 bg-amber-50 p-4 text-sm"
    data-testid="room-conflict"
  >
    <p class="mb-1 font-semibold text-amber-900">{{ props.conflict.message }}</p>
    <p class="mb-3 text-amber-800">{{ summary }}</p>

    <ul
      v-if="visits.length > 0"
      class="mb-3 divide-y divide-amber-200 rounded border border-amber-200 bg-white"
    >
      <li
        v-for="visit in visits"
        :key="visit.visitId"
        class="flex items-center justify-between px-3 py-2"
      >
        <span>
          {{ visit.studentName }}
          <span class="text-slate-500">· {{ formatKst(visit.visitAt) }}</span>
        </span>
        <span v-if="visit.isPast" class="text-xs text-slate-500">지난 방문 (취소 불가)</span>
        <button
          v-else
          type="button"
          class="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
          @click="emit('cancelVisit', visit)"
        >
          취소
        </button>
      </li>
    </ul>
    <p v-else class="mb-3 text-amber-800">취소할 수 있는 예정 신청이 없습니다.</p>

    <div class="flex justify-end gap-2">
      <button
        type="button"
        class="rounded-md border border-slate-300 bg-white px-3 py-1.5"
        @click="emit('dismiss')"
      >
        닫기
      </button>
      <button
        type="button"
        class="rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
        @click="emit('retry')"
      >
        다시 저장
      </button>
    </div>
  </section>
</template>
