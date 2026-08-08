import {
  ValidateIf,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { ColorType } from 'src/products/enums/color-type.enum';

export class AddCartItemDto {
  @IsOptional()
  @IsString()
  offerId?: string;

  @ValidateIf((dto) => !dto.offerId)
  @IsString()
  productId?: string;

  @ValidateIf((dto) => !dto.offerId)
  @IsInt()
  @IsPositive()
  quantity?: number;

  @ValidateIf((dto) => !dto.offerId)
  @IsString()
  @IsOptional()
  variantId?: string;

  @ValidateIf((dto) => !dto.offerId)
  @IsEnum(ColorType)
  color?: ColorType;
}
