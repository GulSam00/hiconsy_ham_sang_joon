import { ApiProperty } from '@nestjs/swagger';
import {
  HISTORY_ACTOR,
  VISIT_ACTION,
  VISIT_STATUS,
  type CancellationInfo,
  type HistoryActor,
  type MyVisitResponse,
  type MyVisitRoom,
  type RoomVisitResponse,
  type VisitAction,
  type VisitHistoryResponse,
  type VisitResponse,
  type VisitStatus,
} from '@study-room/shared';
import type { StudyRoom, Visit, VisitHistory } from '../../../generated/prisma/client';
import { isPastVisit } from '../visit-time';

export class VisitResponseDto implements VisitResponse {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  roomId: number;

  @ApiProperty({ example: 1 })
  studentId: number;

  @ApiProperty({ example: '2026-11-16T10:00:00.000Z' })
  visitAt: string;

  @ApiProperty({ enum: Object.values(VISIT_STATUS) })
  status: VisitStatus;

  @ApiProperty({ description: '지난 방문 여부 (서버 시각 기준, 저장하지 않고 계산)' })
  isPast: boolean;

  @ApiProperty({ example: '2026-11-15T03:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-11-15T03:00:00.000Z' })
  updatedAt: string;

  static from(visit: Visit, now: Date): VisitResponseDto {
    return Object.assign(new VisitResponseDto(), toVisitResponse(visit, now));
  }
}

export class RoomVisitResponseDto extends VisitResponseDto implements RoomVisitResponse {
  @ApiProperty({ example: '김민준' })
  studentName: string;

  static fromWithStudent(visit: Visit & { student: { name: string } }, now: Date) {
    return Object.assign(new RoomVisitResponseDto(), {
      ...toVisitResponse(visit, now),
      studentName: visit.student.name,
    });
  }
}

export class VisitHistoryResponseDto implements VisitHistoryResponse {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  visitId: number;

  @ApiProperty({ example: 1 })
  roomId: number;

  @ApiProperty({ example: 1 })
  studentId: number;

  @ApiProperty({ example: '김민준' })
  studentName: string;

  @ApiProperty({ enum: Object.values(VISIT_ACTION) })
  action: VisitAction;

  @ApiProperty({ enum: Object.values(HISTORY_ACTOR) })
  actor: HistoryActor;

  @ApiProperty({ type: String, nullable: true, example: null })
  prevVisitAt: string | null;

  @ApiProperty({ type: String, nullable: true, example: '2026-11-16T10:00:00.000Z' })
  nextVisitAt: string | null;

  @ApiProperty({ type: String, nullable: true, example: null })
  reason: string | null;

  @ApiProperty({ example: '2026-11-15T03:00:00.000Z' })
  createdAt: string;

  static from(history: VisitHistory & { student: { name: string } }): VisitHistoryResponseDto {
    return Object.assign(new VisitHistoryResponseDto(), {
      id: history.id,
      visitId: history.visitId,
      roomId: history.roomId,
      studentId: history.studentId,
      studentName: history.student.name,
      action: history.action,
      actor: history.actorType,
      prevVisitAt: history.prevVisitAt?.toISOString() ?? null,
      nextVisitAt: history.nextVisitAt?.toISOString() ?? null,
      reason: history.reason,
      createdAt: history.createdAt.toISOString(),
    } satisfies VisitHistoryResponse);
  }
}

class MyVisitRoomDto implements MyVisitRoom {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '수학 자습실 A' })
  title: string;

  @ApiProperty({ example: '2026-11-15T00:00:00.000Z' })
  startDate: string;

  @ApiProperty({ example: '2026-11-22T13:00:00.000Z' })
  endDate: string;

  @ApiProperty({ description: '삭제된 자습실이면 true' })
  isDeleted: boolean;
}

class CancellationInfoDto implements CancellationInfo {
  @ApiProperty({ enum: Object.values(HISTORY_ACTOR) })
  by: HistoryActor;

  @ApiProperty({ type: String, nullable: true, example: '자습실 정원 조정' })
  reason: string | null;

  @ApiProperty({ example: '2026-11-15T05:00:00.000Z' })
  canceledAt: string;
}

/** 취소 정보를 만들기 위한 마지막 이력 */
type LastHistory = Pick<VisitHistory, 'actorType' | 'reason' | 'createdAt'>;

export class MyVisitResponseDto extends VisitResponseDto implements MyVisitResponse {
  @ApiProperty({ type: MyVisitRoomDto })
  room: MyVisitRoomDto;

  @ApiProperty({
    type: CancellationInfoDto,
    nullable: true,
    description: '취소된 신청이면 누가 왜 취소했는지',
  })
  cancellation: CancellationInfoDto | null;

  /**
   * @param lastHistory 이 신청의 가장 최근 이력. CANCELED 상태면 그것이 취소 이력이다
   *   (취소 뒤에는 재신청만 가능하고, 재신청하면 상태가 ACTIVE로 돌아가므로).
   */
  static fromMine(
    visit: Visit & { room: StudyRoom },
    lastHistory: LastHistory | undefined,
    now: Date,
  ): MyVisitResponseDto {
    const isCanceled = visit.status === VISIT_STATUS.CANCELED;
    if (isCanceled && lastHistory === undefined) {
      throw new Error(`취소된 신청 ${visit.id}에 이력이 없습니다.`);
    }
    return Object.assign(new MyVisitResponseDto(), {
      ...toVisitResponse(visit, now),
      room: {
        id: visit.room.id,
        title: visit.room.title,
        startDate: visit.room.startDate.toISOString(),
        endDate: visit.room.endDate.toISOString(),
        isDeleted: visit.room.deletedAt !== null,
      },
      cancellation:
        isCanceled && lastHistory !== undefined
          ? {
              by: lastHistory.actorType,
              reason: lastHistory.reason,
              canceledAt: lastHistory.createdAt.toISOString(),
            }
          : null,
    } satisfies MyVisitResponse);
  }
}

function toVisitResponse(visit: Visit, now: Date): VisitResponse {
  return {
    id: visit.id,
    roomId: visit.roomId,
    studentId: visit.studentId,
    visitAt: visit.visitAt.toISOString(),
    status: visit.status,
    isPast: isPastVisit(visit.visitAt, now),
    createdAt: visit.createdAt.toISOString(),
    updatedAt: visit.updatedAt.toISOString(),
  };
}
