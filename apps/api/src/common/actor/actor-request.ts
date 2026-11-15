import type { Actor } from '@study-room/shared';
import type { Request } from 'express';

/** ActorGuard가 해석한 요청자를 실어 나르는 요청 타입 */
export interface ActorRequest extends Request {
  actor?: Actor;
}
