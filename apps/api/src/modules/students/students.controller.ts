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
import { Public, Roles } from '../../common/actor/actor.decorators';
import { ApiDomainErrors } from '../../common/swagger/api-domain-errors.decorator';
import { ParseIdPipe } from '../../common/validation/parse-id.pipe';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentOptionDto, StudentResponseDto } from './dto/student-response.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentsService } from './students.service';

@ApiTags('students')
@Controller('students')
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @ApiOperation({
    summary: '역할 선택용 학생 목록 (공개)',
    description: '요청자 헤더 없이 호출합니다. 개인정보 보호를 위해 id와 이름만 반환합니다.',
  })
  @ApiOkResponse({ type: StudentOptionDto, isArray: true })
  @Public()
  @Get('options')
  findOptions(): Promise<StudentOptionDto[]> {
    return this.studentsService.findOptions();
  }

  @ApiOperation({ summary: '학생 목록 (강사)' })
  @ApiOkResponse({ type: StudentResponseDto, isArray: true })
  @ApiDomainErrors(ERROR_CODE.ACTOR_REQUIRED, ERROR_CODE.FORBIDDEN_ROLE)
  @Roles(ACTOR_ROLE.TEACHER)
  @Get()
  findAll(): Promise<StudentResponseDto[]> {
    return this.studentsService.findAll();
  }

  @ApiOperation({ summary: '학생 등록 (강사)' })
  @ApiCreatedResponse({ type: StudentResponseDto })
  @ApiDomainErrors(
    ERROR_CODE.ACTOR_REQUIRED,
    ERROR_CODE.FORBIDDEN_ROLE,
    ERROR_CODE.VALIDATION_FAILED,
  )
  @Roles(ACTOR_ROLE.TEACHER)
  @Post()
  create(@Body() dto: CreateStudentDto): Promise<StudentResponseDto> {
    return this.studentsService.create(dto);
  }

  @ApiOperation({ summary: '학생 수정 (강사)' })
  @ApiOkResponse({ type: StudentResponseDto })
  @ApiDomainErrors(
    ERROR_CODE.ACTOR_REQUIRED,
    ERROR_CODE.FORBIDDEN_ROLE,
    ERROR_CODE.VALIDATION_FAILED,
    ERROR_CODE.STUDENT_NOT_FOUND,
  )
  @Roles(ACTOR_ROLE.TEACHER)
  @Patch(':id')
  update(
    @Param('id', ParseIdPipe) id: number,
    @Body() dto: UpdateStudentDto,
  ): Promise<StudentResponseDto> {
    return this.studentsService.update(id, dto);
  }

  @ApiOperation({
    summary: '학생 삭제 (강사, Soft Delete)',
    description: '이 학생의 예정 신청은 모든 자습실에서 시스템 취소되고 이력이 남습니다 (R9).',
  })
  @ApiNoContentResponse()
  @ApiDomainErrors(
    ERROR_CODE.ACTOR_REQUIRED,
    ERROR_CODE.FORBIDDEN_ROLE,
    ERROR_CODE.VALIDATION_FAILED,
    ERROR_CODE.STUDENT_NOT_FOUND,
  )
  @Roles(ACTOR_ROLE.TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@Param('id', ParseIdPipe) id: number): Promise<void> {
    return this.studentsService.remove(id);
  }
}
