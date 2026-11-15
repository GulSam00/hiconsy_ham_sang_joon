import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACTOR_ROLE, ERROR_CODE, type Actor } from '@study-room/shared';
import { CurrentActor, Roles } from '../../common/actor/actor.decorators';
import { studentIdOf } from '../../common/actor/student-id-of';
import { ApiDomainErrors } from '../../common/swagger/api-domain-errors.decorator';
import { ParseIdPipe } from '../../common/validation/parse-id.pipe';
import { VisitTimeDto } from './dto/visit-time.dto';
import {
  RoomVisitResponseDto,
  VisitHistoryResponseDto,
  VisitResponseDto,
} from './dto/visit-response.dto';
import { VisitsService } from './visits.service';

/** 자습실에 속한 신청 자원: /rooms/:roomId/visits, /rooms/:roomId/histories */
@ApiTags('visits')
@ApiDomainErrors(
  ERROR_CODE.ACTOR_REQUIRED,
  ERROR_CODE.FORBIDDEN_ROLE,
  ERROR_CODE.VALIDATION_FAILED,
  ERROR_CODE.ROOM_NOT_FOUND,
)
@Controller('rooms/:roomId')
export class RoomVisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @ApiOperation({
    summary: '방문 신청 (학생)',
    description: '취소한 신청이 있으면 같은 신청을 다시 활성화합니다 (R3).',
  })
  @ApiCreatedResponse({ type: VisitResponseDto })
  @ApiDomainErrors(
    ERROR_CODE.STUDENT_NOT_FOUND,
    ERROR_CODE.DUPLICATE_VISIT,
    ERROR_CODE.ROOM_FULL,
    ERROR_CODE.VISIT_IN_PAST,
    ERROR_CODE.VISIT_OUT_OF_PERIOD,
  )
  @Roles(ACTOR_ROLE.STUDENT)
  @Post('visits')
  apply(
    @Param('roomId', ParseIdPipe) roomId: number,
    @Body() dto: VisitTimeDto,
    @CurrentActor() actor: Actor,
  ): Promise<VisitResponseDto> {
    return this.visitsService.apply(roomId, actor, studentIdOf(actor), new Date(dto.visitAt));
  }

  @ApiOperation({ summary: '자습실 신청자 목록 (강사)' })
  @ApiOkResponse({ type: RoomVisitResponseDto, isArray: true })
  @Roles(ACTOR_ROLE.TEACHER)
  @Get('visits')
  findVisits(@Param('roomId', ParseIdPipe) roomId: number): Promise<RoomVisitResponseDto[]> {
    return this.visitsService.findRoomVisits(roomId);
  }

  @ApiOperation({ summary: '자습실 신청·수정·취소 이력 (강사, 시간순)' })
  @ApiOkResponse({ type: VisitHistoryResponseDto, isArray: true })
  @Roles(ACTOR_ROLE.TEACHER)
  @Get('histories')
  findHistories(@Param('roomId', ParseIdPipe) roomId: number): Promise<VisitHistoryResponseDto[]> {
    return this.visitsService.findRoomHistories(roomId);
  }
}
