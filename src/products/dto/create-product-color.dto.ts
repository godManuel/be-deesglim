import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsNumber, Min } from 'class-validator';

export enum ColorType {
  TRANSPARENT = 'TRANSPARENT',
  BROWN = 'BROWN',
}

export class CreateProductColorDto {
  @ApiProperty({
    example: 'TRANSPARENT',
    enum: ColorType,
  })
  @IsNotEmpty()
  @IsEnum(ColorType)
  colorType: ColorType;

  @ApiProperty({
    example: 6,
    description: 'Quantity available for this color',
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  colorQuantity: number;
}
