import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { API_PREFIX } from '@study-room/shared';
import { ActorGuard } from './common/actor/actor.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { setupSwagger } from './common/swagger/setup-swagger';
import { createValidationPipe } from './common/validation/create-validation-pipe';

/**
 * main.ts와 e2e 테스트가 같은 설정으로 앱을 띄우도록 한 곳에 모은다.
 * 여기서 빠진 설정은 테스트에서도 빠지므로, 전역 설정은 반드시 이 함수에 추가한다.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalGuards(new ActorGuard(app.get(Reflector)));
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(app.get(AllExceptionsFilter));
  setupSwagger(app);
  app.enableShutdownHooks();
}
