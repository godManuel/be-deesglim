import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from './category.schema';
import { ProductImage } from './product-image.schema';
import { ProductVariant } from './product-variant.schema';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description: string;

  @Prop()
  shortDescription?: string;

  @Prop({ default: true })
  isVisible: boolean;

  @Prop({ default: false })
  isFeatured: boolean;

  @Prop({ type: Types.ObjectId, ref: Category.name })
  category: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: ProductVariant.name }] })
  variants: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: ProductImage.name }] })
  images: Types.ObjectId[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
