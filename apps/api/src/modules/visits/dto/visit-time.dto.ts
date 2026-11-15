import { ApiProperty } from '@nestjs/swagger';
import { IsIsoDateTime } from '../../../common/validation/is-iso-date-time.decorator';

/** 신청(POST)과 시간 수정(PATCH)이 같은 형태의 body를 쓴다 */
export class VisitTimeDto {
  @ApiProperty({
    example: '2026-11-16T19:00:00+09:00',
    description: 'ISO 8601, 시간대 필수. 운영 기간 안이고 지금 이후여야 함',
  })
  @IsIsoDateTime()
  visitAt: string;
}
