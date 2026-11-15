import type {
  HistoryActor as SharedHistoryActor,
  VisitAction as SharedVisitAction,
  VisitStatus as SharedVisitStatus,
} from '@study-room/shared';
import type { ActorType, VisitAction, VisitStatus } from '../../generated/prisma/client';

/**
 * shared(FE용)와 Prisma(DB) enum의 값이 같은지 **컴파일 시점에** 확인한다.
 * 한쪽에만 값을 추가하면 아래 할당이 타입 에러가 되어 빌드가 실패한다.
 */
type IsSame<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

export const ENUMS_IN_SYNC: [
  IsSame<VisitStatus, SharedVisitStatus>,
  IsSame<VisitAction, SharedVisitAction>,
  IsSame<ActorType, SharedHistoryActor>,
] = [true, true, true];
