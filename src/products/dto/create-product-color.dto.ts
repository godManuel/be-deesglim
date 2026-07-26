import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, Min } from 'class-validator';
import { ColorType } from '../enums/color-type.enum';

export class CreateProductColorDto {
  @ApiProperty({
    enum: ColorType,
    example: ColorType.BROWN,
  })
  @IsNotEmpty()
  @IsEnum(ColorType)
  colorType: ColorType;

  @ApiProperty({
    example: 1,
    description: 'Available quantity for this color',
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  colorQuantity: number;
}
