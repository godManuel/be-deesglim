import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { ColorType } from 'src/products/enums/color-type.enum';

export class AddCartItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @IsPositive()
  quantity: number;

  @IsString()
  @IsOptional()
  variantId?: string;

  @IsNotEmpty()
  @IsEnum(ColorType)
  color: ColorType;
}
