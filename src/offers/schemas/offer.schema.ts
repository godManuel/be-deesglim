import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OfferDocument = Offer & Document;

@Schema({ timestamps: true })
export class Offer {
  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop()
  description?: string;

  @Prop({
    required: true,
  })
  image!: string;

  @Prop({
    required: true,
    min: 0,
  })
  offerPrice!: number;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'ProductVariant' }],
    required: true,
    validate: {
      validator: (arr: Types.ObjectId[]) =>
        Array.isArray(arr) && arr.length > 0,
      message: 'An offer must include at least one product variant.',
    },
  })
  variantIds!: Types.ObjectId[];

  @Prop({})
  expirationDate?: Date;

  @Prop({
    default: true,
  })
  isActive!: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  createdBy!: Types.ObjectId;
}

export const OfferSchema = SchemaFactory.createForClass(Offer);
