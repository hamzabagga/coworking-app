import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcryptjs';
import { Model } from 'mongoose';
import { Role } from '../common/enums/role.enum';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserDocument } from './schemas/user.schema';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService implements OnApplicationBootstrap {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly config: ConfigService,
  ) {}

  // crée un compte admin au démarrage si ADMIN_EMAIL / ADMIN_PASSWORD sont définis
  async onApplicationBootstrap() {
    const email = this.config.get<string>('ADMIN_EMAIL');
    const password = this.config.get<string>('ADMIN_PASSWORD');
    if (!email || !password) return;

    const exists = await this.userModel.exists({ email: email.toLowerCase() });
    if (exists) return;

    await this.create({
      email,
      password,
      firstName: 'Admin',
      lastName: 'Coworking',
      role: Role.Admin,
    });
    this.logger.log(`Compte admin créé : ${email}`);
  }

  async create(dto: CreateUserDto): Promise<UserDocument> {
    const exists = await this.userModel.exists({
      email: dto.email.toLowerCase(),
    });
    if (exists) {
      throw new ConflictException('Cet email est déjà utilisé');
    }

    const password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    return this.userModel.create({ ...dto, password });
  }

  findAll(): Promise<UserDocument[]> {
    return this.userModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  findActiveById(id: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ _id: id, isActive: true }).exec();
  }

  // seule méthode qui charge le hash du mot de passe (pour le login)
  findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+password')
      .exec();
  }

  async update(
    id: string,
    dto: UpdateUserDto | UpdateProfileDto,
  ): Promise<UserDocument> {
    if ('email' in dto && dto.email) {
      const taken = await this.userModel.exists({
        email: dto.email.toLowerCase(),
        _id: { $ne: id },
      });
      if (taken) throw new ConflictException('Cet email est déjà utilisé');
    }

    const user = await this.userModel
      .findByIdAndUpdate(id, dto, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();
    if (!user) throw new NotFoundException('Utilisateur introuvable');
    return user;
  }

  async changePassword(id: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.userModel.findById(id).select('+password').exec();
    if (!user) throw new NotFoundException('Utilisateur introuvable');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) {
      throw new BadRequestException('Mot de passe actuel incorrect');
    }

    user.password = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await user.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Utilisateur introuvable');
  }
}
