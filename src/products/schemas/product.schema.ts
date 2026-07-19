import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { Category } from './category.schema';
import { ProductImage } from './product-image.schema';
import { ProductVariant } from './product-variant.schema';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @ApiProperty({
    example: 'Silk Weft Extension',
    description: 'Name of the product',
  })
  @Prop({ required: true, unique: true })
  name: string;

  @ApiProperty({
    example: 'silk-weft-extension',
    description: 'URL-friendly product slug',
  })
  @Prop({ required: true, unique: true })
  slug: string;

  @ApiProperty({
    example: 'SKU-1234',
    description: 'Unique SKU for the product',
  })
  @Prop({ required: true, unique: true })
  sku: string;

  @ApiProperty({
    example: 'A luxurious silk hair extension.',
    description: 'Detailed product description',
  })
  @Prop()
  description: string;

  @ApiPropertyOptional({
    example: 'Natural Black',
  })
  @Prop()
  color?: string;

  @ApiProperty({
    description: 'Product category',
  })
  @Prop({
    type: Types.ObjectId,
    ref: Category.name,
    required: true,
  })
  category: Types.ObjectId;

  @ApiPropertyOptional({
    example: 'Luxury hair extension for styling and volume.',
    description: 'Short product summary',
  })
  @Prop()
  shortDescription?: string;

  @ApiProperty({
    example: true,
    description: 'Whether the product is visible in the storefront',
  })
  @Prop({ default: true })
  isVisible: boolean;

  @ApiProperty({
    example: false,
    description: 'Whether the product is featured in listings',
  })
  @Prop({ default: false })
  isFeatured: boolean;

  @ApiProperty({ example: 99.99, description: 'Product price in USD' })
  @Prop({ type: Number, default: 0 })
  price: number;

  @ApiProperty({
    example: '64a0a7fa79bcf6e5f0d9a6b3',
    description: 'Reference to the product category ID',
  })
  @Prop({ type: Types.ObjectId, ref: Category.name })
  category: Types.ObjectId;

  @ApiPropertyOptional({
    type: [String],
    example: ['Natural Black', 'Burgundy'],
    description: 'Color options available for this custom wig.',
  })
  @Prop({ type: [String], default: [] })
  colors?: string[];

  @ApiPropertyOptional({
    example: 'https://cdn.deesglim.com/guides/head-size-guide.pdf',
    description: 'PDF URL for custom wig size guide.',
  })
  @Prop()
  sizeGuidePdfUrl?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.deesglim.com/guides/skin-tone-guide.pdf',
    description: 'PDF URL for skin tone/tint shade guide.',
  })
  @Prop()
  skinToneGuidePdfUrl?: string;

  @ApiPropertyOptional({
    example: ['64a0a7fa79bcf6e5f0d9a6b4'],
    description: 'List of product variant IDs',
    type: [String],
  })
  @Prop({ type: [{ type: Types.ObjectId, ref: ProductVariant.name }] })
  variants: Types.ObjectId[];

  @ApiPropertyOptional({
    example: ['64a0a7fa79bcf6e5f0d9a6b5'],
    description: 'List of product image IDs',
    type: [String],
  })
  @Prop({ type: [{ type: Types.ObjectId, ref: ProductImage.name }] })
  images: Types.ObjectId[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
