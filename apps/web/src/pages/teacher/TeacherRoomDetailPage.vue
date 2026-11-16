<script setup lang="ts">
import type { ConflictingVisit, RoomVisitResponse } from '@study-room/shared';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { RoomInput } from '@/api/rooms';
import CancelVisitDialog from '@/components/CancelVisitDialog.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import ErrorMessage from '@/components/ErrorMessage.vue';
import HistoryTimeline from '@/components/HistoryTimeline.vue';
import RoomConflictPanel from '@/components/RoomConflictPanel.vue';
import RoomForm from '@/components/RoomForm.vue';
import VisitStateBadge from '@/components/VisitStateBadge.vue';
import { useDeleteRoom, useRoom, useUpdateRoom } from '@/queries/useRooms';
import { useRoomHistories, useRoomVisits } from '@/queries/useRoomVisits';
import { ROUTE_NAME } from '@/router/route-access';
import { toRoomConflict, withoutVisits } from '@/utils/conflicts';
import { formatKst } from '@/utils/datetime';
import { visitDisplayState } from '@/utils/labels';
import { changedRoomFields, roomToForm } from '@/utils/room-form';

const props = defineProps<{ id: number }>();
const router = useRouter();

const room = useRoom(() => props.id);
const visits = useRoomVisits(() => props.id);
const histories = useRoomHistories(() => props.id);
const update = useUpdateRoom(() => props.id);
const remove = useDeleteRoom();

const editing = ref(false);
const confirmingDelete = ref(false);
/** 취소 대화상자 대상. 신청자 목록과 충돌 안내에서 모두 연다. */
const cancelTarget = ref<{ visitId: number; studentName: string; visitAt: string } | null>(null);
/** 충돌 후 "다시 저장"할 때 쓸 마지막 수정 요청 */
const lastUpdate = ref<Partial<RoomInput> | null>(null);

/** 이번 충돌 안내에서 취소한 신청 id. 다시 저장하면 비운다. */
const canceledInConflict = ref<number[]>([]);

const conflict = computed(() => {
  const parsed = update.error.value ? toRoomConflict(update.error.value) : null;
  return parsed === null ? null : withoutVisits(parsed, canceledInConflict.value);
});
/** 충돌은 전용 안내로 보여주므로 폼에는 충돌이 아닌 에러만 넘긴다 */
const formError = computed(() => (conflict.value === null ? update.error.value : null));

const upcomingCount = computed(
  () => visits.data.value?.filter((visit) => visitDisplayState(visit) === 'UPCOMING').length ?? 0,
);

function startEdit(): void {
  update.reset();
  editing.value = true;
}

async function save(input: Partial<RoomInput>): Promise<void> {
  lastUpdate.value = input;
  canceledInConflict.value = [];
  try {
    await update.mutateAsync(input);
    editing.value = false;
    lastUpdate.value = null;
  } catch {
    // 충돌이면 안내 패널, 아니면 폼 에러로 표시된다.
  }
}

async function submitEdit(input: RoomInput): Promise<void> {
  const current = room.data.value;
  if (current === undefined) {
    return;
  }
  const changes = changedRoomFields(current, input);
  if (Object.keys(changes).length === 0) {
    editing.value = false;
    return;
  }
  await save(changes);
}

async function retry(): Promise<void> {
  if (lastUpdate.value !== null) {
    await save(lastUpdate.value);
  }
}

function cancelFromConflict(visit: ConflictingVisit): void {
  cancelTarget.value = {
    visitId: visit.visitId,
    studentName: visit.studentName,
    visitAt: visit.visitAt,
  };
}

function cancelFromList(visit: RoomVisitResponse): void {
  cancelTarget.value = {
    visitId: visit.id,
    studentName: visit.studentName,
    visitAt: visit.visitAt,
  };
}

function onCanceled(): void {
  if (cancelTarget.value !== null) {
    canceledInConflict.value = [...canceledInConflict.value, cancelTarget.value.visitId];
  }
  cancelTarget.value = null;
}

async function confirmDelete(): Promise<void> {
  try {
    await remove.mutateAsync(props.id);
    await router.push({ name: ROUTE_NAME.TEACHER_ROOMS });
  } catch {
    // 대화상자에 에러가 표시된다.
  }
}
</script>

