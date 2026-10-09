import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Types } from 'mongoose';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { SpacesService } from '../spaces/spaces.service';
import { computePrice, ReservationsService } from './reservations.service';
import { Reservation, ReservationStatus } from './schemas/reservation.schema';

const HOUR = 60 * 60 * 1000;
const inHours = (h: number) => new Date(Date.now() + h * HOUR);

describe('ReservationsService', () => {
  let service: ReservationsService;
  const member: AuthUser = {
    userId: new Types.ObjectId().toString(),
    email: 'member@test.dev',
    role: Role.Member,
  };
  const admin: AuthUser = { ...member, role: Role.Admin };

  const space = {
    _id: new Types.ObjectId(),
    capacity: 4,
    pricePerHour: 12.5,
    isActive: true,
  };

  const reservationModel = {
    exists: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
  };
  const spacesService = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    spacesService.findOne.mockResolvedValue(space);
    reservationModel.exists.mockResolvedValue(null);
    reservationModel.create.mockImplementation((data: object) => ({
      ...data,
      populate: jest.fn().mockResolvedValue(data),
    }));

    const module = await Test.createTestingModule({
      providers: [
        ReservationsService,
        {
          provide: getModelToken(Reservation.name),
          useValue: reservationModel,
        },
        { provide: SpacesService, useValue: spacesService },
      ],
    }).compile();

    service = module.get(ReservationsService);
  });

  const book = (overrides: object = {}) =>
    service.create(member, {
      spaceId: space._id.toString(),
      startTime: inHours(24),
      endTime: inHours(26),
      ...overrides,
    });

  describe('create', () => {
    it('crée une réservation et calcule le prix', async () => {
      await book({ attendees: 2 });

      expect(reservationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ attendees: 2, totalPrice: 25 }),
      );
    });

    it('refuse un créneau déjà réservé', async () => {
      reservationModel.exists.mockResolvedValue({ _id: 'x' });
      await expect(book()).rejects.toThrow(ConflictException);
    });

    it('cherche les chevauchements sur les réservations confirmées', async () => {
      const startTime = inHours(24);
      const endTime = inHours(26);
      await book({ startTime, endTime });

      expect(reservationModel.exists).toHaveBeenCalledWith({
        space: space._id,
        status: ReservationStatus.Confirmed,
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
      });
    });

    it('refuse une réservation dans le passé', async () => {
      await expect(
        book({ startTime: inHours(-2), endTime: inHours(-1) }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse une fin avant le début', async () => {
      await expect(
        book({ startTime: inHours(26), endTime: inHours(24) }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse une durée inférieure à 30 min', async () => {
      const startTime = inHours(24);
      const endTime = new Date(startTime.getTime() + 15 * 60 * 1000);
      await expect(book({ startTime, endTime })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuse une durée supérieure à 12 h', async () => {
      await expect(
        book({ startTime: inHours(24), endTime: inHours(37) }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuse si la capacité est dépassée', async () => {
      await expect(book({ attendees: 5 })).rejects.toThrow(BadRequestException);
    });

    it('refuse un espace désactivé', async () => {
      spacesService.findOne.mockResolvedValue({ ...space, isActive: false });
      await expect(book()).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    const mockReservation = (overrides: object = {}) => {
      const reservation = {
        user: new Types.ObjectId(member.userId),
        status: ReservationStatus.Confirmed,
        startTime: inHours(24),
        save: jest.fn(),
        populate: jest.fn().mockReturnThis(),
        ...overrides,
      };
      reservationModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(reservation),
      });
      return reservation;
    };

    it('annule sa propre réservation', async () => {
      const reservation = mockReservation();
      await service.cancel(member, 'id');

      expect(reservation.status).toBe(ReservationStatus.Cancelled);
      expect(reservation.save).toHaveBeenCalled();
    });

    it("interdit d'annuler la réservation d'un autre membre", async () => {
      mockReservation({ user: new Types.ObjectId() });
      await expect(service.cancel(member, 'id')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("l'admin peut annuler la réservation d'un autre", async () => {
      const reservation = mockReservation({ user: new Types.ObjectId() });
      await service.cancel(admin, 'id');
      expect(reservation.status).toBe(ReservationStatus.Cancelled);
    });

    it('un membre ne peut pas annuler une réservation commencée', async () => {
      mockReservation({ startTime: inHours(-1) });
      await expect(service.cancel(member, 'id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('refuse une double annulation', async () => {
      mockReservation({ status: ReservationStatus.Cancelled });
      await expect(service.cancel(member, 'id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  it('computePrice arrondit au centime', () => {
    const start = new Date('2026-01-01T09:00:00Z');
    const end = new Date('2026-01-01T10:20:00Z');
    expect(computePrice(10, start, end)).toBe(13.33);
  });
});
