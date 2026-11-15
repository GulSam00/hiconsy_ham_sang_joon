/**
 * 데모용 초기 데이터.
 *
 * - 이미 데이터가 있으면 아무것도 하지 않는다 (`npm run dev`를 반복 실행해도 안전).
 *   처음부터 다시 만들려면 `npm run db:reset`을 쓴다.
 * - 날짜는 "실행 시점" 기준으로 만든다. 평가자가 언제 실행해도 신청 가능한 자습실이 있어야 하기 때문이다.
 * - 방문 신청은 넣지 않는다. 신청은 activeCount·이력 정합성 규칙(CLAUDE.md 6·7절)을 거쳐야 하므로
 *   시드에서 직접 쓰지 않고 API(ISSUE-006)로만 만든다.
 */
import { applySqlitePragmas, createPrismaClient } from '../src/database/create-prisma-client';

const KST_OFFSET_HOURS = 9;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/** 오늘(KST)로부터 dayOffset일 뒤 KST hour시 정각을 UTC Date로 만든다. KST는 일광절약시간이 없어 고정 오프셋으로 충분하다. */
function kstAt(now: Date, dayOffset: number, hour: number): Date {
  const kstNow = new Date(now.getTime() + KST_OFFSET_HOURS * MS_PER_HOUR);
  const kstMidnightAsUtc = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate(),
  );
  return new Date(
    kstMidnightAsUtc + dayOffset * MS_PER_DAY + (hour - KST_OFFSET_HOURS) * MS_PER_HOUR,
  );
}

const STUDENTS = [
  { name: '김민준', phone: '010-0000-0001' },
  { name: '이서연', phone: '010-0000-0002' },
  { name: '박도윤', phone: '010-0000-0003' },
  { name: '최지우', phone: '010-0000-0004' },
  { name: '정하준', phone: '010-0000-0005' },
  { name: '강서아', phone: '010-0000-0006' },
] as const;

async function main(): Promise<void> {
  const prisma = createPrismaClient();
  try {
    await prisma.$connect();
    await applySqlitePragmas(prisma);

    const existing = await prisma.student.count();
    if (existing > 0) {
      console.log(
        `[seed] 이미 데이터가 있어 건너뜁니다 (학생 ${existing}명). 초기화하려면 npm run db:reset`,
      );
      return;
    }

    const now = new Date();
    await prisma.$transaction([
      prisma.student.createMany({ data: [...STUDENTS] }),
      prisma.studyRoom.createMany({
        data: [
          {
            title: '수학 자습실 A (운영 중)',
            maxPersonnel: 5,
            startDate: kstAt(now, 0, 0),
            endDate: kstAt(now, 7, 22),
          },
          {
            title: '영어 자습실 B (소규모, 정원 2명)',
            maxPersonnel: 2,
            startDate: kstAt(now, 1, 9),
            endDate: kstAt(now, 3, 22),
          },
          {
            title: '국어 자습실 C (운영 종료)',
            maxPersonnel: 10,
            startDate: kstAt(now, -14, 9),
            endDate: kstAt(now, -7, 22),
          },
          {
            title: '과학 자습실 D (삭제됨, 목록에 보이면 안 됨)',
            maxPersonnel: 5,
            startDate: kstAt(now, 1, 9),
            endDate: kstAt(now, 5, 22),
            deletedAt: now,
          },
        ],
      }),
    ]);
    console.log(`[seed] 학생 ${STUDENTS.length}명, 자습실 4개를 만들었습니다.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('[seed] 실패:', error instanceof Error ? error.stack : error);
  process.exit(1);
});
