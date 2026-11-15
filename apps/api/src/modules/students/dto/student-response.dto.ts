import { ApiProperty } from '@nestjs/swagger';
import type { StudentOption, StudentResponse } from '@study-room/shared';
import type { Student } from '../../../generated/prisma/client';

export class StudentResponseDto implements StudentResponse {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '김민준' })
  name: string;

  @ApiProperty({ example: '010-1234-5678' })
  phone: string;

  @ApiProperty({ example: '2026-11-15T03:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-11-15T03:00:00.000Z' })
  updatedAt: string;

  static from(student: Student): StudentResponseDto {
    const dto = new StudentResponseDto();
    dto.id = student.id;
    dto.name = student.name;
    dto.phone = student.phone;
    dto.createdAt = student.createdAt.toISOString();
    dto.updatedAt = student.updatedAt.toISOString();
    return dto;
  }
}

/** 역할 선택 화면용. 전화번호 등 개인정보를 담지 않는다. */
export class StudentOptionDto implements StudentOption {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: '김민준' })
  name: string;

  static from(student: Pick<Student, 'id' | 'name'>): StudentOptionDto {
    const dto = new StudentOptionDto();
    dto.id = student.id;
    dto.name = student.name;
    return dto;
  }
}
