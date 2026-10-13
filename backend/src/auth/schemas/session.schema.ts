import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { User } from '../../users/schemas/user.schema';

export type SessionDocument = HydratedDocument<Session>;

// une session = un refresh token valide (un par appareil / navigateur connecté)
// le token lui-même n'est pas stocké : seul son identifiant (jti) l'est
@Schema({ timestamps: true })
export class Session {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: User.name,
    required: true,
    index: true,
  })
  user: Types.ObjectId;

  @Prop({ required: true, unique: true })
  jti: string;

  @Prop({ required: true })
  expiresAt: Date;

  // date à laquelle ce refresh token a été échangé contre un nouveau
  @Prop()
  rotatedAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);

// MongoDB supprime automatiquement les sessions expirées (index TTL)
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
