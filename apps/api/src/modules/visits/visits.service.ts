import { Injectable } from '@nestjs/common';
import { ERROR_CODE, type Actor } from '@study-room/shared';
import { Clock } from '../../common/clock/clock';
import { DomainException } from '../../common/errors/domain.exception';
import { assertPolicy } from '../../common/policy/assert-policy';
import {
  Prisma,
  VisitAction,
  VisitStatus,
  type StudyRoom,
  type Visit,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { isWithinPeriod } from '../rooms/rooms.policy';
import {
  RoomVisitResponseDto,
  VisitHistoryResponseDto,
  VisitResponseDto,
} from './dto/visit-response.dto';
import { actorTypeOf, visitHistory } from './visit-history.factory';
import {
  checkCancelReason,
  checkChangeable,
  checkNotDuplicated,
  checkVisitTime,
  isSameVisitTime,
  normalizeCancelReason,
} from './visits.policy';

type Tx = Prisma.TransactionClient;

const NOT_DELETED = { deletedAt: null } as const;
const PRISMA_UNIQUE_VIOLATION = 'P2002';

/**
 * 방문 신청·시간 수정·취소와 이력 기록 (docs/visit-policy.md).
 *
 * 모든 쓰기는 같은 패턴을 따른다.
 * 1. 트랜잭션 안에서 대상을 읽고 정책 함수로 검사한다 (명확한 에러 메시지용).
 * 2. 실제 변경은 **조건을 건 UPDATE 한 문장**으로 한다 (동시 요청에서도 규칙이 깨지지 않게).
 * 3. UPDATE가 0건이면 다시 읽어 원인을 진단한다.
 * 4. 상태 변경과 이력 INSERT는 같은 트랜잭션에서 한다.
 */
@Injectable()
export class VisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /** FR-VST-01: 신청 또는 취소 후 재신청 (R1, R3, R4) */
  async apply(
    roomId: number,
    actor: Actor,
    studentId: number,
    visitAt: Date,
  ): Promise<VisitResponseDto> {
    const now = this.clock.now();
    try {
      return await this.prisma.$transaction(async (tx) => {
        const room = await findActiveRoom(tx, roomId);
        const student = await tx.student.findFirst({ where: { id: studentId, ...NOT_DELETED } });
        if (student === null) {
          throw new DomainException(ERROR_CODE.STUDENT_NOT_FOUND);
        }
        assertPolicy(checkVisitTime(visitAt, room, now));

        const existing = await tx.visit.findUnique({
          where: { roomId_studentId: { roomId, studentId } },
        });
        assertPolicy(checkNotDuplicated(existing));

        await this.reserveSeat(tx, roomId, visitAt, now);

        const visit =
          existing === null
            ? await tx.visit.create({ data: { roomId, studentId, visitAt } })
            : await this.reactivate(tx, existing, visitAt);

        await tx.visitHistory.create({
          data: visitHistory(
            visit,
            {
              action: existing === null ? VisitAction.APPLIED : VisitAction.REAPPLIED,
              actorType: actorTypeOf(actor),
              prevVisitAt: null,
              nextVisitAt: visitAt,
            },
            now,
          ),
        });
        return VisitResponseDto.from(visit, now);
      });
    } catch (error: unknown) {
      // 같은 학생의 첫 신청이 동시에 두 번 들어오면, 늦은 쪽이 유니크 제약에 걸린다 (좌석 확보는 함께 롤백됨).
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_VIOLATION
      ) {
        throw new DomainException(ERROR_CODE.DUPLICATE_VISIT);
      }
      throw error;
    }
  }

  /** FR-VST-02: 방문 시간 수정 (R4, R5, R12) */
  async changeTime(visitId: number, actor: Actor, visitAt: Date): Promise<VisitResponseDto> {
    const now = this.clock.now();
    return this.prisma.$transaction(async (tx) => {
      const visit = await findVisit(tx, visitId);
      assertPolicy(checkChangeable(visit, actor, now));

      if (isSameVisitTime(visit.visitAt, visitAt)) {
        return VisitResponseDto.from(visit, now); // R12: 변경 없음, 이력 없음
      }

      const room = await findActiveRoom(tx, visit.roomId);
      assertPolicy(checkVisitTime(visitAt, room, now));

      // 이전 시각이 그대로이고 자습실 기간 안일 때만 바꾼다. 읽은 뒤 다른 변경이 끼어들면 0건이 된다.
      const { count } = await tx.visit.updateMany({
        where: {
          id: visitId,
          status: VisitStatus.ACTIVE,
          visitAt: visit.visitAt,
          room: { ...NOT_DELETED, startDate: { lte: visitAt }, endDate: { gte: visitAt } },
        },
        data: { visitAt },
      });
      if (count === 0) {
        await this.throwChangeConflict(tx, visitId, actor, visitAt, now);
      }

      await tx.visitHistory.create({
        data: visitHistory(
          visit,
          {
            action: VisitAction.TIME_CHANGED,
            actorType: actorTypeOf(actor),
            prevVisitAt: visit.visitAt,
            nextVisitAt: visitAt,
          },
          now,
        ),
      });
      return VisitResponseDto.from(
        await tx.visit.findUniqueOrThrow({ where: { id: visitId } }),
        now,
      );
    });
  }

  /**
   * FR-VST-03(학생 본인), R11(강사): 취소. 정원을 돌려준다 (R5).
   * 강사는 사유가 필수이고 소유자 검사를 받지 않는다. 이력의 행위 주체는 요청자 역할로 정해진다.
   */
  async cancel(
    visitId: number,
    actor: Actor,
    rawReason: string | undefined,
  ): Promise<VisitResponseDto> {
    const now = this.clock.now();
    const reason = normalizeCancelReason(rawReason);
    assertPolicy(checkCancelReason(actor, reason));

    return this.prisma.$transaction(async (tx) => {
      const visit = await findVisit(tx, visitId);
      assertPolicy(checkChangeable(visit, actor, now));

      // ACTIVE이고 아직 지나지 않았을 때만 취소한다. 동시에 두 번 취소해도 한쪽만 성공한다.
      const { count } = await tx.visit.updateMany({
        where: { id: visitId, status: VisitStatus.ACTIVE, visitAt: { gte: now } },
        data: { status: VisitStatus.CANCELED },
      });
      if (count === 0) {
        const latest = await findVisit(tx, visitId);
        assertPolicy(checkChangeable(latest, actor, now));
        throw new Error(`신청 ${visitId} 취소가 실패했지만 원인을 찾지 못했습니다.`);
      }

      const released = await tx.studyRoom.updateMany({
        where: { id: visit.roomId, activeCount: { gt: 0 } },
        data: { activeCount: { decrement: 1 } },
      });
      if (released.count === 0) {
        // ACTIVE 신청이 있었는데 카운터가 0이면 불변 조건이 이미 깨진 것이다. 숨기지 않고 되돌린다.
        throw new Error(`자습실 ${visit.roomId}의 activeCount가 실제 신청 수와 어긋났습니다.`);
      }

      await tx.visitHistory.create({
        data: visitHistory(
          visit,
          {
            action: VisitAction.CANCELED,
            actorType: actorTypeOf(actor),
            prevVisitAt: visit.visitAt,
            nextVisitAt: null,
            reason,
          },
          now,
        ),
      });
      return VisitResponseDto.from(
        await tx.visit.findUniqueOrThrow({ where: { id: visitId } }),
        now,
      );
    });
  }

  /** 자습실 상세: 신청자 목록 (방문 시각순) */
  async findRoomVisits(roomId: number): Promise<RoomVisitResponseDto[]> {
    const now = this.clock.now();
    await findActiveRoom(this.prisma, roomId);
    const visits = await this.prisma.visit.findMany({
      where: { roomId },
      orderBy: [{ visitAt: 'asc' }, { id: 'asc' }],
      include: { student: { select: { name: true } } },
    });
    return visits.map((visit) => RoomVisitResponseDto.fromWithStudent(visit, now));
  }

  /** FR-ROM-03: 자습실 상세의 신청·수정·취소 이력 (시간순, 같은 시각이면 id순) */
  async findRoomHistories(roomId: number): Promise<VisitHistoryResponseDto[]> {
    await findActiveRoom(this.prisma, roomId);
    const histories = await this.prisma.visitHistory.findMany({
      where: { roomId },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      include: { student: { select: { name: true } } },
    });
    return histories.map((history) => VisitHistoryResponseDto.from(history));
  }

  /**
   * 정원 확보 (R1, CLAUDE.md 7절). 정원 여유와 운영 기간을 UPDATE 한 문장의 조건으로 건다.
   * 0건이면 원인을 진단한다: 자습실이 삭제됐는지, 기간이 바뀌었는지, 정원이 찼는지.
   */
  private async reserveSeat(tx: Tx, roomId: number, visitAt: Date, now: Date): Promise<void> {
    const { count } = await tx.studyRoom.updateMany({
      where: {
        id: roomId,
        ...NOT_DELETED,
        activeCount: { lt: this.prisma.studyRoom.fields.maxPersonnel },
        startDate: { lte: visitAt },
        endDate: { gte: visitAt },
      },
      data: { activeCount: { increment: 1 } },
    });
    if (count === 1) {
      return;
    }
    const room = await findActiveRoom(tx, roomId);
    assertPolicy(checkVisitTime(visitAt, room, now));
    throw new DomainException(ERROR_CODE.ROOM_FULL);
  }

  /** 취소된 신청을 다시 활성화한다 (R3). 동시에 재신청되면 0건이 되어 중복으로 본다. */
  private async reactivate(tx: Tx, existing: Visit, visitAt: Date): Promise<Visit> {
    const { count } = await tx.visit.updateMany({
      where: { id: existing.id, status: VisitStatus.CANCELED },
      data: { status: VisitStatus.ACTIVE, visitAt },
    });
    if (count === 0) {
      throw new DomainException(ERROR_CODE.DUPLICATE_VISIT);
    }
    return tx.visit.findUniqueOrThrow({ where: { id: existing.id } });
  }

  private async throwChangeConflict(
    tx: Tx,
    visitId: number,
    actor: Actor,
    visitAt: Date,
    now: Date,
  ): Promise<never> {
    const latest = await findVisit(tx, visitId);
    assertPolicy(checkChangeable(latest, actor, now));
    const room = await findActiveRoom(tx, latest.roomId);
    if (!isWithinPeriod(visitAt, room)) {
      throw new DomainException(ERROR_CODE.VISIT_OUT_OF_PERIOD);
    }
    // 읽은 뒤 같은 신청의 시각이 다른 요청으로 바뀌었다. 이력의 prev가 어긋나지 않도록 되돌린다.
    throw new Error(`신청 ${visitId}의 시간이 동시에 변경되었습니다.`);
  }
}

async function findActiveRoom(client: Tx, id: number): Promise<StudyRoom> {
  const room = await client.studyRoom.findFirst({ where: { id, ...NOT_DELETED } });
  if (room === null) {
    throw new DomainException(ERROR_CODE.ROOM_NOT_FOUND);
  }
  return room;
}

async function findVisit(client: Tx, id: number): Promise<Visit> {
  const visit = await client.visit.findUnique({ where: { id } });
  if (visit === null) {
    throw new DomainException(ERROR_CODE.VISIT_NOT_FOUND);
  }
  return visit;
}
