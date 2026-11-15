import { SetMetadata, createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Actor, ActorRole } from '@study-room/shared';
import type { ActorRequest } from './actor-request';

export const ROLES_KEY = 'actor:roles';
export const IS_PUBLIC_KEY = 'actor:public';

/** 이 엔드포인트를 호출할 수 있는 역할. 모든 엔드포인트는 `@Roles` 또는 `@Public` 중 하나를 선언해야 한다. */
export const Roles = (...roles: [ActorRole, ...ActorRole[]]) => SetMetadata(ROLES_KEY, roles);

/** 요청자 헤더 없이 호출할 수 있는 엔드포인트 (health 등) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** ActorGuard가 해석한 요청자. 컨트롤러는 헤더를 직접 읽지 않고 이것을 쓴다. */
export const CurrentActor = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<ActorRequest>();
  if (request.actor === undefined) {
    // @Public 엔드포인트에서 @CurrentActor를 쓴 경우: 코드 작성 실수이므로 500으로 드러낸다.
    throw new Error('@CurrentActor()는 @Roles가 선언된 엔드포인트에서만 쓸 수 있습니다.');
  }
  return request.actor satisfies Actor;
});
