import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateReservationDto } from './create-reservation.dto';

// on peut décaler une réservation mais pas changer d'espace
export class UpdateReservationDto extends PartialType(
  OmitType(CreateReservationDto, ['spaceId'] as const),
) {}
