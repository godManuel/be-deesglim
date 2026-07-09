import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Category } from './category.schema';
import { ProductImage } from './product-image.schema';
import { ProductVariant } from './product-variant.schema';

export type ProductDocument = Product & Document;

export enum CustomWigType {
  READY_TO_SHIP = 'READY_TO_SHIP',
  MAKE_FROM_SCRATCH = 'MAKE_FROM_SCRATCH',
}

export enum LaceType {
  SWISS_LACE = 'Swiss Lace',
  HD_LACE = 'HD Lace',
  ULTRA_THIN_HD_LACE = 'Ultra Thin HD Lace',
}

export enum CustomWigDensityOption {
  DENSITY_200G_BELOW_14_INCHES = '200 grams (below 14 inches)',
  DENSITY_300G = '300 grams',
  DENSITY_400G = '400 grams',
  DENSITY_500G = '500 grams',
}

export enum LaceTintShade {
  LIGHT = 'light',
  MEDIUM = 'medium',
  DARK = 'dark',
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

  @ApiPropertyOptional({
    example: '5x5',
    description: 'Lace size (used by Closures/Frontals and Custom Wigs).',
  })
  @Prop()
  laceSize?: string;

  @ApiPropertyOptional({
    example: '20 inches',
    description: 'Length (used by Closures/Frontals and Custom Wigs).',
  })
  @Prop()
  length?: string;

  @ApiPropertyOptional({
    example: 'Natural Black',
    description: 'Color (used by Closures/Frontals and Custom Wigs).',
  })
  @Prop()
  color?: string;

  @ApiPropertyOptional({
    example: 5,
    description: 'Quantity (used by Closures/Frontals).',
  })
  @Prop({ type: Number })
  quantity: number;

  @ApiPropertyOptional({
    example: 399.99,
    description: 'Old price (used by Closures/Frontals).',
  })
  @Prop({ type: Number })
  oldPrice?: number;

  @ApiPropertyOptional({
    example: 299.99,
    description: 'New price (used by Closures/Frontals).',
  })
  @Prop({ type: Number })
  newPrice?: number;

  @ApiPropertyOptional({
    example: 22.5,
    description: 'Head size (used by Custom Wigs).',
  })
  @Prop({ type: Number })
  headSize?: number;

  @ApiPropertyOptional({
    example: 300,
    description: 'Grams (used by Custom Wigs).',
  })
  @Prop({ type: Number })
  grams?: number;

  @ApiProperty({
    example: '64a0a7fa79bcf6e5f0d9a6b3',
    description: 'Reference to the product category ID',
  })
  @Prop({ type: Types.ObjectId, ref: Category.name })
  category: Types.ObjectId;

  @ApiPropertyOptional({
    enum: CustomWigType,
    description:
      'Custom wig mode. READY_TO_SHIP is uploaded by admin; MAKE_FROM_SCRATCH is configured by users.',
  })
  @Prop({ type: String, enum: CustomWigType })
  customWigType?: CustomWigType;

  @ApiPropertyOptional({
    type: [String],
    example: ['4x4', '5x5', '13x4'],
    description: 'Available lace size variants.',
  })
  @Prop({ type: [String], default: [] })
  laceSizes?: string[];

  @ApiPropertyOptional({
    type: [String],
    enum: LaceType,
    description: 'Available lace types.',
  })
  @Prop({ type: [String], enum: LaceType, default: [] })
  laceTypes?: LaceType[];

  @ApiPropertyOptional({
    type: [String],
    example: ['12 inches', '14 inches', '16 inches'],
    description: 'Available length variants.',
  })
  @Prop({ type: [String], default: [] })
  lengthOptions?: string[];

  @ApiPropertyOptional({
    type: [String],
    enum: CustomWigDensityOption,
    description: 'Available density options.',
  })
  @Prop({ type: [String], enum: CustomWigDensityOption, default: [] })
  densityOptions?: CustomWigDensityOption[];

  @ApiPropertyOptional({
    type: [Number],
    example: [21, 21.5, 22, 22.5, 23, 24],
    description: 'Available head sizes.',
  })
  @Prop({ type: [Number], enum: [21, 21.5, 22, 22.5, 23, 24], default: [] })
  headSizes?: number[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Natural Black', 'Burgundy'],
    description: 'Color options available for this custom wig.',
  })
  @Prop({ type: [String], default: [] })
  colors?: string[];

  @ApiPropertyOptional({
    example: false,
    description:
      'If true, any color can be chosen (for make-from-scratch custom wigs).',
  })
  @Prop({ default: false })
  allowAnyColor?: boolean;

  @ApiPropertyOptional({
    example: true,
    description:
      'Whether lace customization is available (bleached knots + tinted lace).',
  })
  @Prop({ default: false })
  laceCustomizationAvailable?: boolean;

  @ApiPropertyOptional({
    type: [String],
    enum: LaceTintShade,
    description: 'Available tint shades for lace customization.',
  })
  @Prop({ type: [String], enum: LaceTintShade, default: [] })
  laceTintShades?: LaceTintShade[];

  @ApiPropertyOptional({
    type: [String],
    example: ['Straight', 'Body Wave', 'Curly'],
    description: 'Available texture options for make-from-scratch flow.',
  })
  @Prop({ type: [String], default: [] })
  textureOptions?: string[];

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
