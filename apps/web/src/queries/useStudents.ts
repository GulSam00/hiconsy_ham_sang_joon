import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import {
  createStudent,
  deleteStudent,
  fetchStudents,
  updateStudent,
  type StudentInput,
} from '@/api/students';
import { queryKeys } from './keys';

export function useStudents() {
  return useQuery({ queryKey: queryKeys.students.list(), queryFn: fetchStudents });
}

/**
 * 학생 쓰기는 역할 선택 목록(studentOptions)에도 영향을 준다.
 * 학생 삭제는 신청을 시스템 취소하므로(R9) 자습실 정보도 바뀐다.
 */
function useInvalidateStudents() {
  const queryClient = useQueryClient();
  return async (alsoRooms: boolean) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.students.all }),
      alsoRooms ? queryClient.invalidateQueries({ queryKey: queryKeys.rooms.all }) : undefined,
    ]);
  };
}

export function useCreateStudent() {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: (input: StudentInput) => createStudent(input),
    onSuccess: () => invalidate(false),
  });
}

export function useUpdateStudent() {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<StudentInput> }) =>
      updateStudent(id, input),
    onSuccess: () => invalidate(true),
  });
}

export function useDeleteStudent() {
  const invalidate = useInvalidateStudents();
  return useMutation({
    mutationFn: (id: number) => deleteStudent(id),
    onSuccess: () => invalidate(true),
  });
}
