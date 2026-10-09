import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Reservation,
  ReservationSchema,
} from '../reservations/schemas/reservation.schema';
import { Space, SpaceSchema } from './schemas/space.schema';
import { SpacesController } from './spaces.controller';
import { SpacesService } from './spaces.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Space.name, schema: SpaceSchema },
      // lecture seule : disponibilités et blocage de suppression
      { name: Reservation.name, schema: ReservationSchema },
    ]),
  ],
  controllers: [SpacesController],
  providers: [SpacesService],
  exports: [SpacesService],
})
export class SpacesModule {}
