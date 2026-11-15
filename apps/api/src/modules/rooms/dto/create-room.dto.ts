import { ApiProperty } from '@nestjs/swagger';
import { ROOM_MAX_PERSONNEL_LIMIT, ROOM_TITLE_MAX_LENGTH } from '@study-room/shared';
import { IsInt, IsNotEmpty, IsString, Max, MaxLength, Min } from 'class-validator';
import { IsIsoDateTime } from '../../../common/validation/is-iso-date-time.decorator';

export class CreateRoomDto {
  @ApiProperty({ example: '수학 자습실 A', maxLength: ROOM_TITLE_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROOM_TITLE_MAX_LENGTH)
  title: string;

  @ApiProperty({ example: 20, minimum: 1, maximum: ROOM_MAX_PERSONNEL_LIMIT })
  @IsInt()
  @Min(1)
  @Max(ROOM_MAX_PERSONNEL_LIMIT)
  maxPersonnel: number;

  @ApiProperty({ example: '2026-11-20T09:00:00+09:00', description: 'ISO 8601, 시간대 필수' })
  @IsIsoDateTime()
  startDate: string;

  @ApiProperty({ example: '2026-11-27T22:00:00+09:00', description: 'ISO 8601, 시간대 필수' })
  @IsIsoDateTime()
  endDate: string;
}
