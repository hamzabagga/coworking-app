import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../common/guards/jwt-auth.guard';
import { UserDocument } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create({ ...dto, role: Role.Member });
    return this.buildResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // même message dans tous les cas pour ne pas révéler si l'email existe
    const valid =
      user &&
      user.isActive &&
      (await bcrypt.compare(dto.password, user.password));
    if (!valid) {
      throw new UnauthorizedException('Email ou mot de passe incorrect');
    }

    return this.buildResponse(user);
  }

  private async buildResponse(user: UserDocument) {
    const payload: JwtPayload = { sub: user.id, email: user.email };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user,
    };
  }
}
