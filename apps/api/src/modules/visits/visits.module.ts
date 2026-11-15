import { Module } from '@nestjs/common';
import { RoomVisitsController } from './room-visits.controller';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

@Module({
  controllers: [RoomVisitsController, VisitsController],
  providers: [VisitsService],
})
export class VisitsModule {}
