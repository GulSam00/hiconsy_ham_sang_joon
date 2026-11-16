import type { MyVisitResponse, RoomResponse } from '@study-room/shared';
import { fromKstInputValue, toKstInputValue } from './datetime';

type RoomPeriod = Pick<RoomResponse, 'startDate' | 'endDate'>;

/**
 * 방문 시각 입력칸의 선택 범위(KST). 지금과 운영 시작 중 늦은 때부터 운영 종료까지.
 * 브라우저의 min/max는 안내일 뿐이고, 제출 전 `validateVisitTime`과 서버가 다시 검사한다.
 */
export function visitTimeBounds(room: RoomPeriod, nowMs: number): { min: string; max: string } {
  const startMs = Math.max(nowMs, new Date(room.startDate).getTime());
  return {
    min: toKstInputValue(new Date(startMs).toISOString()),
    max: toKstInputValue(room.endDate),
  };
}

export type VisitTimeResult = { ok: true; visitAt: string } | { ok: false; message: string };

/** 서버 R4와 같은 규칙을 제출 전에 알려준다 (최종 판단은 서버) */
export function validateVisitTime(value: string, room: RoomPeriod, nowMs: number): VisitTimeResult {
  const visitAt = fromKstInputValue(value);
  if (visitAt === null) {
    return { ok: false, message: '방문 일시를 입력해 주세요.' };
  }
  const time = new Date(visitAt).getTime();
  if (time < nowMs) {
    return { ok: false, message: '지나간 시간으로는 신청할 수 없습니다.' };
  }
  if (time < new Date(room.startDate).getTime() || time > new Date(room.endDate).getTime()) {
    return { ok: false, message: '방문 시간이 자습실 운영 기간을 벗어났습니다.' };
  }
  return { ok: true, visitAt };
}

/** 자습실 목록에서 학생에게 보여줄 내 상태·행동 */
export type RoomAction = 'APPLIED' | 'VISITED' | 'APPLY' | 'REAPPLY' | 'FULL' | 'ENDED';

/**
 * 순서가 의미를 가진다: 내 활성 신청이 있으면 정원·기간과 무관하게 그 상태를 먼저 보여준다
 * (정원이 차 있어도 내 신청은 그 안에 포함되어 있다).
 */
export function roomActionFor(
  room: Pick<RoomResponse, 'endDate' | 'activeCount' | 'maxPersonnel'>,
  myVisit: Pick<MyVisitResponse, 'status' | 'isPast'> | undefined,
  nowMs: number,
): RoomAction {
  if (myVisit?.status === 'ACTIVE') {
    return myVisit.isPast ? 'VISITED' : 'APPLIED';
  }
  if (new Date(room.endDate).getTime() < nowMs) {
    return 'ENDED';
  }
  if (room.activeCount >= room.maxPersonnel) {
    return 'FULL';
  }
  return myVisit === undefined ? 'APPLY' : 'REAPPLY';
}
