<script setup lang="ts">
import type { VisitHistoryResponse } from '@study-room/shared';
import { formatKst } from '@/utils/datetime';
import { HISTORY_ACTOR_LABEL, VISIT_ACTION_LABEL } from '@/utils/labels';

const props = defineProps<{ histories: VisitHistoryResponse[] }>();

function describe(history: VisitHistoryResponse): string {
  if (history.prevVisitAt !== null && history.nextVisitAt !== null) {
    return `${formatKst(history.prevVisitAt)} → ${formatKst(history.nextVisitAt)}`;
  }
  const at = history.nextVisitAt ?? history.prevVisitAt;
  return at === null ? '' : formatKst(at);
}
</script>

<template>
  <p v-if="props.histories.length === 0" class="text-sm text-slate-500">아직 이력이 없습니다.</p>
  <ol v-else class="space-y-2 text-sm" data-testid="history-list">
    <li
      v-for="history in props.histories"
      :key="history.id"
      class="rounded-md border border-slate-200 bg-white px-3 py-2"
    >
      <div class="flex flex-wrap items-center gap-x-2">
        <span class="font-medium">{{ history.studentName }}</span>
        <span class="rounded bg-slate-100 px-1.5 text-xs">{{
          VISIT_ACTION_LABEL[history.action]
        }}</span>
        <span class="text-xs text-slate-500">by {{ HISTORY_ACTOR_LABEL[history.actor] }}</span>
        <span class="ml-auto text-xs text-slate-400">{{ formatKst(history.createdAt) }}</span>
      </div>
      <div class="text-slate-600">{{ describe(history) }}</div>
      <div v-if="history.reason" class="text-xs text-slate-500">사유: {{ history.reason }}</div>
    </li>
  </ol>
</template>
