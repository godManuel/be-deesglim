import { IsInt, IsNotEmpty, IsPositive, IsUUID } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  variantId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}
