import { IsEnum, IsNumber, IsString } from 'class-validator';
import { DeliveryType } from '../enums/delivery-type.enum';
import { DeliveryPartner } from '../enums/delivery-partners.enum';

export class DeliveryDetailsDto {
  @IsEnum(DeliveryPartner)
  deliveryPartner!: DeliveryPartner;

  @IsEnum(DeliveryType)
  deliveryType!: DeliveryType;
}