<template>
  <section>
    <RouterLink
      :to="{ name: ROUTE_NAME.TEACHER_ROOMS }"
      class="mb-4 inline-block text-sm text-slate-500 hover:underline"
    >
      ← 자습실 목록
    </RouterLink>

    <p v-if="room.isPending.value" class="text-sm text-slate-500">불러오는 중...</p>
    <ErrorMessage v-else-if="room.isError.value" :error="room.error.value" :retry="room.refetch" />

    <template v-else-if="room.data.value">
      <!-- 자습실 정보 -->
      <div class="mb-8 rounded-lg border border-slate-200 bg-white p-6">
        <div v-if="!editing">
          <div class="mb-4 flex items-start justify-between gap-4">
            <div>
              <h1 class="text-2xl font-bold">{{ room.data.value.title }}</h1>
              <p class="text-sm text-slate-500">
                {{ formatKst(room.data.value.startDate) }} ~
                {{ formatKst(room.data.value.endDate) }}
              </p>
            </div>
            <div class="flex shrink-0 gap-2">
              <button
                type="button"
                class="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                @click="startEdit"
              >
                수정
              </button>
              <button
                type="button"
                class="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700"
                @click="confirmingDelete = true"
              >
                삭제
              </button>
            </div>
          </div>
          <p class="text-sm">
            신청 <strong class="tabular-nums">{{ room.data.value.activeCount }}</strong> /
            {{ room.data.value.maxPersonnel }}명
            <span class="text-slate-400">(지난 방문 포함)</span>
          </p>
        </div>

        <div v-else class="space-y-4">
          <h2 class="text-lg font-semibold">자습실 수정</h2>
          <RoomConflictPanel
            v-if="conflict"
            :conflict="conflict"
            @cancel-visit="cancelFromConflict"
            @retry="retry"
            @dismiss="update.reset()"
          />
          <RoomForm
            :initial="roomToForm(room.data.value)"
            submit-label="저장"
            :pending="update.isPending.value"
            :server-error="formError"
            @submit="submitEdit"
            @cancel="editing = false"
          />
        </div>
      </div>

      <!-- 신청자 -->
      <div class="mb-8">
        <h2 class="mb-3 text-lg font-semibold">신청자</h2>
        <p v-if="visits.isPending.value" class="text-sm text-slate-500">불러오는 중...</p>
        <ErrorMessage
          v-else-if="visits.isError.value"
          :error="visits.error.value"
          :retry="visits.refetch"
        />
        <p v-else-if="visits.data.value?.length === 0" class="text-sm text-slate-500">
          아직 신청이 없습니다.
        </p>
        <table
          v-else
          class="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm"
          data-testid="visit-table"
        >
          <thead class="bg-slate-50 text-left text-slate-500">
            <tr>
              <th class="px-3 py-2 font-normal">학생</th>
              <th class="px-3 py-2 font-normal">방문 시각</th>
              <th class="px-3 py-2 font-normal">상태</th>
              <th class="px-3 py-2" />
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="visit in visits.data.value" :key="visit.id">
              <td class="px-3 py-2">{{ visit.studentName }}</td>
              <td class="px-3 py-2">{{ formatKst(visit.visitAt) }}</td>
              <td class="px-3 py-2"><VisitStateBadge :visit="visit" /></td>
              <td class="px-3 py-2 text-right">
                <button
                  v-if="visitDisplayState(visit) === 'UPCOMING'"
                  type="button"
                  class="rounded border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                  @click="cancelFromList(visit)"
                >
                  취소
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 이력 (FR-ROM-03) -->
      <div>
        <h2 class="mb-3 text-lg font-semibold">신청·수정·취소 이력</h2>
        <p v-if="histories.isPending.value" class="text-sm text-slate-500">불러오는 중...</p>
        <ErrorMessage
          v-else-if="histories.isError.value"
          :error="histories.error.value"
          :retry="histories.refetch"
        />
        <HistoryTimeline v-else :histories="histories.data.value ?? []" />
      </div>
    </template>

    <CancelVisitDialog
      v-if="cancelTarget"
      :visit="cancelTarget"
      @close="cancelTarget = null"
      @canceled="onCanceled"
    />

    <ConfirmDialog
      v-if="confirmingDelete"
      title="자습실 삭제"
      confirm-label="삭제"
      :pending="remove.isPending.value"
      :error="remove.error.value"
      @confirm="confirmDelete"
      @close="
        confirmingDelete = false;
        remove.reset();
      "
    >
      <p>삭제하면 목록과 신청 대상에서 빠집니다.</p>
      <p v-if="upcomingCount > 0" class="mt-2 font-medium text-red-700">
        예정 신청 {{ upcomingCount }}건이 자동 취소되고, 학생에게 취소 사유가 표시됩니다.
      </p>
      <p class="mt-2 text-slate-500">지난 방문 기록은 그대로 남습니다.</p>
    </ConfirmDialog>
  </section>
</template>
