import { Controller, Get, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ACTOR_ROLE, ERROR_CODE } from '@study-room/shared';
import { describe, expect, it } from 'vitest';
import { DomainException } from '../errors/domain.exception';
import { Public, Roles } from './actor.decorators';
import type { ActorRequest } from './actor-request';
import { ActorGuard } from './actor.guard';

@Controller()
class SampleController {
  @Roles(ACTOR_ROLE.TEACHER)
  @Get()
  teacherOnly(): void {}

  @Roles(ACTOR_ROLE.TEACHER, ACTOR_ROLE.STUDENT)
  @Get()
  anyone(): void {}

  @Public()
  @Get()
  open(): void {}

  @Get()
  undeclared(): void {}
}

type Handler = keyof SampleController;

/** Nest가 Guard에 넘기는 것과 같은 "핸들러 함수 참조"를 꺼낸다. 메타데이터는 이 참조에 붙어 있다. */
function handlerOf(name: Handler): unknown {
  return Object.getOwnPropertyDescriptor(SampleController.prototype, name)?.value;
}

function contextFor(handler: Handler, headers: Record<string, string>) {
  const request = { headers } as unknown as ActorRequest;
  const context = {
    getHandler: () => handlerOf(handler),
    getClass: () => SampleController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

const guard = new ActorGuard(new Reflector());
const TEACHER = { 'x-actor-role': 'TEACHER' };
const STUDENT = { 'x-actor-role': 'STUDENT', 'x-student-id': '7' };

describe('ActorGuard', () => {
  it('허용된 역할이면 통과하고 요청에 요청자를 싣는다', () => {
    const { context, request } = contextFor('anyone', STUDENT);

    expect(guard.canActivate(context)).toBe(true);
    expect(request.actor).toEqual({ role: ACTOR_ROLE.STUDENT, studentId: 7 });
  });

  it('허용되지 않은 역할이면 FORBIDDEN_ROLE', () => {
    const { context } = contextFor('teacherOnly', STUDENT);

    expect(() => guard.canActivate(context)).toThrow(DomainException);
    try {
      guard.canActivate(context);
    } catch (error: unknown) {
      expect((error as DomainException).code).toBe(ERROR_CODE.FORBIDDEN_ROLE);
    }
  });

  it('@Public이면 헤더 없이 통과한다', () => {
    const { context, request } = contextFor('open', {});

    expect(guard.canActivate(context)).toBe(true);
    expect(request.actor).toBeUndefined();
  });

  it('@Roles도 @Public도 없으면 요청을 막는다 (기본 거부)', () => {
    const { context } = contextFor('undeclared', TEACHER);

    expect(() => guard.canActivate(context)).toThrow(/@Roles 또는 @Public/);
  });
});
