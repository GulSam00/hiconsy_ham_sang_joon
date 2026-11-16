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

/** 역할별 메뉴 */
const navItems = computed(() => {
  const role = selected.value?.role;
  if (role === ACTOR_ROLE.TEACHER) {
    return [
      { name: ROUTE_NAME.TEACHER_ROOMS, label: '자습실' },
      { name: ROUTE_NAME.TEACHER_STUDENTS, label: '학생' },
    ];
  }
  if (role === ACTOR_ROLE.STUDENT) {
    return [
      { name: ROUTE_NAME.STUDENT_ROOMS, label: '자습실' },
      { name: ROUTE_NAME.STUDENT_VISITS, label: '내 신청' },
    ];
  }
  return [];
});

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
      <nav v-if="navItems.length > 0" class="mr-auto ml-8 flex gap-4 text-sm">
        <RouterLink
          v-for="item in navItems"
          :key="item.name"
          :to="{ name: item.name }"
          class="text-slate-500 hover:text-slate-900"
          active-class="font-semibold text-slate-900"
        >
          {{ item.label }}
        </RouterLink>
      </nav>
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
