import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import type { ErrorCode } from '@study-room/shared';
import { ERROR_STATUS } from '../errors/error-status';

/**
 * 엔드포인트가 반환할 수 있는 에러 코드를 Swagger에 상태별로 묶어 표시한다.
 * 상태는 ERROR_STATUS에서 가져오므로 문서와 실제 응답이 어긋나지 않는다.
 */
export function ApiDomainErrors(...codes: ErrorCode[]): MethodDecorator & ClassDecorator {
  const byStatus = new Map<number, ErrorCode[]>();
  for (const code of codes) {
    const status = ERROR_STATUS[code];
    byStatus.set(status, [...(byStatus.get(status) ?? []), code]);
  }
  return applyDecorators(
    ...[...byStatus.entries()].map(([status, statusCodes]) =>
      ApiResponse({ status, description: statusCodes.map((code) => `\`${code}\``).join(', ') }),
    ),
  );
}
