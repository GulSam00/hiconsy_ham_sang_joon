import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { applySqlitePragmas, createPrismaAdapter } from '../database/create-prisma-client';
import { PrismaClient } from '../generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({ adapter: createPrismaAdapter() });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await applySqlitePragmas(this);
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
