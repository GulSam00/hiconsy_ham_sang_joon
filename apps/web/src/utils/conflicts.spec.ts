import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/api-error';
import { toRoomConflict, withoutVisits } from './conflicts';

const visit = { visitId: 1, studentId: 1, studentName: '김민준', visitAt: 'x', isPast: false };

describe('toRoomConflict', () => {
  it('정원 충돌', () => {
    const error = new ApiError('CAPACITY_BELOW_ACTIVE', '정원 오류', 409, {
      activeCount: 3,
      requestedMaxPersonnel: 2,
      cancellableVisits: [visit],
    });
    expect(toRoomConflict(error)).toMatchObject({
      kind: 'CAPACITY',
      details: { activeCount: 3, cancellableVisits: [visit] },
    });
  });

  it('기간 충돌', () => {
    const error = new ApiError('PERIOD_EXCLUDES_VISITS', '기간 오류', 409, { conflicts: [visit] });
    expect(toRoomConflict(error)).toMatchObject({
      kind: 'PERIOD',
      details: { conflicts: [visit] },
    });
  });

  it.each([
    ['다른 코드', new ApiError('ROOM_NOT_FOUND', 'm', 404)],
    ['details 없음', new ApiError('CAPACITY_BELOW_ACTIVE', 'm', 409)],
    [
      'details 형식 오류',
      new ApiError('PERIOD_EXCLUDES_VISITS', 'm', 409, { conflicts: [{ id: 1 }] }),
    ],
  ])('%s → null', (_name, error) => {
    expect(toRoomConflict(error)).toBeNull();
  });
});

describe('withoutVisits', () => {
  it('취소한 신청을 빼고, 원래 값은 바꾸지 않는다', () => {
    const other = { ...visit, visitId: 2 };
    const original = toRoomConflict(
      new ApiError('PERIOD_EXCLUDES_VISITS', 'm', 409, { conflicts: [visit, other] }),
    );
    if (original === null) throw new Error('충돌이 아닙니다.');

    const filtered = withoutVisits(original, [1]);

    expect(filtered.kind === 'PERIOD' && filtered.details.conflicts.map((v) => v.visitId)).toEqual([
      2,
    ]);
    expect(original.kind === 'PERIOD' && original.details.conflicts).toHaveLength(2);
  });
});
