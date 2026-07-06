import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductVariantDocument = ProductVariant & Document;

@Schema()
export class ProductVariant {
  @Prop({ required: true, unique: true })
  sku: string;

  @Prop({ required: true })
  color: string;

  @Prop({ required: true })
  length: string;

  @Prop({ required: true })
  texture: string;

  @Prop()
  capType?: string;

  @Prop({ required: true })
  price: number;

  @Prop({ default: 0 })
  inventoryCount: number;
}

export const ProductVariantSchema = SchemaFactory.createForClass(ProductVariant);
