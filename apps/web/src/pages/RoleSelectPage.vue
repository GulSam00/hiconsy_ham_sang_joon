<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import ErrorMessage from '@/components/ErrorMessage.vue';
import { useStudentOptions } from '@/queries/useStudentOptions';
import { ROUTE_NAME } from '@/router/route-access';
import { useActorStore } from '@/stores/actor';

const router = useRouter();
const actorStore = useActorStore();
const { data: students, isPending, isError, error, refetch } = useStudentOptions();

const selectedStudentId = ref<number | null>(null);

/**
 * 버튼 상태는 "고른 id"가 아니라 "목록에서 실제로 찾은 학생"으로 정한다.
 * select가 값을 못 잡아 undefined가 되거나, 목록이 갱신되어(학생 삭제 등) 고른 학생이 사라져도
 * 눌러도 아무 일 없는 활성 버튼이 남지 않는다.
 */
const selectedStudent = computed(() =>
  students.value?.find((student) => student.id === selectedStudentId.value),
);

async function startAsTeacher(): Promise<void> {
  actorStore.selectTeacher();
  await router.push({ name: ROUTE_NAME.TEACHER_ROOMS });
}

async function startAsStudent(): Promise<void> {
  const student = selectedStudent.value;
  if (student === undefined) {
    return;
  }
  actorStore.selectStudent(student.id, student.name);
  await router.push({ name: ROUTE_NAME.STUDENT_ROOMS });
}
</script>

<template>
  <section class="mx-auto max-w-3xl">
    <h1 class="mb-2 text-2xl font-bold">누구로 시작할까요?</h1>
    <p class="mb-8 text-sm text-slate-500">
      로그인 대신 역할을 고릅니다. 고른 역할은 이 브라우저에 기억됩니다.
    </p>

    <div class="grid gap-4 sm:grid-cols-2">
      <article class="flex flex-col rounded-lg border border-slate-200 bg-white p-6">
        <h2 class="mb-1 text-lg font-semibold">강사</h2>
        <p class="mb-6 flex-1 text-sm text-slate-500">
          자습실을 열고, 신청 현황과 이력을 관리합니다.
        </p>
        <button
          type="button"
          class="rounded-md bg-slate-900 px-4 py-2 text-white hover:bg-slate-700"
          @click="startAsTeacher"
        >
          강사로 시작
        </button>
      </article>

      <article class="flex flex-col rounded-lg border border-slate-200 bg-white p-6">
        <h2 class="mb-1 text-lg font-semibold">학생</h2>
        <p class="mb-4 text-sm text-slate-500">자습실 방문을 신청하고 내 신청을 확인합니다.</p>

        <p v-if="isPending" class="mb-4 text-sm text-slate-500">학생 목록을 불러오는 중...</p>
        <ErrorMessage v-else-if="isError" class="mb-4" :error="error" :retry="refetch" />
        <p v-else-if="students?.length === 0" class="mb-4 text-sm text-slate-500">
          등록된 학생이 없습니다. 강사로 시작해 학생을 등록해 주세요.
        </p>
        <label v-else class="mb-4 block text-sm">
          <span class="mb-1 block text-slate-600">학생 선택</span>
          <select
            v-model="selectedStudentId"
            class="w-full rounded-md border border-slate-300 px-3 py-2"
            data-testid="student-select"
          >
            <option :value="null" disabled>이름을 고르세요</option>
            <option v-for="student in students" :key="student.id" :value="student.id">
              {{ student.name }}
            </option>
          </select>
        </label>

        <button
          type="button"
          class="mt-auto rounded-md bg-slate-900 px-4 py-2 text-white enabled:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="selectedStudent === undefined"
          @click="startAsStudent"
        >
          학생으로 시작
        </button>
      </article>
    </div>
  </section>
</template>
