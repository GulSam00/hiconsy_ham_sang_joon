import { ApiProperty } from '@nestjs/swagger';
import type { RoomResponse } from '@study-room/shared';
import type { StudyRoom } from '../../../generated/prisma/client';

/** 엔티티를 그대로 응답하지 않고 이 형식으로 바꾼다 (deletedAt 등 내부 필드 비노출). */
export class RoomResponseDto implements RoomResponse {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '수학 자습실 A' })
  title: string;

  @ApiProperty({ example: 20 })
  maxPersonnel: number;

  @ApiProperty({ example: 3, description: '활성 신청 수 (지난 방문 포함)' })
  activeCount: number;

  @ApiProperty({ example: '2026-11-20T00:00:00.000Z' })
  startDate: string;

  @ApiProperty({ example: '2026-11-27T13:00:00.000Z' })
  endDate: string;

  @ApiProperty({ example: '2026-11-15T03:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-11-15T03:00:00.000Z' })
  updatedAt: string;

  static from(room: StudyRoom): RoomResponseDto {
    const dto = new RoomResponseDto();
    dto.id = room.id;
    dto.title = room.title;
    dto.maxPersonnel = room.maxPersonnel;
    dto.activeCount = room.activeCount;
    dto.startDate = room.startDate.toISOString();
    dto.endDate = room.endDate.toISOString();
    dto.createdAt = room.createdAt.toISOString();
    dto.updatedAt = room.updatedAt.toISOString();
    return dto;
  }
}
