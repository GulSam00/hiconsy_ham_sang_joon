import { PartialType } from '@nestjs/swagger';
import { CreateRoomDto } from './create-room.dto';

/** 보낸 필드만 바꾼다. 검증 규칙은 CreateRoomDto와 같다 (PartialType이 @IsOptional을 붙임). */
export class UpdateRoomDto extends PartialType(CreateRoomDto) {}
