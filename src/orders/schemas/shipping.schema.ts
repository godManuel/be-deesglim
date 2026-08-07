import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ShippingDetailsDocument = ShippingDetails & Document;

@Schema({ timestamps: true })
export class ShippingDetails {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  line1: string;

  @Prop({ required: true })
  city: string;

  @Prop({ required: true })
  state: string;

  @Prop({ required: true })
  postalCode: string;

  @Prop({ required: true })
  country: string;
}

export const ShippingDetailsSchema =
  SchemaFactory.createForClass(ShippingDetails);
