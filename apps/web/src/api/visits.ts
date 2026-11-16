import type { RoomVisitResponse, VisitHistoryResponse, VisitResponse } from '@study-room/shared';
import { http } from './client';

export async function fetchRoomVisits(roomId: number): Promise<RoomVisitResponse[]> {
  const { data } = await http().get<RoomVisitResponse[]>(`/rooms/${roomId}/visits`);
  return data;
}

export async function fetchRoomHistories(roomId: number): Promise<VisitHistoryResponse[]> {
  const { data } = await http().get<VisitHistoryResponse[]>(`/rooms/${roomId}/histories`);
  return data;
}

/** 취소. 강사는 사유가 필수다 (R11) */
export async function cancelVisit(visitId: number, reason?: string): Promise<VisitResponse> {
  const { data } = await http().post<VisitResponse>(
    `/visits/${visitId}/cancel`,
    reason === undefined ? {} : { reason },
  );
  return data;
}
