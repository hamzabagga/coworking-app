import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export enum SpaceType {
  Desk = 'desk',
  PrivateOffice = 'private_office',
  MeetingRoom = 'meeting_room',
  EventSpace = 'event_space',
}

export type SpaceDocument = HydratedDocument<Space>;

@Schema({ timestamps: true, versionKey: false })
export class Space {
  @Prop({ required: true, unique: true, trim: true })
  name: string;

  @Prop({ trim: true })
  description?: string;

  @Prop({ type: String, enum: SpaceType, required: true })
  type: SpaceType;

  @Prop({ required: true, min: 1 })
  capacity: number;

  @Prop({ required: true, min: 0 })
  pricePerHour: number;

  @Prop({ type: [String], default: [] })
  amenities: string[];

  @Prop({ trim: true })
  location?: string;

  @Prop({ trim: true })
  imageUrl?: string;

  // un espace désactivé n'est plus réservable
  @Prop({ default: true })
  isActive: boolean;
}

export const SpaceSchema = SchemaFactory.createForClass(Space);
