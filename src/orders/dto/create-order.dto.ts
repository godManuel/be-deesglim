import { IsArray, IsNotEmpty, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { CreateShippingAddressDto } from './create-shipping-address.dto';

export class CreateOrderDto {
  @ValidateNested()
  @Type(() => CreateShippingAddressDto)
  shippingAddress: CreateShippingAddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @IsNumber()
  subtotal: number;

  @IsNumber()
  taxTotal: number;

  @IsNumber()
  shippingTotal: number;

  @IsNumber()
  discountTotal: number;

  @IsNumber()
  total: number;
}
