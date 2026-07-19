import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductVariantDocument = ProductVariant & Document;

@Schema()
export class ProductVariant {
  @Prop()
  color?: string;

  @Prop()
  texture?: string;

  @Prop()
  length?: string;

  @Prop()
  laceSize?: string;

  @Prop()
  laceType?: string;

  @Prop()
  closureSize?: string;

  @Prop()
  frontalSize?: string;

  @Prop()
  headSize?: string;

  @Prop()
  parting?: string;

  @Prop()
  styling?: string;

  @Prop()
  hairType?: string;

  @Prop()
  customizationNote?: string;

  @Prop()
  specialNote?: string;

  @Prop()
  laceCustomization?: boolean;

  @Prop()
  whyChoose?: string;

  @Prop()
  whyNotChoose?: string;

  @Prop({ default: 0 })
  extraFee?: number;

  @Prop()
  oldPrice?: number;

  @Prop({ required: true })
  newPrice: number;

  @Prop({ default: 0 })
  inventoryCount: number;
}

export const ProductVariantSchema =
  SchemaFactory.createForClass(ProductVariant);
