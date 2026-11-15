import { Injectable } from '@nestjs/common';
import { ERROR_CODE, type FieldError } from '@study-room/shared';
import { Clock } from '../../common/clock/clock';
import { DomainException } from '../../common/errors/domain.exception';
import { PrismaService } from '../../prisma/prisma.service';
import { systemCancelUpcomingVisits } from '../visits/system-cancel';
import { SYSTEM_CANCEL_REASON } from '../visits/visit-history.factory';
import { CreateStudentDto } from './dto/create-student.dto';
import { StudentOptionDto, StudentResponseDto } from './dto/student-response.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { normalizeMobilePhone } from './phone';

const NOT_DELETED = { deletedAt: null } as const;
const BY_NAME = [{ name: 'asc' }, { id: 'asc' }] as const;

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: Clock,
  ) {}

  /** FR-STD-01 (강사 전용) */
  async findAll(): Promise<StudentResponseDto[]> {
    const students = await this.prisma.student.findMany({
      where: NOT_DELETED,
      orderBy: [...BY_NAME],
    });
    return students.map((student) => StudentResponseDto.from(student));
  }

  /** 역할 선택 화면용 (공개). id·이름만 읽는다. */
  async findOptions(): Promise<StudentOptionDto[]> {
    const students = await this.prisma.student.findMany({
      where: NOT_DELETED,
      orderBy: [...BY_NAME],
      select: { id: true, name: true },
    });
    return students.map((student) => StudentOptionDto.from(student));
  }

  /** FR-STD-02 */
  async create(dto: CreateStudentDto): Promise<StudentResponseDto> {
    const student = await this.prisma.student.create({
      data: { name: dto.name, phone: toStoredPhone(dto.phone) },
    });
    return StudentResponseDto.from(student);
  }

  /** FR-STD-02. 삭제된 학생은 수정할 수 없다. */
  async update(id: number, dto: UpdateStudentDto): Promise<StudentResponseDto> {
    if (dto.name === undefined && dto.phone === undefined) {
      const details: FieldError[] = [{ field: 'body', messages: ['변경할 값이 없습니다.'] }];
      throw new DomainException(ERROR_CODE.VALIDATION_FAILED, details);
    }

    const { count } = await this.prisma.student.updateMany({
      where: { id, ...NOT_DELETED },
      data: {
        ...(dto.name === undefined ? {} : { name: dto.name }),
        ...(dto.phone === undefined ? {} : { phone: toStoredPhone(dto.phone) }),
      },
    });
    if (count === 0) {
      throw new DomainException(ERROR_CODE.STUDENT_NOT_FOUND);
    }
    return StudentResponseDto.from(await this.prisma.student.findUniqueOrThrow({ where: { id } }));
  }

  /**
   * FR-STD-02 + R9: Soft Delete하고, 이 학생의 **예정** 신청을 모든 자습실에서 시스템 취소한다.
   * 지난 방문은 기록으로 남긴다.
   */
  async remove(id: number): Promise<void> {
    const now = this.clock.now();

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.student.updateMany({
        where: { id, ...NOT_DELETED },
        data: { deletedAt: now },
      });
      if (count === 0) {
        throw new DomainException(ERROR_CODE.STUDENT_NOT_FOUND);
      }
      await systemCancelUpcomingVisits(
        tx,
        { studentId: id },
        SYSTEM_CANCEL_REASON.STUDENT_DELETED,
        now,
      );
    });
  }
}

function toStoredPhone(raw: string): string {
  const phone = normalizeMobilePhone(raw);
  if (phone === null) {
    // DTO 검증과 정규화 규칙이 같은 패턴을 쓰므로 여기에 오면 코드 불일치다.
    throw new Error(`DTO 검증을 통과한 전화번호를 정규화하지 못했습니다: ${raw}`);
  }
  return phone;
}
