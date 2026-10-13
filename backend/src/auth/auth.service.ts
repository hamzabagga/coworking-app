import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { Model } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../common/guards/jwt-auth.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Session } from './schemas/session.schema';

// durée pendant laquelle un refresh token déjà utilisé reste toléré
const ROTATION_GRACE_MS = 30 * 1000;

// contenu du refresh token (signé avec une clé différente de l'access token)
interface RefreshPayload {
  sub: string;
  jti: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
  user: UserDocument;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @InjectModel(Session.name) private readonly sessionModel: Model<Session>,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const user = await this.usersService.create({ ...dto, role: Role.Member });
    return this.createSession(user);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // même message dans tous les cas pour ne pas révéler si l'email existe
    const valid =
      user &&
      user.isActive &&
      (await bcrypt.compare(dto.password, user.password));
    if (!valid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    return this.createSession(user);
  }

  // échange un refresh token contre une nouvelle paire de tokens (rotation) :
  // l'ancien refresh token devient inutilisable
  async refresh(refreshToken: string | undefined): Promise<AuthResult> {
    const payload = await this.verifyRefreshToken(refreshToken);

    // l'ancienne session n'est pas supprimée tout de suite mais expire après
    // un court délai : deux onglets qui renouvellent en même temps ne sont
    // pas pris pour un vol de token
    const now = new Date();
    const session = await this.sessionModel
      .findOneAndUpdate(
        { jti: payload.jti, user: payload.sub, rotatedAt: { $exists: false } },
        {
          rotatedAt: now,
          expiresAt: new Date(now.getTime() + ROTATION_GRACE_MS),
        },
      )
      .exec();
    if (!session) {
      const recentlyRotated = await this.sessionModel
        .exists({ jti: payload.jti, user: payload.sub })
        .exec();
      if (!recentlyRotated) {
        // token signé par nous mais déjà utilisé : il a probablement été volé.
        // on ferme toutes les sessions de l'utilisateur par précaution
        await this.usersService.revokeSessions(payload.sub);
      }
      throw new UnauthorizedException('Session expirée, reconnectez-vous');
    }

    const user = await this.usersService.findActiveById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Compte introuvable ou désactivé');
    }

    return this.createSession(user);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    const payload = await this.verifyRefreshToken(refreshToken).catch(
      () => null,
    );
    if (payload) {
      await this.sessionModel.deleteOne({ jti: payload.jti }).exec();
    }
  }

  private async createSession(user: UserDocument): Promise<AuthResult> {
    const jti = randomUUID();

    const refreshToken = await this.jwtService.signAsync(
      { sub: user.id, jti } satisfies RefreshPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ??
          '7d') as JwtSignOptions['expiresIn'],
      },
    );
    const { exp } = this.jwtService.decode<{ exp: number }>(refreshToken);
    const refreshExpiresAt = new Date(exp * 1000);

    await this.sessionModel.create({
      user: user.id,
      jti,
      expiresAt: refreshExpiresAt,
    });

    // l'access token (courte durée) porte l'id de session : la déconnexion
    // ou un changement de mot de passe le révoque immédiatement
    const payload: JwtPayload = { sub: user.id, email: user.email, sid: jti };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      refreshToken,
      refreshExpiresAt,
      user,
    };
  }

  private async verifyRefreshToken(
    token: string | undefined,
  ): Promise<RefreshPayload> {
    if (!token) throw new UnauthorizedException('Refresh token manquant');
    try {
      return await this.jwtService.verifyAsync<RefreshPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Session expirée, reconnectez-vous');
    }
  }
}
