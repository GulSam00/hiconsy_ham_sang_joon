import { ApiProperty } from '@nestjs/swagger';
import { STUDENT_NAME_MAX_LENGTH } from '@study-room/shared';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { MOBILE_PHONE_PATTERN } from '../phone';

export class CreateStudentDto {
  @ApiProperty({ example: '김민준', maxLength: STUDENT_NAME_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(STUDENT_NAME_MAX_LENGTH)
  name: string;

  @ApiProperty({
    example: '010-1234-5678',
    description: '하이픈 유무 무관. 010-1234-5678 형식으로 저장',
  })
  @IsString()
  @Matches(MOBILE_PHONE_PATTERN, {
    message: 'phone은 휴대전화 번호(예: 010-1234-5678)여야 합니다.',
  })
  phone: string;
}
