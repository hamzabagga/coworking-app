import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { SpaceType } from '../schemas/space.schema';

export class QuerySpacesDto {
  @IsOptional()
  @IsEnum(SpaceType)
  type?: SpaceType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minCapacity?: number;

  // par défaut seuls les espaces actifs sont listés
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeInactive?: boolean;
}
