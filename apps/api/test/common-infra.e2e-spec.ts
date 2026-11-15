/**
 * 공통 인프라(요청자 Guard, 검증 Pipe, 예외 필터, Swagger)가 실제 HTTP 요청에서
 * CLAUDE.md 7·8절대로 동작하는지 검증한다. 검증용 컨트롤러는 이 테스트에서만 등록한다.
 */
import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  ACTOR_ROLE,
  ERROR_CODE,
  ERROR_MESSAGE,
  type Actor,
  type ErrorResponse,
  type FieldError,
} from '@study-room/shared';
import { IsInt, Min } from 'class-validator';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CurrentActor, Public, Roles } from '../src/common/actor/actor.decorators';
import { DomainException } from '../src/common/errors/domain.exception';
import { ParseIdPipe } from '../src/common/validation/parse-id.pipe';
import { TEST_NOW as NOW, createTestApp, type TestApp } from './support/test-app';

class ProbeDto {
  @IsInt()
  @Min(1)
  value: number;
}

@Controller('probe')
class ProbeController {
  @Roles(ACTOR_ROLE.TEACHER)
  @Post('teacher')
  teacherOnly(@Body() dto: ProbeDto, @CurrentActor() actor: Actor) {
    return { actor, value: dto.value };
  }

  @Roles(ACTOR_ROLE.TEACHER, ACTOR_ROLE.STUDENT)
  @Get('me')
  me(@CurrentActor() actor: Actor) {
    return actor;
  }

  @Roles(ACTOR_ROLE.TEACHER)
  @Get('items/:id')
  item(@Param('id', ParseIdPipe) id: number) {
    return { id, type: typeof id };
  }

  @Roles(ACTOR_ROLE.TEACHER)
  @Get('domain-error')
  domainError(): never {
    throw new DomainException(ERROR_CODE.ROOM_FULL, { roomId: 1 });
  }

  @Public()
  @Get('crash')
  crash(): never {
    throw new Error('secret internal detail');
  }

  @Get('undeclared')
  undeclared() {
    return 'should not reach';
  }
}

const TEACHER = { 'X-Actor-Role': 'TEACHER' };
const STUDENT = { 'X-Actor-Role': 'STUDENT', 'X-Student-Id': '7' };

