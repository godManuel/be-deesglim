import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductImageDocument = ProductImage & Document;

@Schema()
export class ProductImage {
  @Prop({ required: true })
  url: string;

  @Prop()
  altText?: string;

  @Prop({ default: 0 })
  sortOrder: number;
}

export const ProductImageSchema = SchemaFactory.createForClass(ProductImage);
