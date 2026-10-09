import { PartialType, PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// champs qu'un membre peut modifier lui-même
export class UpdateProfileDto extends PartialType(
  PickType(CreateUserDto, ['firstName', 'lastName', 'phone'] as const),
) {}
