import { IsInt, IsNotEmpty, IsPositive, IsUUID } from 'class-validator';

export class AddCartItemDto {
  @IsUUID()
  productId: string;

  @IsInt()
  @IsPositive()
  quantity: number;
}
