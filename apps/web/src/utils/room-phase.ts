import type { RoomResponse } from '@study-room/shared';

export type RoomPhase = 'BEFORE' | 'OPEN' | 'ENDED';

export const ROOM_PHASE_LABEL: Readonly<Record<RoomPhase, string>> = {
  BEFORE: '운영 예정',
  OPEN: '운영 중',
  ENDED: '운영 종료',
};

/** 화면 표시용 운영 상태. 서버 규칙(신청 가능 여부)과 별개이며, 판단은 항상 서버가 한다. */
export function roomPhase(
  room: Pick<RoomResponse, 'startDate' | 'endDate'>,
  nowMs: number,
): RoomPhase {
  if (nowMs < new Date(room.startDate).getTime()) {
    return 'BEFORE';
  }
  return nowMs <= new Date(room.endDate).getTime() ? 'OPEN' : 'ENDED';
}
