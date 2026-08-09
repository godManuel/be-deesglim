import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateShippingAddressDto } from './create-shipping-address.dto';
import { DeliveryDetailsDto } from './delivery-details.dto';

export class InitializeCheckoutDto {
  @ValidateNested()
  @Type(() => CreateShippingAddressDto)
  shippingAddress!: CreateShippingAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => DeliveryDetailsDto)
  deliveryDetails?: DeliveryDetailsDto;

  @IsOptional()
  @IsString()
  extraNote?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  taxTotal?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingTotal?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discountTotal?: number = 0;
}
