import { describe, expect, it } from 'vitest';
import {
  ActorType,
  VisitStatus,
  type StudyRoom,
  type Visit,
} from '../../../generated/prisma/client';
import { MyVisitResponseDto } from './visit-response.dto';

const NOW = new Date('2026-11-15T03:00:00.000Z');
const room: StudyRoom = {
  id: 1,
  title: 'A',
  maxPersonnel: 5,
  activeCount: 0,
  startDate: new Date('2026-11-15T00:00:00Z'),
  endDate: new Date('2026-11-20T00:00:00Z'),
  createdAt: NOW,
  updatedAt: NOW,
  deletedAt: null,
};
const visit = (status: VisitStatus): Visit & { room: StudyRoom } => ({
  id: 7,
  roomId: 1,
  studentId: 1,
  visitAt: new Date('2026-11-16T00:00:00Z'),
  status,
  createdAt: NOW,
  updatedAt: NOW,
  room,
});

describe('MyVisitResponseDto.fromMine', () => {
  it('ACTIVE면 마지막 이력이 있어도 취소 정보는 null', () => {
    const dto = MyVisitResponseDto.fromMine(
      visit(VisitStatus.ACTIVE),
      { actorType: ActorType.STUDENT, reason: null, createdAt: NOW },
      NOW,
    );
    expect(dto.cancellation).toBeNull();
  });

  it('CANCELED면 마지막 이력으로 취소 정보를 만든다', () => {
    const dto = MyVisitResponseDto.fromMine(
      visit(VisitStatus.CANCELED),
      { actorType: ActorType.TEACHER, reason: '정원 조정', createdAt: NOW },
      NOW,
    );
    expect(dto.cancellation).toEqual({
      by: 'TEACHER',
      reason: '정원 조정',
      canceledAt: NOW.toISOString(),
    });
  });

  it('CANCELED인데 이력이 없으면 데이터 오류로 실패한다 (조용히 null을 내보내지 않음)', () => {
    expect(() => MyVisitResponseDto.fromMine(visit(VisitStatus.CANCELED), undefined, NOW)).toThrow(
      /이력이 없습니다/,
    );
  });
});
