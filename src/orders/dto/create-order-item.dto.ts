import { IsInt, IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  price: number;

  @IsInt()
  @Min(1)
  quantity: number;
}
