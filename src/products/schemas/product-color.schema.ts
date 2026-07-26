import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum ColorType {
  TRANSPARENT = 'Transparent',
  BROWN = 'Brown',
}

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
}

export const ProductColorSchema = SchemaFactory.createForClass(ProductColor);
