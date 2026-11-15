/** 학생 응답 (강사 전용 API) */
export interface StudentResponse {
  id: number;
  name: string;
  /** 010-1234-5678 형식으로 정규화된 휴대전화 번호 */
  phone: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 역할 선택 화면용 학생 목록 항목.
 * 아직 요청자를 모르는 상태에서 쓰는 공개 API라 전화번호 등 개인정보를 담지 않는다.
 */
export interface StudentOption {
  id: number;
  name: string;
}

export const STUDENT_NAME_MAX_LENGTH = 50;
