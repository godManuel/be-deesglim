import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type DeliveryOptionDocument = HydratedDocument<DeliveryOption>;

@Schema({
  timestamps: true,
})
export class DeliveryOption {
  @Prop({
    required: true,
    unique: true,
    index: true,
  })
  id!: string;

  @Prop({
    required: true,
  })
  title!: string;

  @Prop()
  duration?: string;

  @Prop({
    type: [String],
    required: true,
  })
  deliveryTypes!: string[];

  @Prop({
    type: Object,
    required: true,
  })
  deliveryFees!: Record<string, number>;

  @Prop({
    type: Object,
  })
  deliveryDurations?: Record<string, string>;

  @Prop({
    type: [String],
    required: true,
  })
  availableFor!: string[];

  @Prop()
  description?: string;

  @Prop({
    default: true,
  })
  isActive!: boolean;
}

export const DeliveryOptionSchema =
  SchemaFactory.createForClass(DeliveryOption);
