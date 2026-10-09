import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter, Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { SpaceDocument } from '../spaces/schemas/space.schema';
import { SpacesService } from '../spaces/spaces.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { QueryReservationsDto } from './dto/query-reservations.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import {
  Reservation,
  ReservationDocument,
  ReservationStatus,
} from './schemas/reservation.schema';

const HOUR_MS = 60 * 60 * 1000;
export const MIN_DURATION_MS = 30 * 60 * 1000; // 30 min
export const MAX_DURATION_MS = 12 * HOUR_MS; // 12 h

const POPULATE_SPACE = { path: 'space', select: 'name type location' };
const POPULATE_USER = { path: 'user', select: 'firstName lastName email' };

@Injectable()
export class ReservationsService {
  constructor(
    @InjectModel(Reservation.name)
    private readonly reservationModel: Model<Reservation>,
    private readonly spacesService: SpacesService,
  ) {}

  async create(
    user: AuthUser,
    dto: CreateReservationDto,
  ): Promise<ReservationDocument> {
    const space = await this.spacesService.findOne(dto.spaceId);
    const attendees = dto.attendees ?? 1;

    this.validateBooking(space, dto.startTime, dto.endTime, attendees);
    await this.ensureNoOverlap(space._id, dto.startTime, dto.endTime);

    const reservation = await this.reservationModel.create({
      user: new Types.ObjectId(user.userId),
      space: space._id,
      startTime: dto.startTime,
      endTime: dto.endTime,
      attendees,
      notes: dto.notes,
      totalPrice: computePrice(space.pricePerHour, dto.startTime, dto.endTime),
    });
    return reservation.populate([POPULATE_SPACE, POPULATE_USER]);
  }

  findAll(
    user: AuthUser,
    query: QueryReservationsDto,
  ): Promise<ReservationDocument[]> {
    const filter: QueryFilter<Reservation> = {};

    if (user.role !== Role.Admin) {
      filter.user = user.userId;
    } else if (query.userId) {
      filter.user = query.userId;
    }
    if (query.spaceId) filter.space = query.spaceId;
    if (query.status) filter.status = query.status;
    if (query.from) filter.endTime = { $gt: query.from };
    if (query.to) filter.startTime = { $lt: query.to };

    return this.reservationModel
      .find(filter)
      .populate([POPULATE_SPACE, POPULATE_USER])
      .sort({ startTime: -1 })
      .exec();
  }

  async findOne(user: AuthUser, id: string): Promise<ReservationDocument> {
    const reservation = await this.getOwnedReservation(user, id);
    return reservation.populate([POPULATE_SPACE, POPULATE_USER]);
  }

  // déplacer une réservation / changer le nombre de personnes
  async update(
    user: AuthUser,
    id: string,
    dto: UpdateReservationDto,
  ): Promise<ReservationDocument> {
    const reservation = await this.getOwnedReservation(user, id);
    this.ensureModifiable(reservation);

    const space = await this.spacesService.findOne(
      reservation.space.toString(),
    );
    const startTime = dto.startTime ?? reservation.startTime;
    const endTime = dto.endTime ?? reservation.endTime;
    const attendees = dto.attendees ?? reservation.attendees;

    this.validateBooking(space, startTime, endTime, attendees);
    await this.ensureNoOverlap(space._id, startTime, endTime, reservation._id);

    reservation.set({
      startTime,
      endTime,
      attendees,
      notes: dto.notes ?? reservation.notes,
      totalPrice: computePrice(space.pricePerHour, startTime, endTime),
    });
    await reservation.save();
    return reservation.populate([POPULATE_SPACE, POPULATE_USER]);
  }

  async cancel(user: AuthUser, id: string): Promise<ReservationDocument> {
    const reservation = await this.getOwnedReservation(user, id);

    if (reservation.status === ReservationStatus.Cancelled) {
      throw new BadRequestException('Réservation déjà annulée');
    }
    // un membre ne peut plus annuler une réservation commencée, l'admin si
    if (user.role !== Role.Admin && reservation.startTime <= new Date()) {
      throw new BadRequestException(
        'Impossible d’annuler une réservation déjà commencée',
      );
    }

    reservation.status = ReservationStatus.Cancelled;
    reservation.cancelledAt = new Date();
    await reservation.save();
    return reservation.populate([POPULATE_SPACE, POPULATE_USER]);
  }

  // ---- règles métier ----

  private validateBooking(
    space: SpaceDocument,
    startTime: Date,
    endTime: Date,
    attendees: number,
  ) {
    if (!space.isActive) {
      throw new BadRequestException('Cet espace n’est pas réservable');
    }
    if (startTime <= new Date()) {
      throw new BadRequestException('La réservation doit être dans le futur');
    }

    const duration = endTime.getTime() - startTime.getTime();
    if (duration <= 0) {
      throw new BadRequestException('La fin doit être après le début');
    }
    if (duration < MIN_DURATION_MS) {
      throw new BadRequestException('Durée minimale : 30 minutes');
    }
    if (duration > MAX_DURATION_MS) {
      throw new BadRequestException('Durée maximale : 12 heures');
    }

    if (attendees > space.capacity) {
      throw new BadRequestException(
        `Capacité dépassée : ${space.capacity} personne(s) maximum`,
      );
    }
  }

  // deux créneaux se chevauchent si start < autreFin ET end > autreDébut
  private async ensureNoOverlap(
    spaceId: Types.ObjectId,
    startTime: Date,
    endTime: Date,
    excludeId?: Types.ObjectId,
  ) {
    const filter: QueryFilter<Reservation> = {
      space: spaceId,
      status: ReservationStatus.Confirmed,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    };
    if (excludeId) filter._id = { $ne: excludeId };

    if (await this.reservationModel.exists(filter)) {
      throw new ConflictException('Ce créneau est déjà réservé');
    }
  }

  private ensureModifiable(reservation: ReservationDocument) {
    if (reservation.status !== ReservationStatus.Confirmed) {
      throw new BadRequestException(
        'Une réservation annulée ne peut pas être modifiée',
      );
    }
    if (reservation.startTime <= new Date()) {
      throw new BadRequestException(
        'Une réservation commencée ne peut plus être modifiée',
      );
    }
  }

  // un membre n'accède qu'à ses propres réservations
  private async getOwnedReservation(
    user: AuthUser,
    id: string,
  ): Promise<ReservationDocument> {
    const reservation = await this.reservationModel.findById(id).exec();
    if (!reservation) throw new NotFoundException('Réservation introuvable');

    if (user.role !== Role.Admin && !reservation.user.equals(user.userId)) {
      throw new ForbiddenException('Cette réservation ne vous appartient pas');
    }
    return reservation;
  }
}

export function computePrice(pricePerHour: number, start: Date, end: Date) {
  const hours = (end.getTime() - start.getTime()) / HOUR_MS;
  return Math.round(hours * pricePerHour * 100) / 100;
}
