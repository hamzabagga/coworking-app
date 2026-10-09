import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';

// limite une route à certains rôles
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
