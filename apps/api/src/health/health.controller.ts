import { Controller, Get, Logger } from '@nestjs/common';
import {
  DATABASE_STATUS,
  ERROR_CODE,
  HEALTH_STATUS,
  type HealthResponse,
} from '@study-room/shared';
import { Public } from '../common/actor/actor.decorators';
import { Clock } from '../common/clock/clock';
import { DomainException } from '../common/errors/domain.exception';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /** 서버와 DB 연결 상태를 확인한다. 요청자 헤더 없이 호출할 수 있다. */
  @Public()
  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error: unknown) {
      // 원인(파일 경로 등)은 서버 로그에만 남기고 응답에는 노출하지 않는다.
      this.logger.error(
        'DB 연결 확인에 실패했습니다.',
        error instanceof Error ? error.stack : String(error),
      );
      throw new DomainException(ERROR_CODE.DATABASE_UNAVAILABLE);
    }
    return {
      status: HEALTH_STATUS.OK,
      database: DATABASE_STATUS.UP,
      timestamp: this.clock.now().toISOString(),
    };
  }
}
