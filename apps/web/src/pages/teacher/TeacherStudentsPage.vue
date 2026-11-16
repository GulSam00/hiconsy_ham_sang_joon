<script setup lang="ts">
import { STUDENT_NAME_MAX_LENGTH, type StudentResponse } from '@study-room/shared';
import { reactive, ref } from 'vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import ErrorMessage from '@/components/ErrorMessage.vue';
import {
  useCreateStudent,
  useDeleteStudent,
  useStudents,
  useUpdateStudent,
} from '@/queries/useStudents';
import { validateStudentForm, type StudentFormErrors } from '@/utils/student-form';

const { data: students, isPending, isError, error, refetch } = useStudents();
const create = useCreateStudent();
const update = useUpdateStudent();
const remove = useDeleteStudent();

const newStudent = reactive({ name: '', phone: '' });
const newErrors = ref<StudentFormErrors>({});

const editingId = ref<number | null>(null);
const editValues = reactive({ name: '', phone: '' });
const editErrors = ref<StudentFormErrors>({});

const deleteTarget = ref<StudentResponse | null>(null);

async function add(): Promise<void> {
  const result = validateStudentForm(newStudent);
  newErrors.value = result.ok ? {} : result.errors;
  if (!result.ok) return;
  try {
    await create.mutateAsync(result.input);
    newStudent.name = '';
    newStudent.phone = '';
  } catch {
    // create.error로 표시된다.
  }
}

function startEdit(student: StudentResponse): void {
  update.reset();
  editingId.value = student.id;
  editValues.name = student.name;
  editValues.phone = student.phone;
  editErrors.value = {};
}

async function saveEdit(id: number): Promise<void> {
  const result = validateStudentForm(editValues);
  editErrors.value = result.ok ? {} : result.errors;
  if (!result.ok) return;
  try {
    await update.mutateAsync({ id, input: result.input });
    editingId.value = null;
  } catch {
    // update.error로 표시된다.
  }
}

async function confirmDelete(): Promise<void> {
  if (deleteTarget.value === null) return;
  try {
    await remove.mutateAsync(deleteTarget.value.id);
    deleteTarget.value = null;
  } catch {
    // 대화상자에 표시된다.
  }
}
</script>

<template>
  <section>
    <h1 class="mb-6 text-2xl font-bold">학생 관리</h1>

    <form
      class="mb-6 flex flex-wrap items-start gap-2 rounded-lg border border-slate-200 bg-white p-4"
      novalidate
      @submit.prevent="add"
    >
      <label class="text-sm">
        <span class="sr-only">이름</span>
        <input
          v-model="newStudent.name"
          :maxlength="STUDENT_NAME_MAX_LENGTH"
          placeholder="이름"
          class="w-40 rounded-md border border-slate-300 px-3 py-2"
          data-testid="new-student-name"
        />
        <span v-if="newErrors.name" class="mt-1 block text-xs text-red-600">{{
          newErrors.name
        }}</span>
      </label>
      <label class="text-sm">
        <span class="sr-only">휴대전화</span>
        <input
          v-model="newStudent.phone"
          placeholder="010-1234-5678"
          inputmode="tel"
          class="w-44 rounded-md border border-slate-300 px-3 py-2"
          data-testid="new-student-phone"
        />
        <span v-if="newErrors.phone" class="mt-1 block text-xs text-red-600">{{
          newErrors.phone
        }}</span>
      </label>
      <button
        type="submit"
        class="rounded-md bg-slate-900 px-4 py-2 text-sm text-white enabled:hover:bg-slate-700 disabled:opacity-50"
        :disabled="create.isPending.value"
      >
        학생 등록
      </button>
      <ErrorMessage v-if="create.isError.value" class="w-full" :error="create.error.value" />
    </form>

    <p v-if="isPending" class="text-sm text-slate-500">불러오는 중...</p>
    <ErrorMessage v-else-if="isError" :error="error" :retry="refetch" />
    <p v-else-if="students?.length === 0" class="text-sm text-slate-500">등록된 학생이 없습니다.</p>
    <table
      v-else
      class="w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-sm"
      data-testid="student-table"
    >
      <thead class="bg-slate-50 text-left text-slate-500">
        <tr>
          <th class="px-3 py-2 font-normal">이름</th>
          <th class="px-3 py-2 font-normal">휴대전화</th>
          <th class="px-3 py-2" />
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="student in students" :key="student.id">
          <template v-if="editingId === student.id">
            <td class="px-3 py-2">
              <input
                v-model="editValues.name"
                :maxlength="STUDENT_NAME_MAX_LENGTH"
                class="w-full rounded border border-slate-300 px-2 py-1"
              />
              <span v-if="editErrors.name" class="block text-xs text-red-600">{{
                editErrors.name
              }}</span>
            </td>
            <td class="px-3 py-2">
              <input
                v-model="editValues.phone"
                inputmode="tel"
                class="w-full rounded border border-slate-300 px-2 py-1"
              />
              <span v-if="editErrors.phone" class="block text-xs text-red-600">{{
                editErrors.phone
              }}</span>
            </td>
            <td class="space-x-2 px-3 py-2 text-right whitespace-nowrap">
              <button type="button" class="text-slate-500 underline" @click="editingId = null">
                취소
              </button>
              <button
                type="button"
                class="rounded bg-slate-900 px-2 py-1 text-white"
                :disabled="update.isPending.value"
                @click="saveEdit(student.id)"
              >
                저장
              </button>
              <ErrorMessage
                v-if="update.isError.value"
                class="mt-2 text-left"
                :error="update.error.value"
              />
            </td>
          </template>
          <template v-else>
            <td class="px-3 py-2">{{ student.name }}</td>
            <td class="px-3 py-2 tabular-nums">{{ student.phone }}</td>
            <td class="space-x-2 px-3 py-2 text-right whitespace-nowrap">
              <button type="button" class="text-slate-600 underline" @click="startEdit(student)">
                수정
              </button>
              <button
                type="button"
                class="text-red-700 underline"
                @click="
                  deleteTarget = student;
                  remove.reset();
                "
              >
                삭제
              </button>
            </td>
          </template>
        </tr>
      </tbody>
    </table>

    <ConfirmDialog
      v-if="deleteTarget"
      title="학생 삭제"
      confirm-label="삭제"
      :pending="remove.isPending.value"
      :error="remove.error.value"
      @confirm="confirmDelete"
      @close="deleteTarget = null"
    >
      <p>
        <strong>{{ deleteTarget.name }}</strong> 학생을 삭제합니다.
      </p>
      <p class="mt-2 font-medium text-red-700">
        이 학생의 예정 신청은 모든 자습실에서 자동 취소됩니다.
      </p>
      <p class="mt-2 text-slate-500">지난 방문 기록은 그대로 남습니다.</p>
    </ConfirmDialog>
  </section>
</template>
