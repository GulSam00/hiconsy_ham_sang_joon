import {
  ERROR_CODE,
  ROOM_MAX_PERSONNEL_LIMIT,
  ROOM_TITLE_MAX_LENGTH,
  type FieldError,
  type RoomResponse,
} from '@study-room/shared';
import type { RoomInput } from '@/api/rooms';
import { toApiError } from '@/api/api-error';
import { fromKstInputValue, toKstInputValue } from './datetime';

/** 폼 입력값. 일시는 `datetime-local`(KST) 문자열이다. */
export interface RoomFormValues {
  title: string;
  maxPersonnel: number | null;
  startDate: string;
  endDate: string;
}

export type RoomFormField = keyof RoomFormValues;
export type RoomFormErrors = Partial<Record<RoomFormField, string>>;

export function emptyRoomForm(): RoomFormValues {
  return { title: '', maxPersonnel: null, startDate: '', endDate: '' };
}

export function roomToForm(room: RoomResponse): RoomFormValues {
  return {
    title: room.title,
    maxPersonnel: room.maxPersonnel,
    startDate: toKstInputValue(room.startDate),
    endDate: toKstInputValue(room.endDate),
  };
}

export type RoomFormResult = { ok: true; input: RoomInput } | { ok: false; errors: RoomFormErrors };

/**
 * 제출 전 검사. 서버 검증과 같은 규칙을 화면에서 먼저 알려줄 뿐이며, 최종 판단은 서버가 한다.
 * 통과하면 서버에 보낼 값(일시는 +09:00이 붙은 ISO)을 만든다.
 */
export function validateRoomForm(values: RoomFormValues): RoomFormResult {
  const errors: RoomFormErrors = {};
  const title = values.title.trim();
  if (title === '') {
    errors.title = '이름을 입력해 주세요.';
  } else if (title.length > ROOM_TITLE_MAX_LENGTH) {
    errors.title = `이름은 ${ROOM_TITLE_MAX_LENGTH}자 이하여야 합니다.`;
  }

  const max = values.maxPersonnel;
  if (max === null || !Number.isInteger(max) || max < 1 || max > ROOM_MAX_PERSONNEL_LIMIT) {
    errors.maxPersonnel = `최대 인원은 1~${ROOM_MAX_PERSONNEL_LIMIT} 사이 정수여야 합니다.`;
  }

  const startDate = fromKstInputValue(values.startDate);
  const endDate = fromKstInputValue(values.endDate);
  if (startDate === null) {
    errors.startDate = '시작 일시를 입력해 주세요.';
  }
  if (endDate === null) {
    errors.endDate = '종료 일시를 입력해 주세요.';
  }
  if (
    startDate !== null &&
    endDate !== null &&
    new Date(startDate).getTime() >= new Date(endDate).getTime()
  ) {
    errors.endDate = '종료 일시는 시작 일시보다 늦어야 합니다.';
  }

  if (Object.keys(errors).length > 0 || max === null || startDate === null || endDate === null) {
    return { ok: false, errors };
  }
  return { ok: true, input: { title, maxPersonnel: max, startDate, endDate } };
}

/** 수정 시 바뀐 값만 보낸다. 서버 R6·R7 검사가 바뀐 항목 기준으로 의미를 갖고, 충돌 시 원인을 알기 쉽다. */
export function changedRoomFields(before: RoomResponse, input: RoomInput): Partial<RoomInput> {
  const changed: Partial<RoomInput> = {};
  if (input.title !== before.title) changed.title = input.title;
  if (input.maxPersonnel !== before.maxPersonnel) changed.maxPersonnel = input.maxPersonnel;
  if (new Date(input.startDate).getTime() !== new Date(before.startDate).getTime()) {
    changed.startDate = input.startDate;
  }
  if (new Date(input.endDate).getTime() !== new Date(before.endDate).getTime()) {
    changed.endDate = input.endDate;
  }
  return changed;
}

const ROOM_FORM_FIELDS: readonly RoomFormField[] = [
  'title',
  'maxPersonnel',
  'startDate',
  'endDate',
];

function isRoomFormField(field: string): field is RoomFormField {
  return (ROOM_FORM_FIELDS as readonly string[]).includes(field);
}

/**
 * 서버 에러를 폼 필드 오류로 바꾼다. 필드에 붙일 수 없는 에러는 null (화면 상단에 표시).
 * - VALIDATION_FAILED: details의 필드별 메시지
 * - INVALID_PERIOD: 종료 일시 필드
 */
export function serverErrorsToRoomForm(error: unknown): RoomFormErrors | null {
  const apiError = toApiError(error);
  if (apiError.code === ERROR_CODE.INVALID_PERIOD) {
    return { endDate: apiError.message };
  }
  if (apiError.code === ERROR_CODE.VALIDATION_FAILED && Array.isArray(apiError.details)) {
    const errors: RoomFormErrors = {};
    for (const detail of apiError.details as FieldError[]) {
      if (isRoomFormField(detail.field)) {
        errors[detail.field] = detail.messages.join(' ');
      }
    }
    return Object.keys(errors).length > 0 ? errors : null;
  }
  return null;
}
