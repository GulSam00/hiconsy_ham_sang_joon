import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** 모든 도메인 모듈이 PrismaService를 쓰므로 전역 모듈로 등록한다. */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
