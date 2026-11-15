import {
  VisitStatus,
  type Student,
  type StudyRoom,
  type Visit,
} from '../../src/generated/prisma/client';
import type { PrismaService } from '../../src/prisma/prisma.service';

export const TEACHER = { 'X-Actor-Role': 'TEACHER' } as const;

export function studentHeaders(studentId: number): Record<string, string> {
  return { 'X-Actor-Role': 'STUDENT', 'X-Student-Id': String(studentId) };
}

export function createStudent(prisma: PrismaService, name = '테스트 학생'): Promise<Student> {
  return prisma.student.create({ data: { name, phone: '010-0000-0000' } });
}

export function createRoom(
  prisma: PrismaService,
  data: Partial<
    Pick<StudyRoom, 'title' | 'maxPersonnel' | 'startDate' | 'endDate' | 'deletedAt'>
  > = {},
): Promise<StudyRoom> {
  return prisma.studyRoom.create({
    data: {
      title: data.title ?? '테스트 자습실',
      maxPersonnel: data.maxPersonnel ?? 10,
      startDate: data.startDate ?? new Date('2026-11-15T00:00:00.000Z'),
      endDate: data.endDate ?? new Date('2026-11-20T13:00:00.000Z'),
      deletedAt: data.deletedAt ?? null,
    },
  });
}

/**
 * 방문 신청 API(ISSUE-006)가 생기기 전까지 쓰는 테스트 전용 신청 생성.
 * 실제 서비스처럼 activeCount를 함께 맞춘다. 운영 코드는 이 경로로 신청을 만들지 않는다.
 */
export async function createVisit(
  prisma: PrismaService,
  room: StudyRoom,
  student: Student,
  visitAt: string,
  status: VisitStatus = VisitStatus.ACTIVE,
): Promise<Visit> {
  return prisma.$transaction(async (tx) => {
    const visit = await tx.visit.create({
      data: { roomId: room.id, studentId: student.id, visitAt: new Date(visitAt), status },
    });
    if (status === VisitStatus.ACTIVE) {
      await tx.studyRoom.update({
        where: { id: room.id },
        data: { activeCount: { increment: 1 } },
      });
    }
    return visit;
  });
}

/** 불변 조건 검증용: 저장된 activeCount와 실제 ACTIVE 신청 수 (docs/visit-policy.md 4절) */
export async function readActiveCounts(
  prisma: PrismaService,
  roomId: number,
): Promise<{ activeCount: number; actual: number }> {
  const room = await prisma.studyRoom.findUniqueOrThrow({ where: { id: roomId } });
  const actual = await prisma.visit.count({ where: { roomId, status: VisitStatus.ACTIVE } });
  return { activeCount: room.activeCount, actual };
}
