import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { Session } from './schemas/session.schema';

const config: Record<string, string> = {
  JWT_REFRESH_SECRET: 'refresh-secret-test',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

describe('AuthService', () => {
  let service: AuthService;
  let jwt: JwtService;

  const user = {
    id: new Types.ObjectId().toString(),
    email: 'member@test.dev',
    isActive: true,
    password: bcrypt.hashSync('password123', 4),
  };

  const sessionModel = {
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
    exists: jest.fn(),
    deleteOne: jest.fn(),
  };
  const usersService = {
    findByEmailWithPassword: jest.fn(),
    findActiveById: jest.fn(),
    revokeSessions: jest.fn(),
  };
  const exec = (value: unknown) => ({ exec: () => Promise.resolve(value) });

  beforeEach(async () => {
    jest.resetAllMocks();
    usersService.findByEmailWithPassword.mockResolvedValue(user);
    usersService.findActiveById.mockResolvedValue(user);
    sessionModel.deleteOne.mockReturnValue(exec(null));
    sessionModel.exists.mockReturnValue(exec(null));

    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: 'access-secret-test',
          signOptions: { expiresIn: '15m' },
        }),
      ],
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: ConfigService, useValue: new ConfigService(config) },
        { provide: getModelToken(Session.name), useValue: sessionModel },
      ],
    }).compile();

    service = module.get(AuthService);
    jwt = module.get(JwtService);
  });

  const login = () =>
    service.login({ email: user.email, password: 'password123' });

  it('login : crée une session et renvoie access + refresh token', async () => {
    const result = await login();

    const refresh = jwt.decode<{ jti: string }>(result.refreshToken);
    const access = jwt.decode<{ sid: string; sub: string }>(result.accessToken);
    expect(access).toMatchObject({ sub: user.id, sid: refresh.jti });
    expect(sessionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({ user: user.id, jti: refresh.jti }),
    );
  });

  it('login : refuse un mauvais mot de passe', async () => {
    await expect(
      service.login({ email: user.email, password: 'mauvais' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(sessionModel.create).not.toHaveBeenCalled();
  });

  it('refresh : marque l’ancienne session et en crée une nouvelle', async () => {
    const { refreshToken } = await login();
    const { jti } = jwt.decode<{ jti: string }>(refreshToken);
    sessionModel.findOneAndUpdate.mockReturnValue(exec({ jti }));

    const result = await service.refresh(refreshToken);

    expect(sessionModel.findOneAndUpdate).toHaveBeenCalledWith(
      { jti, user: user.id, rotatedAt: { $exists: false } },
      expect.objectContaining({ rotatedAt: expect.any(Date) }),
    );
    expect(jwt.decode<{ jti: string }>(result.refreshToken).jti).not.toBe(jti);
  });

  it('refresh : un token déjà utilisé ferme toutes les sessions', async () => {
    const { refreshToken } = await login();
    sessionModel.findOneAndUpdate.mockReturnValue(exec(null));

    await expect(service.refresh(refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(usersService.revokeSessions).toHaveBeenCalledWith(user.id);
  });

  it('refresh : deux renouvellements simultanés ne ferment pas les sessions', async () => {
    const { refreshToken } = await login();
    sessionModel.findOneAndUpdate.mockReturnValue(exec(null));
    sessionModel.exists.mockReturnValue(exec({ _id: 'rotated' }));

    await expect(service.refresh(refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(usersService.revokeSessions).not.toHaveBeenCalled();
  });

  it('refresh : refuse un access token utilisé comme refresh token', async () => {
    const { accessToken } = await login();

    await expect(service.refresh(accessToken)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(sessionModel.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('refresh : refuse un compte désactivé', async () => {
    const { refreshToken } = await login();
    sessionModel.findOneAndUpdate.mockReturnValue(exec({}));
    usersService.findActiveById.mockResolvedValue(null);

    await expect(service.refresh(refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('logout : supprime la session du refresh token', async () => {
    const { refreshToken } = await login();
    const { jti } = jwt.decode<{ jti: string }>(refreshToken);

    await service.logout(refreshToken);

    expect(sessionModel.deleteOne).toHaveBeenCalledWith({ jti });
  });
});
