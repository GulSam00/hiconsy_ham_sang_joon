import type { StudentOption } from '@study-room/shared';
import { http } from './client';

/** 역할 선택용 학생 목록 (공개 API, id·이름만) */
export async function fetchStudentOptions(): Promise<StudentOption[]> {
  const { data } = await http().get<StudentOption[]>('/students/options');
  return data;
}
