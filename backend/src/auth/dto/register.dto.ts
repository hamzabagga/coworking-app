import { OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from '../../users/dto/create-user.dto';

// inscription publique : le rôle n'est pas choisi par l'utilisateur (toujours "member")
export class RegisterDto extends OmitType(CreateUserDto, ['role'] as const) {}
