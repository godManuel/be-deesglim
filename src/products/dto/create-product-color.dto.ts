import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ColorType } from '../schemas/product-color.schema';

export class CreateProductColorDto {
  @ApiProperty({
    example: 'Brown',
    enum: ColorType,
    description: 'The color type',
  })
  @IsNotEmpty()
  @IsEnum(ColorType)
  colorType: ColorType;

  @ApiProperty({
    example: 10,
    description: 'Available quantity for this color',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  colorQuantity: number;
}
