import { ApiProperty } from '@nestjs/swagger';
import {
  HISTORY_ACTOR,
  VISIT_ACTION,
  VISIT_STATUS,
  type HistoryActor,
  type RoomVisitResponse,
  type VisitAction,
  type VisitHistoryResponse,
  type VisitResponse,
  type VisitStatus,
} from '@study-room/shared';
import type { Visit, VisitHistory } from '../../../generated/prisma/client';
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
