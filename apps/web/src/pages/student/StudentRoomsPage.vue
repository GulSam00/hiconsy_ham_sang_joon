<script setup lang="ts">
import type { RoomResponse } from '@study-room/shared';
import { computed, ref } from 'vue';
import ErrorMessage from '@/components/ErrorMessage.vue';
import VisitTimeDialog from '@/components/VisitTimeDialog.vue';
import { useNow } from '@/composables/useNow';
import { useApplyVisit, useMyVisits } from '@/queries/useRoomVisits';
import { useRooms } from '@/queries/useRooms';
import { ROUTE_NAME } from '@/router/route-access';
import { formatKst } from '@/utils/datetime';
import { roomActionFor, type RoomAction } from '@/utils/visit-form';

const rooms = useRooms();
const myVisits = useMyVisits();
const apply = useApplyVisit();
const now = useNow();

const applyTarget = ref<RoomResponse | null>(null);
const appliedMessage = ref<string | null>(null);

/** 자습실 id → 내 신청 (취소된 신청 포함) */
const myVisitByRoom = computed(
  () => new Map(myVisits.data.value?.map((visit) => [visit.room.id, visit])),
);

const isPending = computed(() => rooms.isPending.value || myVisits.isPending.value);
const loadError = computed(() => rooms.error.value ?? myVisits.error.value);

function actionOf(room: RoomResponse): RoomAction {
  return roomActionFor(room, myVisitByRoom.value.get(room.id), now.value);
}

const ACTION_LABEL: Readonly<Record<RoomAction, string>> = {
  APPLIED: '신청함',
  VISITED: '방문함',
  APPLY: '신청',
  REAPPLY: '다시 신청',
  FULL: '정원 마감',
  ENDED: '운영 종료',
};

function openApply(room: RoomResponse): void {
  apply.reset();
  appliedMessage.value = null;
  applyTarget.value = room;
}

async function submitApply(visitAt: string): Promise<void> {
  const room = applyTarget.value;
  if (room === null) return;
  try {
    const visit = await apply.mutateAsync({ roomId: room.id, visitAt });
    applyTarget.value = null;
    appliedMessage.value = `${room.title}에 ${formatKst(visit.visitAt)} 방문을 신청했습니다.`;
  } catch {
    // 대화상자에 서버 에러(정원 마감, 중복 등)가 표시된다.
  }
}

function retryLoad(): void {
  void rooms.refetch();
  void myVisits.refetch();
}
</script>

<template>
  <section>
    <h1 class="mb-2 text-2xl font-bold">자습실</h1>
    <p class="mb-6 text-sm text-slate-500">
      방문할 자습실과 시간을 골라 신청하세요. 신청한 시간 변경·취소는
      <RouterLink :to="{ name: ROUTE_NAME.STUDENT_VISITS }" class="underline">내 신청</RouterLink
      >에서 할 수 있습니다.
    </p>

    <p
      v-if="appliedMessage"
      role="status"
      class="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"
    >
      {{ appliedMessage }}
    </p>

    <p v-if="isPending" class="text-sm text-slate-500">불러오는 중...</p>
    <ErrorMessage v-else-if="loadError" :error="loadError" :retry="retryLoad" />
    <p v-else-if="rooms.data.value?.length === 0" class="text-sm text-slate-500">
      열려 있는 자습실이 없습니다.
    </p>
    <ul v-else class="grid gap-3" data-testid="student-room-list">
      <li
        v-for="room in rooms.data.value"
        :key="room.id"
        class="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4"
      >
        <div class="min-w-0 flex-1">
          <div class="font-semibold">{{ room.title }}</div>
          <div class="text-sm text-slate-500">
            {{ formatKst(room.startDate) }} ~ {{ formatKst(room.endDate) }}
          </div>
          <div class="text-sm">신청 {{ room.activeCount }} / {{ room.maxPersonnel }}명</div>
          <div
            v-if="actionOf(room) === 'APPLIED' && myVisitByRoom.get(room.id)"
            class="text-sm text-emerald-700"
          >
            내 방문: {{ formatKst(myVisitByRoom.get(room.id)!.visitAt) }}
          </div>
        </div>
        <button
          v-if="actionOf(room) === 'APPLY' || actionOf(room) === 'REAPPLY'"
          type="button"
          class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
          @click="openApply(room)"
        >
          {{ ACTION_LABEL[actionOf(room)] }}
        </button>
        <span v-else class="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-600">
          {{ ACTION_LABEL[actionOf(room)] }}
        </span>
      </li>
    </ul>

    <VisitTimeDialog
      v-if="applyTarget"
      title="방문 신청"
      submit-label="신청"
      :room="applyTarget"
      :pending="apply.isPending.value"
      :server-error="apply.error.value"
      @submit="submitApply"
      @close="applyTarget = null"
    />
  </section>
</template>
