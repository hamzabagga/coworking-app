import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Role } from '../enums/role.enum';

// utilisateur connecté, placé dans la requête par JwtAuthGuard
export interface AuthUser {
  userId: string;
  email: string;
  role: Role;
  // id de la session (refresh token) qui a émis l'access token
  sessionId: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
