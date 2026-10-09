import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';
import {
  Reservation,
  ReservationStatus,
} from '../reservations/schemas/reservation.schema';
import { CreateSpaceDto } from './dto/create-space.dto';
import { QuerySpacesDto } from './dto/query-spaces.dto';
import { UpdateSpaceDto } from './dto/update-space.dto';
import { Space, SpaceDocument } from './schemas/space.schema';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class SpacesService {
  constructor(
    @InjectModel(Space.name) private readonly spaceModel: Model<Space>,
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<Reservation>,
  ) {}

  async create(dto: CreateSpaceDto): Promise<SpaceDocument> {
    await this.ensureNameAvailable(dto.name);
    return this.spaceModel.create(dto);
  }

  findAll(query: QuerySpacesDto): Promise<SpaceDocument[]> {
    const filter: QueryFilter<Space> = {};
    if (!query.includeInactive) filter.isActive = true;
    if (query.type) filter.type = query.type;
    if (query.minCapacity) filter.capacity = { $gte: query.minCapacity };

    return this.spaceModel.find(filter).sort({ name: 1 }).exec();
  }

  async findOne(id: string): Promise<SpaceDocument> {
    const space = await this.spaceModel.findById(id).exec();
    if (!space) throw new NotFoundException('Espace introuvable');
    return space;
  }

  async update(id: string, dto: UpdateSpaceDto): Promise<SpaceDocument> {
    if (dto.name) await this.ensureNameAvailable(dto.name, id);

    const space = await this.spaceModel
      .findByIdAndUpdate(id, dto, {
        returnDocument: 'after',
        runValidators: true,
      })
      .exec();
    if (!space) throw new NotFoundException('Espace introuvable');
    return space;
  }

  async remove(id: string): Promise<void> {
    const hasUpcoming = await this.reservationModel.exists({
      space: id,
      status: ReservationStatus.Confirmed,
      endTime: { $gt: new Date() },
    });
    if (hasUpcoming) {
      throw new ConflictException(
        "Cet espace a des réservations à venir : annulez-les ou désactivez l'espace (isActive: false)",
      );
    }

    const result = await this.spaceModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Espace introuvable');
  }

  // créneaux déjà réservés pour un espace sur une journée (UTC)
  async getAvailability(id: string, date: string) {
    const space = await this.findOne(id);

    const dayStart = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(dayStart.getTime())) {
      throw new BadRequestException('Date invalide');
    }
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);

    const reservations = await this.reservationModel
      .find({
        space: space._id,
        status: ReservationStatus.Confirmed,
        startTime: { $lt: dayEnd },
        endTime: { $gt: dayStart },
      })
      .select('startTime endTime -_id')
      .sort({ startTime: 1 })
      .lean()
      .exec();

    return {
      space: { id: space.id, name: space.name, isActive: space.isActive },
      date,
      bookedSlots: reservations,
    };
  }

  private async ensureNameAvailable(name: string, excludeId?: string) {
    const filter: QueryFilter<Space> = { name };
    if (excludeId) filter._id = { $ne: excludeId };
    if (await this.spaceModel.exists(filter)) {
      throw new ConflictException('Un espace porte déjà ce nom');
    }
  }
}
