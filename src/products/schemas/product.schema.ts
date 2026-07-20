import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import { Category } from './category.schema';
import { ProductImage } from './product-image.schema';
import { ProductVariant } from './product-variant.schema';

export type ProductDocument = Product & Document;

// Lace Supply is the only category with a restricted color palette.
export enum LaceColor {
  TRANSPARENT = 'Transparent',
  BROWN = 'Brown',
}

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
    example: 'A luxurious silk hair extension.',
    description: 'Detailed product description',
  })
  @Prop()
  description: string;

  @ApiPropertyOptional({
    example: 'Natural Black',
    description:
      'Product-level color. Used by Lace Supply (restricted to Transparent/Brown — see LaceColor) and Ready to Ship Wigs (free text). Closures/Frontals tracks color per variant instead — see ProductVariant.color. Not used by Custom Wigs.',
  })
  @Prop({
    type: String,
    enum: [LaceColor.TRANSPARENT, LaceColor.BROWN],
  })
  color?: string;

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

  @ApiPropertyOptional({
    example: false,
    description:
      'Lace Supply publish flag — whether this lace product is live in the Boutique storefront. Kept separate from `isVisible` in case Lace Supply goes through its own draft/publish workflow; consolidate the two fields if that turns out not to be needed.',
  })
  @Prop({ default: false })
  publishToBoutique?: boolean;

  @ApiProperty({
    example: 99.99,
    description:
      'Base product price in USD. Used directly by Ready to Ship Wigs and Custom Wigs. Lace Supply and Closures/Frontals price per variant instead (see ProductVariant.newPrice/oldPrice) and can leave this at 0.',
  })
  @Prop({ type: Number, default: 0 })
  price: number;

  @ApiProperty({
    example: '64a0a7fa79bcf6e5f0d9a6b3',
    description: 'Reference to the product category ID',
  })
  @Prop({ type: Types.ObjectId, ref: Category.name, required: true })
  category: Types.ObjectId;

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
