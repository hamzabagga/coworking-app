import { Type } from 'class-transformer';
import {
  IsDate,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateReservationDto {
  @IsMongoId()
  spaceId: string;

  // dates ISO 8601, ex. "2026-10-10T09:00:00.000Z"
  @Type(() => Date)
  @IsDate()
  startTime: Date;

  @Type(() => Date)
  @IsDate()
  endTime: Date;

  @IsOptional()
  @IsInt()
  @Min(1)
  attendees?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
