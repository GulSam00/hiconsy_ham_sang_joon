import { ApiPropertyOptional } from '@nestjs/swagger';
import { VISIT_CANCEL_REASON_MAX_LENGTH } from '@study-room/shared';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelVisitDto {
  @ApiPropertyOptional({
    example: '일정이 생겨 방문하지 못합니다.',
    maxLength: VISIT_CANCEL_REASON_MAX_LENGTH,
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(VISIT_CANCEL_REASON_MAX_LENGTH)
  reason?: string;
}
