<script setup lang="ts">
import type { RoomInput } from '@/api/rooms';
import { ref } from 'vue';
import ErrorMessage from '@/components/ErrorMessage.vue';
import RoomForm from '@/components/RoomForm.vue';
import { useNow } from '@/composables/useNow';
import { useCreateRoom, useRooms } from '@/queries/useRooms';
import { ROUTE_NAME } from '@/router/route-access';
import { formatKst } from '@/utils/datetime';
import { emptyRoomForm } from '@/utils/room-form';
import { ROOM_PHASE_LABEL, roomPhase, type RoomPhase } from '@/utils/room-phase';

const { data: rooms, isPending, isError, error, refetch } = useRooms();
const create = useCreateRoom();
const now = useNow();
const creating = ref(false);

const PHASE_STYLE: Readonly<Record<RoomPhase, string>> = {
  BEFORE: 'bg-sky-50 text-sky-700',
  OPEN: 'bg-emerald-50 text-emerald-700',
  ENDED: 'bg-slate-100 text-slate-500',
};

function openForm(): void {
  create.reset();
  creating.value = true;
}

async function submit(input: RoomInput): Promise<void> {
  try {
    await create.mutateAsync(input);
    creating.value = false;
  } catch {
    // 에러는 create.error로 폼에 표시된다 (필드 오류 또는 상단 메시지).
  }
}

function fillPercent(activeCount: number, maxPersonnel: number): number {
  return Math.min(100, Math.round((activeCount / maxPersonnel) * 100));
}
</script>

<template>
  <section>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold">자습실 관리</h1>
      <button
        v-if="!creating"
        type="button"
        class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700"
        @click="openForm"
      >
        새 자습실
      </button>
    </div>

    <div v-if="creating" class="mb-6 rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="mb-4 text-lg font-semibold">새 자습실</h2>
      <RoomForm
        :initial="emptyRoomForm()"
        submit-label="등록"
        :pending="create.isPending.value"
        :server-error="create.error.value"
        @submit="submit"
        @cancel="creating = false"
      />
    </div>

    <p v-if="isPending" class="text-sm text-slate-500">불러오는 중...</p>
    <ErrorMessage v-else-if="isError" :error="error" :retry="refetch" />
    <p
      v-else-if="rooms?.length === 0"
      class="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500"
    >
      아직 자습실이 없습니다. "새 자습실"로 첫 자습실을 열어 보세요.
    </p>
    <ul v-else class="grid gap-3" data-testid="room-list">
      <li v-for="room in rooms" :key="room.id">
        <RouterLink
          :to="{ name: ROUTE_NAME.TEACHER_ROOM_DETAIL, params: { id: room.id } }"
          class="block rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400"
        >
          <div class="mb-1 flex items-center gap-2">
            <span class="font-semibold">{{ room.title }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-xs"
              :class="PHASE_STYLE[roomPhase(room, now)]"
            >
              {{ ROOM_PHASE_LABEL[roomPhase(room, now)] }}
            </span>
          </div>
          <div class="mb-2 text-sm text-slate-500">
            {{ formatKst(room.startDate) }} ~ {{ formatKst(room.endDate) }}
          </div>
          <div class="flex items-center gap-3 text-sm">
            <div class="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full bg-slate-700"
                :style="{ width: `${fillPercent(room.activeCount, room.maxPersonnel)}%` }"
              />
            </div>
            <span class="w-20 text-right tabular-nums"
              >{{ room.activeCount }} / {{ room.maxPersonnel }}명</span
            >
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
