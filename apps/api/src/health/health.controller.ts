import { Controller, Get } from '@nestjs/common';
import { HEALTH_STATUS, type HealthResponse } from '@study-room/shared';

@Controller('health')
export class HealthController {
  /** 서버 기동 여부 확인용. 프론트엔드와 백엔드 연결 확인에도 쓴다. */
  @Get()
  check(): HealthResponse {
    return {
      status: HEALTH_STATUS.OK,
      timestamp: new Date().toISOString(),
    };
  }
}
