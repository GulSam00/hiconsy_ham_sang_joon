import { Global, Module } from '@nestjs/common';
import { Clock } from './clock/clock';
import { SystemClock } from './clock/system-clock';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';

/** 모든 모듈이 쓰는 공통 provider. 테스트는 Clock을 FixedClock으로 덮어쓴다. */
@Global()
@Module({
  providers: [{ provide: Clock, useClass: SystemClock }, AllExceptionsFilter],
  exports: [Clock, AllExceptionsFilter],
})
export class CommonModule {}
