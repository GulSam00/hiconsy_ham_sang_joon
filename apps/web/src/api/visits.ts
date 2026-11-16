import type {
  MyVisitResponse,
  RoomVisitResponse,
  VisitHistoryResponse,
  VisitResponse,
} from '@study-room/shared';
import { http } from './client';

export async function fetchRoomVisits(roomId: number): Promise<RoomVisitResponse[]> {
  const { data } = await http().get<RoomVisitResponse[]>(`/rooms/${roomId}/visits`);
  return data;
}

export async function fetchRoomHistories(roomId: number): Promise<VisitHistoryResponse[]> {
  const { data } = await http().get<VisitHistoryResponse[]>(`/rooms/${roomId}/histories`);
  return data;
}

/** 내 신청 목록 (학생) */
export async function fetchMyVisits(): Promise<MyVisitResponse[]> {
  const { data } = await http().get<MyVisitResponse[]>('/me/visits');
  return data;
}

/** 방문 신청. visitAt은 시간대가 붙은 ISO 문자열 (fromKstInputValue 결과) */
export async function applyVisit(roomId: number, visitAt: string): Promise<VisitResponse> {
  const { data } = await http().post<VisitResponse>(`/rooms/${roomId}/visits`, { visitAt });
  return data;
}

export async function changeVisitTime(visitId: number, visitAt: string): Promise<VisitResponse> {
  const { data } = await http().patch<VisitResponse>(`/visits/${visitId}`, { visitAt });
  return data;
}

/** 취소. 강사는 사유가 필수, 학생은 선택이다 (R11) */
export async function cancelVisit(visitId: number, reason?: string): Promise<VisitResponse> {
  const { data } = await http().post<VisitResponse>(
    `/visits/${visitId}/cancel`,
    reason === undefined ? {} : { reason },
  );
  return data;
}
