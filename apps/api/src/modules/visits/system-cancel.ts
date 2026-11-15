import { VisitStatus, type Prisma } from '../../generated/prisma/client';
import { systemCanceledHistory, type SystemCancelReason } from './visit-history.factory';

/** 시스템 취소 대상: 한 자습실의 신청(R8) 또는 한 학생의 신청(R9) */
export type SystemCancelTarget = { roomId: number } | { studentId: number };

/**
 * 대상의 **예정** ACTIVE 신청을 시스템 취소한다 (R8, R9).
 * 반드시 호출하는 쪽의 트랜잭션 안에서 실행한다. 신청 상태·이력·activeCount가 함께 바뀌어야 하기 때문이다.
 *
 * - 지난 방문(visitAt < now)은 실제로 일어난 일이므로 건드리지 않는다.
 * - activeCount는 자습실별로 취소한 수만큼 줄인다 (학생 삭제는 여러 자습실에 걸칠 수 있음).
 *
 * @returns 취소한 신청 수
 */
export async function systemCancelUpcomingVisits(
  tx: Prisma.TransactionClient,
  target: SystemCancelTarget,
  reason: SystemCancelReason,
  now: Date,
): Promise<number> {
  const upcoming = await tx.visit.findMany({
    where: { ...target, status: VisitStatus.ACTIVE, visitAt: { gte: now } },
    select: { id: true, roomId: true, studentId: true, visitAt: true },
  });
  if (upcoming.length === 0) {
    return 0;
  }

  const canceled = await tx.visit.updateMany({
    where: { id: { in: upcoming.map((visit) => visit.id) }, status: VisitStatus.ACTIVE },
    data: { status: VisitStatus.CANCELED },
  });
  if (canceled.count !== upcoming.length) {
    // 읽은 뒤 신청 상태가 바뀌었다는 뜻이다. 이력·카운터가 어긋나지 않도록 트랜잭션 전체를 되돌린다.
    throw new Error(
      `시스템 취소 중 신청 상태가 바뀌었습니다 (예상 ${upcoming.length}, 실제 ${canceled.count}).`,
    );
  }

  await tx.visitHistory.createMany({
    data: upcoming.map((visit) => systemCanceledHistory(visit, reason, now)),
  });

  const canceledByRoom = new Map<number, number>();
  for (const visit of upcoming) {
    canceledByRoom.set(visit.roomId, (canceledByRoom.get(visit.roomId) ?? 0) + 1);
  }
  for (const [roomId, count] of canceledByRoom) {
    await tx.studyRoom.update({
      where: { id: roomId },
      data: { activeCount: { decrement: count } },
    });
  }
  return upcoming.length;
}
