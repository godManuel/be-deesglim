import {
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class AddCartItemDto {
  @IsString()
  productId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}
