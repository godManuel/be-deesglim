import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true })
  fullName: string;

  @Prop()
  lastName?: string;

  @Prop()
  avatar?: string;

  @Prop({ required: false, default: null, type: String })
  password?: string | null;

  @Prop({ type: String, enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({ type: String, enum: AuthProvider, default: AuthProvider.LOCAL })
  authProvider: AuthProvider;

  @Prop({ type: String, default: null })
  googleId?: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
