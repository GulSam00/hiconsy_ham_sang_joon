import { Module } from '@nestjs/common';
import { MeVisitsController } from './me-visits.controller';
import { RoomVisitsController } from './room-visits.controller';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

@Module({
  controllers: [RoomVisitsController, VisitsController, MeVisitsController],
  providers: [VisitsService],
})
export class VisitsModule {}
