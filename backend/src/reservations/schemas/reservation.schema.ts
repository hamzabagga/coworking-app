import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { Space } from '../../spaces/schemas/space.schema';
import { User } from '../../users/schemas/user.schema';

export enum ReservationStatus {
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
}

export type ReservationDocument = HydratedDocument<Reservation>;

@Schema({ timestamps: true, versionKey: false })
export class Reservation {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: User.name, required: true })
  user: Types.ObjectId;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: Space.name,
    required: true,
  })
  space: Types.ObjectId;

  @Prop({ required: true })
  startTime: Date;

  @Prop({ required: true })
  endTime: Date;

  @Prop({ required: true, min: 1, default: 1 })
  attendees: number;

  // prix figé au moment de la réservation
  @Prop({ required: true, min: 0 })
  totalPrice: number;

  @Prop({
    type: String,
    enum: ReservationStatus,
    default: ReservationStatus.Confirmed,
  })
  status: ReservationStatus;

  @Prop({ trim: true })
  notes?: string;

  @Prop()
  cancelledAt?: Date;
}

export const ReservationSchema = SchemaFactory.createForClass(Reservation);

// accélère la recherche de chevauchements pour un espace
ReservationSchema.index({ space: 1, status: 1, startTime: 1, endTime: 1 });
ReservationSchema.index({ user: 1, startTime: -1 });
