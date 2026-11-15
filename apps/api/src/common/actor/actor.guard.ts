import { Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ERROR_CODE, type ActorRole } from '@study-room/shared';
import { DomainException } from '../errors/domain.exception';
import { IS_PUBLIC_KEY, ROLES_KEY } from './actor.decorators';
import type { ActorRequest } from './actor-request';
import { parseActor } from './parse-actor';

/**
 * 전역 Guard. Nest에서 Guard는 Pipe(DTO 검증)보다 먼저 실행되므로,
 * 권한이 없는 요청은 검증 규칙을 알려주기 전에 401/403으로 끝난다.
 *
 * **기본 거부(fail-closed)**: `@Roles`도 `@Public`도 없는 엔드포인트는 500으로 막는다.
 * "역할 선언을 깜빡하면 아무나 호출 가능"이 아니라 "깜빡하면 아무도 호출 불가"가 되도록 하기 위함이다.
 */
@Injectable()
export class ActorGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, targets) === true) {
      return true;
    }

    const roles = this.reflector.getAllAndOverride<ActorRole[] | undefined>(ROLES_KEY, targets);
    if (roles === undefined) {
      const handler = `${context.getClass().name}.${context.getHandler().name}`;
      throw new Error(`${handler}에 @Roles 또는 @Public 선언이 없습니다.`);
    }

    const request = context.switchToHttp().getRequest<ActorRequest>();
    const actor = parseActor(request.headers);
    if (!roles.includes(actor.role)) {
      throw new DomainException(ERROR_CODE.FORBIDDEN_ROLE);
    }
    request.actor = actor;
    return true;
  }
}
