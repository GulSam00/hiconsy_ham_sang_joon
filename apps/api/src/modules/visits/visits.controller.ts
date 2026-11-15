import { Body, Controller, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACTOR_ROLE, ERROR_CODE, type Actor } from '@study-room/shared';
import { CurrentActor, Roles } from '../../common/actor/actor.decorators';
import { ApiDomainErrors } from '../../common/swagger/api-domain-errors.decorator';
import { ParseIdPipe } from '../../common/validation/parse-id.pipe';
import { CancelVisitDto } from './dto/cancel-visit.dto';
import { VisitTimeDto } from './dto/visit-time.dto';
import { VisitResponseDto } from './dto/visit-response.dto';
import { VisitsService } from './visits.service';

@ApiTags('visits')
@ApiDomainErrors(
  ERROR_CODE.ACTOR_REQUIRED,
  ERROR_CODE.FORBIDDEN_ROLE,
  ERROR_CODE.VALIDATION_FAILED,
  ERROR_CODE.VISIT_NOT_FOUND,
  ERROR_CODE.FORBIDDEN_VISIT_OWNER,
  ERROR_CODE.VISIT_ALREADY_CANCELED,
  ERROR_CODE.VISIT_ALREADY_PASSED,
)
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @ApiOperation({
    summary: '방문 시간 수정 (학생 본인)',
    description: '현재와 같은 시각이면 아무것도 바꾸지 않고 이력도 남기지 않습니다 (R12).',
  })
  @ApiOkResponse({ type: VisitResponseDto })
  @ApiDomainErrors(ERROR_CODE.VISIT_IN_PAST, ERROR_CODE.VISIT_OUT_OF_PERIOD)
  @Roles(ACTOR_ROLE.STUDENT)
  @Patch(':id')
  changeTime(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: VisitTimeDto,
    @CurrentActor() actor: Actor,
  ): Promise<VisitResponseDto> {
    return this.visitsService.changeTime(id, actor, new Date(dto.visitAt));
  }

  @ApiOperation({
    summary: '방문 취소 (학생 본인, 강사)',
    description:
      '삭제가 아니라 상태 전이입니다. 신청 기록과 이력은 남고 정원은 돌아옵니다.\n\n' +
      '- 학생: 본인 신청만, 사유 선택\n' +
      '- 강사(R11): 모든 예정 신청, **사유 필수**. 정원 축소(R6)·기간 변경(R7) 충돌을 풀 때 씁니다.',
  })
  @ApiOkResponse({ type: VisitResponseDto })
  @ApiDomainErrors(ERROR_CODE.CANCEL_REASON_REQUIRED)
  @Roles(ACTOR_ROLE.STUDENT, ACTOR_ROLE.TEACHER)
  @HttpCode(HttpStatus.OK)
  @Post(':id/cancel')
  cancel(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: CancelVisitDto,
    @CurrentActor() actor: Actor,
  ): Promise<VisitResponseDto> {
    return this.visitsService.cancel(id, actor, dto.reason);
  }
}
