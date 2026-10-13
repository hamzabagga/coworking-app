import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { AuthResult, AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// le refresh token est stocké dans un cookie httpOnly : inaccessible au
// JavaScript du navigateur (protection XSS) et envoyé uniquement aux routes /api/auth
const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';

@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.sendTokens(res, await this.authService.register(dto));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.sendTokens(res, await this.authService.login(dto));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    try {
      const result = await this.authService.refresh(readRefreshCookie(req));
      return this.sendTokens(res, result);
    } catch (error) {
      clearRefreshCookie(res);
      throw error;
    }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(readRefreshCookie(req));
    clearRefreshCookie(res);
  }

  // l'access token part dans le body, le refresh token dans le cookie
  private sendTokens(res: Response, result: AuthResult) {
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...cookieOptions(),
      expires: result.refreshExpiresAt,
    });
    return { accessToken: result.accessToken, user: result.user };
  }
}

function cookieOptions() {
  return {
    httpOnly: true,
    // cookie non envoyé par les requêtes venant d'autres sites (protection CSRF)
    sameSite: 'strict' as const,
    secure: process.env.NODE_ENV === 'production',
    path: REFRESH_COOKIE_PATH,
  };
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
}

// lecture du cookie sans dépendance supplémentaire (cookie-parser)
function readRefreshCookie(req: Request): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [name, ...value] = part.trim().split('=');
    if (name === REFRESH_COOKIE) return decodeURIComponent(value.join('='));
  }
  return undefined;
}
