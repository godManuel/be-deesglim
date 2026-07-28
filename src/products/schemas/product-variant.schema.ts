import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ProductVariantDocument = ProductVariant & Document;

@Schema()
export class ProductVariant {
  @ApiPropertyOptional({
    example: 'Natural Black',
    description: 'Closures/Frontals only — color of this specific variant.',
  })
  @Prop({ type: [String] })
  color?: string[];

  @ApiPropertyOptional({
    example: 'Body Wave',
    description: 'Closures/Frontals only — texture of this variant.',
  })
  @Prop()
  texture?: string;

  @ApiPropertyOptional({
    example: '20 inches',
    description:
      'Closures/Frontals, Ready to Ship Wigs, and Custom Wigs — length.',
  })
  @Prop()
  length?: string;

  @ApiPropertyOptional({
    example: '5x5',
    description: 'Lace Supply and Custom Wigs — lace size, e.g. "5x5".',
  })
  @Prop()
  laceSize?: string;

  @ApiPropertyOptional({
    example: 'HD Lace',
    description: 'Closures/Frontals only — type of lace used.',
  })
  @Prop()
  laceType?: string;

  @ApiPropertyOptional({
    example: '4x4',
    description: 'Ready to Ship Wigs only — closure size.',
  })
  @Prop()
  closureSize?: string;

  @ApiPropertyOptional({
    example: '13x4',
    description: 'Ready to Ship Wigs only — frontal size.',
  })
  @Prop()
  frontalSize?: string;

  @ApiPropertyOptional({
    example: '22.5',
    description:
      'Lace Supply (optional), Ready to Ship Wigs, and Custom Wigs — head size.',
  })
  @Prop()
  headSize?: number;

  @ApiPropertyOptional({
    example: 'Middle Part',
    description: 'Ready to Ship Wigs and Custom Wigs — parting style.',
  })
  @Prop()
  parting?: string;

  @ApiPropertyOptional({
    example: 'Bleached knots + tinted lace',
    description: 'Custom Wigs only — styling option for made-to-order wigs.',
  })
  @Prop()
  styling?: string;

  @ApiPropertyOptional({
    example: 'Virgin Human Hair',
    description: 'Custom Wigs only — hair type for made-to-order wigs.',
  })
  @Prop()
  hairType?: string;

  @ApiPropertyOptional({
    example: 'Add baby hairs around the perimeter',
    description:
      'Ready to Ship Wigs only — a customization request, typically paired with `extraFee`.',
  })
  @Prop()
  customizationNote?: string;

  @ApiPropertyOptional({
    example: 'Ships in 5-7 business days due to custom coloring',
    description: 'Custom Wigs only — a free-text note about this variant.',
  })
  @Prop()
  specialNote?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'Custom Wigs only — whether lace customization (bleached knots + tinted lace) is included.',
  })
  @Prop()
  laceCustomization?: string;

  @ApiPropertyOptional({
    example: 25,
    description:
      'Ready to Ship Wigs only — extra fee charged for the requested customization.',
  })
  @Prop({ default: 0 })
  extraFee?: number;

  @ApiPropertyOptional({
    example: 399.99,
    description: 'Lace Supply and Closures/Frontals — pre-discount price.',
  })
  @Prop()
  oldPrice?: number;

  @ApiPropertyOptional({
    example: 299.99,
    description:
      'Lace Supply and Closures/Frontals — current selling price for this variant. Ready to Ship Wigs and Custom Wigs price at the product level instead (see Product.price) and can leave this unset.',
  })
  @Prop()
  newPrice?: number;

  @ApiProperty({
    example: 12,
    description:
      'Units in stock. Not meaningful for Custom Wigs, which are made to order — leave at the default.',
  })
  @Prop({ default: 0 })
  inventoryCount: number;
}

export const ProductVariantSchema =
  SchemaFactory.createForClass(ProductVariant);
