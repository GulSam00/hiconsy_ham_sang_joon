import { useQuery } from '@tanstack/vue-query';
import { fetchStudentOptions } from '@/api/students';
import { queryKeys } from './keys';

export function useStudentOptions() {
  return useQuery({ queryKey: queryKeys.studentOptions, queryFn: fetchStudentOptions });
}
