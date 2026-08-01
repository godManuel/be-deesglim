import { Type } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsArray,
  IsMongoId,
  IsDate,
  IsOptional,
} from 'class-validator';

export class CreateOfferDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsString()
  image!: string;

  @Type(() => Number)
  @IsNumber()
  offerPrice!: number;

  @IsArray()
  @IsMongoId({
    each: true,
  })
  variantIds!: string[];

  @Type(() => Date)
  @IsOptional()
  @IsDate()
  expirationDate?: Date;
}
