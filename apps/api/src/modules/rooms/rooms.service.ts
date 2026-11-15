import { Injectable } from '@nestjs/common';
import { ERROR_CODE, type FieldError } from '@study-room/shared';
import { Clock } from '../../common/clock/clock';
import { DomainException } from '../../common/errors/domain.exception';
import { assertPolicy } from '../../common/policy/assert-policy';
import { VisitStatus, type Prisma, type StudyRoom } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { systemCancelUpcomingVisits } from '../visits/system-cancel';
import { SYSTEM_CANCEL_REASON } from '../visits/visit-history.factory';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomResponseDto } from './dto/room-response.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import {
  checkCapacityReduction,
  checkPeriod,
  checkPeriodChange,
  type ActiveVisitSnapshot,
  type RoomPeriod,
} from './rooms.policy';

type Tx = Prisma.TransactionClient;

interface RoomChanges extends RoomPeriod {
  title: string;
  maxPersonnel: number;
}

const NOT_DELETED = { deletedAt: null } as const;

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /** FR-ROM-01: 삭제되지 않은 자습실을 운영 시작 순으로 */
  async findAll(): Promise<RoomResponseDto[]> {
    const rooms = await this.prisma.studyRoom.findMany({
      where: NOT_DELETED,
      orderBy: [{ startDate: 'asc' }, { id: 'asc' }],
    });
    return rooms.map((room) => RoomResponseDto.from(room));
  }

  async findOne(id: number): Promise<RoomResponseDto> {
    return RoomResponseDto.from(await this.findActiveRoom(this.prisma, id));
  }

  /** FR-ROM-02 */
  async create(dto: CreateRoomDto): Promise<RoomResponseDto> {
    const period = { startDate: new Date(dto.startDate), endDate: new Date(dto.endDate) };
    assertPolicy(checkPeriod(period));

    const room = await this.prisma.studyRoom.create({
      data: { title: dto.title, maxPersonnel: dto.maxPersonnel, ...period },
    });
    return RoomResponseDto.from(room);
  }

  /**
   * FR-ROM-04 + R6·R7.
   *
   * 정원 조건과 기간 조건을 **UPDATE 한 문장의 WHERE**에 함께 건다. "검사 후 수정"으로 나누면 그 사이에
   * 들어온 신청이 규칙을 깰 수 있기 때문이다. 0건이 바뀌었을 때만 원인을 진단해 details를 만든다.
   */
  async update(id: number, dto: UpdateRoomDto): Promise<RoomResponseDto> {
    assertHasChanges(dto);

    return this.prisma.$transaction(async (tx) => {
      const current = await this.findActiveRoom(tx, id);
      const next = mergeChanges(current, dto);
      assertPolicy(checkPeriod(next));

      const { count } = await tx.studyRoom.updateMany({
        where: {
          id,
          ...NOT_DELETED,
          activeCount: { lte: next.maxPersonnel },
          visits: {
            none: {
              status: VisitStatus.ACTIVE,
              OR: [{ visitAt: { lt: next.startDate } }, { visitAt: { gt: next.endDate } }],
            },
          },
        },
        data: next,
      });
      if (count === 0) {
        await this.throwUpdateConflict(tx, id, next);
      }
      return RoomResponseDto.from(await tx.studyRoom.findUniqueOrThrow({ where: { id } }));
    });
  }

  /**
   * FR-ROM-05 + R8: Soft Delete하고, **예정** 신청만 같은 트랜잭션에서 시스템 취소한다.
   * 지난 방문은 실제로 일어난 일이므로 ACTIVE 그대로 기록으로 남긴다 (docs/visit-policy.md 3절).
   */
  async remove(id: number): Promise<void> {
    const now = this.clock.now();

    await this.prisma.$transaction(async (tx) => {
      // 자습실 행을 먼저 갱신한다. 이후 이 자습실에 대한 신청 변경은 이 트랜잭션이 끝날 때까지 기다린다.
      const { count } = await tx.studyRoom.updateMany({
        where: { id, ...NOT_DELETED },
        data: { deletedAt: now },
      });
      if (count === 0) {
        throw new DomainException(ERROR_CODE.ROOM_NOT_FOUND);
      }

      await systemCancelUpcomingVisits(tx, { roomId: id }, SYSTEM_CANCEL_REASON.ROOM_DELETED, now);
    });
  }

  private async findActiveRoom(client: Tx, id: number): Promise<StudyRoom> {
    const room = await client.studyRoom.findFirst({ where: { id, ...NOT_DELETED } });
    if (room === null) {
      throw new DomainException(ERROR_CODE.ROOM_NOT_FOUND);
    }
    return room;
  }

  /** 조건부 UPDATE가 0건일 때 원인을 진단한다. 정원(R6)을 기간(R7)보다 먼저 알린다. */
  private async throwUpdateConflict(tx: Tx, id: number, next: RoomChanges): Promise<never> {
    await this.findActiveRoom(tx, id);
    const activeVisits = await this.findActiveVisits(tx, id);
    const now = this.clock.now();

    assertPolicy(checkCapacityReduction(next.maxPersonnel, activeVisits, now));
    assertPolicy(checkPeriodChange(next, activeVisits, now));

    // 정원·기간 모두 문제가 없는데 UPDATE가 실패했다면 activeCount와 실제 ACTIVE 수가 어긋난 것이다.
    throw new Error(
      `자습실 ${id} 수정이 실패했지만 정책 위반을 찾지 못했습니다. activeCount 정합성을 확인하세요.`,
    );
  }

  private async findActiveVisits(tx: Tx, roomId: number): Promise<ActiveVisitSnapshot[]> {
    const visits = await tx.visit.findMany({
      where: { roomId, status: VisitStatus.ACTIVE },
      orderBy: [{ visitAt: 'asc' }, { id: 'asc' }],
      select: { id: true, studentId: true, visitAt: true, student: { select: { name: true } } },
    });
    return visits.map((visit) => ({
      visitId: visit.id,
      studentId: visit.studentId,
      studentName: visit.student.name,
      visitAt: visit.visitAt,
    }));
  }
}

function assertHasChanges(dto: UpdateRoomDto): void {
  const hasChanges = Object.values(dto).some((value) => value !== undefined);
  if (!hasChanges) {
    const details: FieldError[] = [{ field: 'body', messages: ['변경할 값이 없습니다.'] }];
    throw new DomainException(ERROR_CODE.VALIDATION_FAILED, details);
  }
}

function mergeChanges(current: StudyRoom, dto: UpdateRoomDto): RoomChanges {
  return {
    title: dto.title ?? current.title,
    maxPersonnel: dto.maxPersonnel ?? current.maxPersonnel,
    startDate: dto.startDate === undefined ? current.startDate : new Date(dto.startDate),
    endDate: dto.endDate === undefined ? current.endDate : new Date(dto.endDate),
  };
}
