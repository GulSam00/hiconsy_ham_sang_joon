<script setup lang="ts">
import type { MyVisitResponse } from '@study-room/shared';
import { computed, ref } from 'vue';
import CancelVisitDialog from '@/components/CancelVisitDialog.vue';
import ErrorMessage from '@/components/ErrorMessage.vue';
import VisitStateBadge from '@/components/VisitStateBadge.vue';
import VisitTimeDialog from '@/components/VisitTimeDialog.vue';
import { useChangeVisitTime, useMyVisits } from '@/queries/useRoomVisits';
import { ROUTE_NAME } from '@/router/route-access';
import { formatKst } from '@/utils/datetime';
import { CANCELED_BY_TEXT, visitDisplayState, type VisitDisplayState } from '@/utils/labels';

const { data: visits, isPending, isError, error, refetch } = useMyVisits();
const change = useChangeVisitTime();

const changeTarget = ref<MyVisitResponse | null>(null);
const cancelTarget = ref<MyVisitResponse | null>(null);

const SECTIONS: readonly { state: VisitDisplayState; title: string; empty: string }[] = [
  { state: 'UPCOMING', title: '예정', empty: '예정된 방문이 없습니다.' },
  { state: 'PAST', title: '지난 방문', empty: '지난 방문이 없습니다.' },
  { state: 'CANCELED', title: '취소됨', empty: '취소된 신청이 없습니다.' },
];

const grouped = computed(() => {
  const groups: Record<VisitDisplayState, MyVisitResponse[]> = {
    UPCOMING: [],
    PAST: [],
    CANCELED: [],
  };
  for (const visit of visits.value ?? []) {
    groups[visitDisplayState(visit)].push(visit);
  }
  return groups;
});

function openChange(visit: MyVisitResponse): void {
  change.reset();
  changeTarget.value = visit;
}

async function submitChange(visitAt: string): Promise<void> {
  const target = changeTarget.value;
  if (target === null) return;
  try {
    await change.mutateAsync({ visitId: target.id, visitAt });
    changeTarget.value = null;
  } catch {
    // 대화상자에 표시된다.
  }
}

/** 누가 왜 취소했는지 (docs/visit-policy.md 5절) */
function cancellationText(visit: MyVisitResponse): string {
  const info = visit.cancellation;
  return info === null ? '' : `${formatKst(info.canceledAt)}에 ${CANCELED_BY_TEXT[info.by]}`;
}
</script>

<template>
  <section>
    <h1 class="mb-6 text-2xl font-bold">내 신청</h1>

    <p v-if="isPending" class="text-sm text-slate-500">불러오는 중...</p>
    <ErrorMessage v-else-if="isError" :error="error" :retry="refetch" />
    <p v-else-if="visits?.length === 0" class="text-sm text-slate-500">
      아직 신청이 없습니다.
      <RouterLink :to="{ name: ROUTE_NAME.STUDENT_ROOMS }" class="underline">자습실 목록</RouterLink
      >에서 신청해 보세요.
    </p>

    <template v-else>
      <div
        v-for="section in SECTIONS"
        :key="section.state"
        class="mb-8"
        :data-testid="`section-${section.state}`"
      >
        <h2 class="mb-3 text-lg font-semibold">
          {{ section.title }}
          <span class="text-sm font-normal text-slate-400">{{
            grouped[section.state].length
          }}</span>
        </h2>
        <p v-if="grouped[section.state].length === 0" class="text-sm text-slate-400">
          {{ section.empty }}
        </p>
        <ul v-else class="grid gap-2">
          <li
            v-for="visit in grouped[section.state]"
            :key="visit.id"
            class="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <span class="font-semibold">{{ visit.room.title }}</span>
                <VisitStateBadge :visit="visit" />
                <span v-if="visit.room.isDeleted" class="text-xs text-slate-400"
                  >(삭제된 자습실)</span
                >
              </div>
              <div class="text-sm text-slate-600">{{ formatKst(visit.visitAt) }}</div>
              <div v-if="visit.cancellation" class="mt-1 text-sm text-red-700">
                {{ cancellationText(visit) }}
                <span v-if="visit.cancellation.reason" class="block text-slate-600"
                  >사유: {{ visit.cancellation.reason }}</span
                >
              </div>
            </div>
            <div v-if="section.state === 'UPCOMING'" class="flex gap-2">
              <button
                type="button"
                class="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                @click="openChange(visit)"
              >
                시간 변경
              </button>
              <button
                type="button"
                class="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700"
                @click="cancelTarget = visit"
              >
                취소
              </button>
            </div>
          </li>
        </ul>
      </div>
    </template>

    <VisitTimeDialog
      v-if="changeTarget"
      title="방문 시간 변경"
      submit-label="변경"
      :room="changeTarget.room"
      :initial-visit-at="changeTarget.visitAt"
      :pending="change.isPending.value"
      :server-error="change.error.value"
      @submit="submitChange"
      @close="changeTarget = null"
    />

    <CancelVisitDialog
      v-if="cancelTarget"
      :visit="{ visitId: cancelTarget.id, visitAt: cancelTarget.visitAt }"
      :reason-required="false"
      @close="cancelTarget = null"
      @canceled="cancelTarget = null"
    />
  </section>
</template>
