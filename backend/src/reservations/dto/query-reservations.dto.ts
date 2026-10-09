import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsMongoId, IsOptional } from 'class-validator';
import { ReservationStatus } from '../schemas/reservation.schema';

export class QueryReservationsDto {
  @IsOptional()
  @IsMongoId()
  spaceId?: string;

  // ignoré pour un membre (il ne voit que ses réservations)
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  // réservations qui se terminent après "from"
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  // réservations qui commencent avant "to"
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}
