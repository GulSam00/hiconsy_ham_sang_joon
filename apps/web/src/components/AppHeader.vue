<script setup lang="ts">
import { ACTOR_ROLE } from '@study-room/shared';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { ROUTE_NAME, homeOf } from '@/router/route-access';
import { useActorStore } from '@/stores/actor';

const actorStore = useActorStore();
const { selected } = storeToRefs(actorStore);
const router = useRouter();

const actorLabel = computed(() => {
  const current = selected.value;
  if (current === null) {
    return null;
  }
  return current.role === ACTOR_ROLE.TEACHER ? '강사' : `학생 · ${current.studentName}`;
});

async function changeRole(): Promise<void> {
  actorStore.clear();
  await router.push({ name: ROUTE_NAME.ROLE_SELECT });
}
</script>

<template>
  <header class="border-b border-slate-200 bg-white">
    <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
      <RouterLink
        :to="selected ? { name: homeOf(selected.role) } : { name: ROUTE_NAME.ROLE_SELECT }"
        class="text-lg font-semibold"
      >
        자습실 예약
      </RouterLink>
      <div v-if="actorLabel" class="flex items-center gap-3 text-sm">
        <span class="rounded-full bg-slate-100 px-3 py-1 text-slate-700">{{ actorLabel }}</span>
        <button
          type="button"
          class="text-slate-500 underline hover:text-slate-800"
          @click="changeRole"
        >
          역할 변경
        </button>
      </div>
    </div>
  </header>
</template>
