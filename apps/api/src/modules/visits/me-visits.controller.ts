import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ACTOR_ROLE, ERROR_CODE, type Actor } from '@study-room/shared';
import { CurrentActor, Roles } from '../../common/actor/actor.decorators';
import { studentIdOf } from '../../common/actor/student-id-of';
import { ApiDomainErrors } from '../../common/swagger/api-domain-errors.decorator';
import { MyVisitResponseDto } from './dto/visit-response.dto';
import { VisitsService } from './visits.service';

/** 요청자 자신의 자원: /me/... */
@ApiTags('me')
@Controller('me')
export class MeVisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @ApiOperation({
    summary: '내 신청 목록 (학생)',
    description:
      '취소된 신청은 누가(STUDENT·TEACHER·SYSTEM) 왜 취소했는지 함께 보여줍니다. 삭제된 자습실의 신청도 포함합니다.',
  })
  @ApiOkResponse({ type: MyVisitResponseDto, isArray: true })
  @ApiDomainErrors(
    ERROR_CODE.ACTOR_REQUIRED,
    ERROR_CODE.FORBIDDEN_ROLE,
    ERROR_CODE.STUDENT_NOT_FOUND,
  )
  @Roles(ACTOR_ROLE.STUDENT)
  @Get('visits')
  findMine(@CurrentActor() actor: Actor): Promise<MyVisitResponseDto[]> {
    return this.visitsService.findMine(studentIdOf(actor));
  }
}
