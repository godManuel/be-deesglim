import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { ColorType } from '../enums/color-type.enum';
import { CreateProductVariantDto } from './create-product-variant.dto';

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
  @IsNumber()
  @Min(0)
  colorQuantity: number;

  @ApiPropertyOptional({
    type: [CreateProductVariantDto],
    description: 'Variants available for this color',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];
}
