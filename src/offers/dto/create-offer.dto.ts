import { Type, Transform } from 'class-transformer';
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

  @IsOptional()
  @IsString()
  image?: string;

  @Type(() => Number)
  @IsNumber()
  offerPrice!: number;

  @Transform(({ value }) => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch {
        // Not JSON, so treat it as a single value
      }

      return [value];
    }

    return [];
  })
  @IsArray()
  @IsMongoId({ each: true })
  variantIds!: string[];

  @Type(() => Date)
  @IsOptional()
  @IsDate()
  expirationDate?: Date;
}
