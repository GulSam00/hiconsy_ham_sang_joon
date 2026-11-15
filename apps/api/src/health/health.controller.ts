import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DATABASE_STATUS, HEALTH_STATUS, type HealthResponse } from '@study-room/shared';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 서버와 DB 연결 상태를 확인한다. 프론트엔드와 백엔드 연결 확인에도 쓴다. */
  @Get()
  async check(): Promise<HealthResponse> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error: unknown) {
      // 원인은 서버 로그에만 남기고, 응답에는 내부 정보를 노출하지 않는다.
      this.logger.error(
        'DB 연결 확인에 실패했습니다.',
        error instanceof Error ? error.stack : String(error),
      );
      throw new ServiceUnavailableException('데이터베이스에 연결할 수 없습니다.');
    }
    return {
      status: HEALTH_STATUS.OK,
      database: DATABASE_STATUS.UP,
      timestamp: new Date().toISOString(),
    };
  }
}