describe('공통 인프라 (e2e)', () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp({ controllers: [ProbeController] });
  });

  afterAll(async () => {
    await t.app.close();
  });

  const http = () => request(t.app.getHttpServer());

  function expectError(body: unknown, statusCode: number, code: ErrorResponse['code']): void {
    expect(body).toMatchObject({ statusCode, code, timestamp: NOW });
  }

  describe('요청자 식별', () => {
    it('헤더가 없으면 401 ACTOR_REQUIRED', async () => {
      const res = await http().get('/api/probe/me').expect(401);
      expectError(res.body, 401, ERROR_CODE.ACTOR_REQUIRED);
    });

    it('학생인데 학생 id가 없으면 401', async () => {
      const res = await http().get('/api/probe/me').set('X-Actor-Role', 'STUDENT').expect(401);
      expectError(res.body, 401, ERROR_CODE.ACTOR_REQUIRED);
    });

    it('컨트롤러는 @CurrentActor로 해석된 요청자를 받는다', async () => {
      const res = await http().get('/api/probe/me').set(STUDENT).expect(200);
      expect(res.body).toEqual({ role: 'STUDENT', studentId: 7 });
    });

    it('@Public 엔드포인트(health)는 헤더 없이 호출된다', async () => {
      await http().get('/api/health').expect(200);
    });

    it('@Roles·@Public 선언이 없으면 500으로 막힌다 (기본 거부)', async () => {
      const res = await http().get('/api/probe/undeclared').set(TEACHER).expect(500);
      expectError(res.body, 500, ERROR_CODE.INTERNAL_ERROR);
    });
  });

  describe('Guard는 DTO 검증보다 먼저 실행된다', () => {
    it('학생이 강사 전용 API에 잘못된 body를 보내면 400이 아니라 403', async () => {
      const res = await http()
        .post('/api/probe/teacher')
        .set(STUDENT)
        .send({ value: 'wrong' })
        .expect(403);
      expectError(res.body, 403, ERROR_CODE.FORBIDDEN_ROLE);
    });
  });

  describe('DTO 검증', () => {
    it('검증 실패 시 400 VALIDATION_FAILED와 필드별 오류', async () => {
      const res = await http()
        .post('/api/probe/teacher')
        .set(TEACHER)
        .send({ value: 0 })
        .expect(400);
      const body = res.body as ErrorResponse<FieldError[]>;
      expectError(body, 400, ERROR_CODE.VALIDATION_FAILED);
      expect(body.details?.map((detail) => detail.field)).toEqual(['value']);
    });

    it('DTO에 없는 필드를 보내면 거부한다 (서버 관리 필드 주입 방지)', async () => {
      const res = await http()
        .post('/api/probe/teacher')
        .set(TEACHER)
        .send({ value: 1, activeCount: 0 })
        .expect(400);
      const body = res.body as ErrorResponse<FieldError[]>;
      expect(body.details?.map((detail) => detail.field)).toContain('activeCount');
    });

    it('문자열 숫자를 암묵적으로 변환하지 않는다', async () => {
      await http().post('/api/probe/teacher').set(TEACHER).send({ value: '3' }).expect(400);
    });

    it('정상 요청은 통과한다', async () => {
      const res = await http()
        .post('/api/probe/teacher')
        .set(TEACHER)
        .send({ value: 3 })
        .expect(201);
      expect(res.body).toEqual({ actor: { role: 'TEACHER' }, value: 3 });
    });

    it('깨진 JSON body는 400 VALIDATION_FAILED', async () => {
      const res = await http()
        .post('/api/probe/teacher')
        .set(TEACHER)
        .set('Content-Type', 'application/json')
        .send('{"value": ')
        .expect(400);
      expectError(res.body, 400, ERROR_CODE.VALIDATION_FAILED);
    });

    it('경로 id는 양의 정수로 변환되고, 아니면 400', async () => {
      const ok = await http().get('/api/probe/items/5').set(TEACHER).expect(200);
      expect(ok.body).toEqual({ id: 5, type: 'number' });

      const bad = await http().get('/api/probe/items/0').set(TEACHER).expect(400);
      expectError(bad.body, 400, ERROR_CODE.VALIDATION_FAILED);
    });
  });

  describe('예외 필터', () => {
    it('DomainException은 코드에 맞는 상태·메시지·details로 응답한다', async () => {
      const res = await http().get('/api/probe/domain-error').set(TEACHER).expect(409);
      expect(res.body).toEqual({
        statusCode: 409,
        code: ERROR_CODE.ROOM_FULL,
        message: ERROR_MESSAGE.ROOM_FULL,
        timestamp: NOW,
        details: { roomId: 1 },
      });
    });

    it('예상하지 못한 오류는 500이며 내부 메시지를 노출하지 않는다', async () => {
      const res = await http().get('/api/probe/crash').expect(500);
      expectError(res.body, 500, ERROR_CODE.INTERNAL_ERROR);
      expect(JSON.stringify(res.body)).not.toContain('secret');
    });

    it('없는 경로는 404 ROUTE_NOT_FOUND', async () => {
      const res = await http().get('/api/nope').set(TEACHER).expect(404);
      expectError(res.body, 404, ERROR_CODE.ROUTE_NOT_FOUND);
    });
  });

  describe('Swagger', () => {
    it('OpenAPI 문서에 요청자 헤더가 전역 파라미터로 들어 있다', async () => {
      const res = await http().get('/api/docs-json').expect(200);
      const text = JSON.stringify(res.body);
      expect(text).toContain('x-actor-role');
      expect(text).toContain('x-student-id');
    });
  });
});
