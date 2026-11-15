import type { StudentOption, StudentResponse } from '@study-room/shared';
import { http } from './client';

export interface StudentInput {
  name: string;
  phone: string;
}

/** 역할 선택용 학생 목록 (공개 API, id·이름만) */
export async function fetchStudentOptions(): Promise<StudentOption[]> {
  const { data } = await http().get<StudentOption[]>('/students/options');
  return data;
}

/** 강사용 학생 목록 (전화번호 포함) */
export async function fetchStudents(): Promise<StudentResponse[]> {
  const { data } = await http().get<StudentResponse[]>('/students');
  return data;
}

export async function createStudent(input: StudentInput): Promise<StudentResponse> {
  const { data } = await http().post<StudentResponse>('/students', input);
  return data;
}

export async function updateStudent(
  id: number,
  input: Partial<StudentInput>,
): Promise<StudentResponse> {
  const { data } = await http().patch<StudentResponse>(`/students/${id}`, input);
  return data;
}

export async function deleteStudent(id: number): Promise<void> {
  await http().delete(`/students/${id}`);
}
