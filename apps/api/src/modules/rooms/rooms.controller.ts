import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ACTOR_ROLE, ERROR_CODE } from '@study-room/shared';
import { Roles } from '../../common/actor/actor.decorators';
import { ApiDomainErrors } from '../../common/swagger/api-domain-errors.decorator';
import { ParseIdPipe } from '../../common/validation/parse-id.pipe';
import { CreateRoomDto } from './dto/create-room.dto';
import { RoomResponseDto } from './dto/room-response.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

@ApiTags('rooms')
@ApiDomainErrors(ERROR_CODE.ACTOR_REQUIRED, ERROR_CODE.FORBIDDEN_ROLE)
@Controller('rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @ApiOperation({ summary: '자습실 목록 (삭제 제외)' })
  @ApiOkResponse({ type: RoomResponseDto, isArray: true })
  @Roles(ACTOR_ROLE.TEACHER, ACTOR_ROLE.STUDENT)
  @Get()
  findAll(): Promise<RoomResponseDto[]> {
    return this.roomsService.findAll();
  }

  @ApiOperation({ summary: '자습실 단건' })
  @ApiOkResponse({ type: RoomResponseDto })
  @ApiDomainErrors(ERROR_CODE.ROOM_NOT_FOUND, ERROR_CODE.VALIDATION_FAILED)
  @Roles(ACTOR_ROLE.TEACHER, ACTOR_ROLE.STUDENT)
  @Get(':id')
  findOne(@Param('id', ParseIdPipe) id: number): Promise<RoomResponseDto> {
    return this.roomsService.findOne(id);
  }

  @ApiOperation({ summary: '자습실 등록 (강사)' })
  @ApiCreatedResponse({ type: RoomResponseDto })
  @ApiDomainErrors(ERROR_CODE.VALIDATION_FAILED, ERROR_CODE.INVALID_PERIOD)
  @Roles(ACTOR_ROLE.TEACHER)
  @Post()
  create(@Body() dto: CreateRoomDto): Promise<RoomResponseDto> {
    return this.roomsService.create(dto);
  }

  @ApiOperation({
    summary: '자습실 수정 (강사)',
    description:
      '보낸 필드만 바꿉니다. 정원을 활성 신청 수보다 줄이거나(R6) 기간 밖으로 밀려나는 신청이 생기면(R7) 409와 함께 해당 신청 목록을 details로 반환합니다.',
  })
  @ApiOkResponse({ type: RoomResponseDto })
  @ApiDomainErrors(
    ERROR_CODE.VALIDATION_FAILED,
    ERROR_CODE.ROOM_NOT_FOUND,
    ERROR_CODE.CAPACITY_BELOW_ACTIVE,
    ERROR_CODE.PERIOD_EXCLUDES_VISITS,
    ERROR_CODE.INVALID_PERIOD,
  )
  @Roles(ACTOR_ROLE.TEACHER)
  @Patch(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateRoomDto,
  ): Promise<RoomResponseDto> {
    return this.roomsService.update(id, dto);
  }

  @ApiOperation({
    summary: '자습실 삭제 (강사, Soft Delete)',
    description:
      '예정 신청은 시스템 취소되고 이력이 남습니다. 지난 방문은 기록으로 유지됩니다 (R8).',
  })
  @ApiNoContentResponse()
  @ApiDomainErrors(ERROR_CODE.ROOM_NOT_FOUND, ERROR_CODE.VALIDATION_FAILED)
  @Roles(ACTOR_ROLE.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.roomsService.remove(id);
  }
}
