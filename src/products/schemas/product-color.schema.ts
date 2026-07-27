import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ColorType } from '../enums/color-type.enum';
import { ProductVariant, ProductVariantSchema } from './product-variant.schema';
import { Types } from 'mongoose';

@Schema({ _id: false })
export class ProductColor {
  @ApiProperty({
    example: 'Brown',
    enum: ColorType,
    description: 'The color type of the lace',
  })
  @Prop({
    required: true,
    enum: ColorType,
  })
  colorType: ColorType;

  @ApiProperty({
    example: 10,
    description: 'Available quantity for this color',
  })
  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  colorQuantity: number;

  @Prop({
    type: [ProductVariantSchema],
    default: [],
  })
  variants?: ProductVariant[];
}

export const ProductColorSchema = SchemaFactory.createForClass(ProductColor);
