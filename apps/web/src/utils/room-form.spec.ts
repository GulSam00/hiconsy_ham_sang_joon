import { describe, expect, it } from 'vitest';
import { ApiError } from '@/api/api-error';
import {
  changedRoomFields,
  roomToForm,
  serverErrorsToRoomForm,
  validateRoomForm,
  type RoomFormValues,
} from './room-form';

const valid: RoomFormValues = {
  title: '  수학 자습실  ',
  maxPersonnel: 5,
  startDate: '2026-11-20T09:00',
  endDate: '2026-11-27T22:00',
};

const room = {
  id: 1,
  title: '수학 자습실',
  maxPersonnel: 5,
  activeCount: 0,
  startDate: '2026-11-20T00:00:00.000Z',
  endDate: '2026-11-27T13:00:00.000Z',
  createdAt: '2026-11-15T00:00:00.000Z',
  updatedAt: '2026-11-15T00:00:00.000Z',
};

describe('validateRoomForm', () => {
  it('통과하면 이름을 다듬고 일시에 +09:00을 붙인다', () => {
    expect(validateRoomForm(valid)).toEqual({
      ok: true,
      input: {
        title: '수학 자습실',
        maxPersonnel: 5,
        startDate: '2026-11-20T09:00:00+09:00',
        endDate: '2026-11-27T22:00:00+09:00',
      },
    });
  });

  it.each<[string, Partial<RoomFormValues>, string]>([
    ['빈 이름', { title: '   ' }, 'title'],
    ['정원 없음', { maxPersonnel: null }, 'maxPersonnel'],
    ['정원 0', { maxPersonnel: 0 }, 'maxPersonnel'],
    ['정원 소수', { maxPersonnel: 1.5 }, 'maxPersonnel'],
    ['시작 없음', { startDate: '' }, 'startDate'],
    ['시작 = 종료', { endDate: '2026-11-20T09:00' }, 'endDate'],
    ['시작 > 종료', { endDate: '2026-11-19T09:00' }, 'endDate'],
  ])('%s → %s 오류', (_name, override, field) => {
    const result = validateRoomForm({ ...valid, ...override });
    expect(result.ok).toBe(false);
    expect(result.ok ? {} : result.errors).toHaveProperty(field);
  });
});

describe('roomToForm / changedRoomFields', () => {
  it('서버 값을 KST 입력값으로 바꾼다', () => {
    expect(roomToForm(room)).toEqual({
      title: '수학 자습실',
      maxPersonnel: 5,
      startDate: '2026-11-20T09:00',
      endDate: '2026-11-27T22:00',
    });
  });

  it('바뀐 필드만 남긴다 (같은 순간이면 표기가 달라도 안 바뀐 것)', () => {
    const result = validateRoomForm({ ...roomToForm(room), maxPersonnel: 3 });
    if (!result.ok) throw new Error('검증 실패');

    expect(changedRoomFields(room, result.input)).toEqual({ maxPersonnel: 3 });
  });
});

describe('serverErrorsToRoomForm', () => {
  it('VALIDATION_FAILED의 필드별 메시지를 폼 필드로', () => {
    const error = new ApiError('VALIDATION_FAILED', 'm', 400, [
      { field: 'startDate', messages: ['시간대 필요'] },
      { field: 'unknown', messages: ['무시'] },
    ]);
    expect(serverErrorsToRoomForm(error)).toEqual({ startDate: '시간대 필요' });
  });

  it('INVALID_PERIOD는 종료 일시 필드로', () => {
    expect(serverErrorsToRoomForm(new ApiError('INVALID_PERIOD', '기간 오류', 422))).toEqual({
      endDate: '기간 오류',
    });
  });

  it('필드에 붙일 수 없는 에러는 null', () => {
    expect(serverErrorsToRoomForm(new ApiError('ROOM_NOT_FOUND', 'm', 404))).toBeNull();
  });
});
