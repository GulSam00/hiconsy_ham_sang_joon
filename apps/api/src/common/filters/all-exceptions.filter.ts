import {
  Catch,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';
import { ERROR_CODE, ERROR_MESSAGE, type ErrorCode, type ErrorResponse } from '@study-room/shared';
import type { Request, Response } from 'express';
import { Clock } from '../clock/clock';
import { DomainException } from '../errors/domain.exception';

interface ResolvedError {
  status: number;
  code: ErrorCode;
  message: string;
  details?: unknown;
}

/**
 * 모든 예외를 `ErrorResponse` 한 가지 형식으로 바꾼다 (CLAUDE.md 8절).
 *
 * - DomainException: 코드·메시지·details를 그대로 쓴다.
 * - HttpException: 우리 코드는 던지지 않으므로 프레임워크가 던진 것이다
 *   (없는 경로, 깨진 JSON body 등). 상태에 맞는 코드로 바꾼다.
 * - 그 외: 예상하지 못한 오류다. 원인은 로그에만 남기고 응답에는 내부 정보를 노출하지 않는다.
 */
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly clock: Clock) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const resolved = this.resolve(exception);
    if (resolved.status >= Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      this.logger.error(
        `${request.method} ${request.originalUrl} → ${resolved.status} ${resolved.code}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponse = {
      statusCode: resolved.status,
      code: resolved.code,
      message: resolved.message,
      timestamp: this.clock.now().toISOString(),
      ...(resolved.details === undefined ? {} : { details: resolved.details }),
    };
    response.status(resolved.status).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof DomainException) {
      return {
        status: exception.status,
        code: exception.code,
        message: exception.message,
        details: exception.details,
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const code = AllExceptionsFilter.codeForFrameworkStatus(status);
      return { status, code, message: ERROR_MESSAGE[code] };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: ERROR_CODE.INTERNAL_ERROR,
      message: ERROR_MESSAGE.INTERNAL_ERROR,
    };
  }

  /** 프레임워크가 던진 HttpException의 상태를 우리 에러 코드로 바꾼다. 원래 상태 코드는 유지한다. */
  private static codeForFrameworkStatus(status: number): ErrorCode {
    if (status === Number(HttpStatus.NOT_FOUND)) {
      return ERROR_CODE.ROUTE_NOT_FOUND;
    }
    if (status < Number(HttpStatus.INTERNAL_SERVER_ERROR)) {
      // 깨진 JSON(400), body 크기 초과(413) 등 요청 형식 문제
      return ERROR_CODE.VALIDATION_FAILED;
    }
    return ERROR_CODE.INTERNAL_ERROR;
  }
}
