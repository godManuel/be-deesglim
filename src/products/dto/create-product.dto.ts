import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CreateProductVariantDto } from './create-product-variant.dto';
import { CreateProductImageDto } from './create-product-image.dto';

export class CreateProductDto {
  @ApiProperty({
    example: 'Example Product',
    description: 'Product name',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'example-product',
    description: 'Product slug identifier',
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    example: 99.99,
    description: 'Base product price',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number = 0;

  @ApiPropertyOptional({
    example: 10,
    description: 'Available stock quantity for the product',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @ApiPropertyOptional({
    example: 'Natural Black',
    description: 'Color (required for Closures/Frontals and Custom Wigs).',
  })
  @IsOptional()
  @IsString({ each: true })
  color?: string[];

  @ApiPropertyOptional({
    example: 'This is the full product description.',
    description: 'Product description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Visible in the catalog',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isVisible?: boolean;

  @ApiPropertyOptional({
    example: false,
    description: 'Featured product flag',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  isFeatured?: boolean;

  @ApiPropertyOptional({
    example: 'library',
    description: 'Category slug or ID for the product',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    type: [CreateProductVariantDto],
    description: 'Product variants as a JSON array',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];

  @ApiPropertyOptional({
    type: [CreateProductImageDto],
    description: 'Manually provided image objects',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @ApiPropertyOptional({
    example: 'https://cdn.deesglim.com/guides/head-size-guide.pdf',
    description: 'PDF URL for the custom wig size guide.',
  })
  @IsOptional()
  @IsString()
  sizeGuidePdfUrl?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.deesglim.com/guides/skin-tone-guide.pdf',
    description: 'PDF URL for skin tone/tint shade guide.',
  })
  @IsOptional()
  @IsString()
  skinToneGuidePdfUrl?: string;

  @ApiPropertyOptional({
    example: 'High quality materials',
    description: 'Reasons to choose this variant',
  })
  @IsOptional()
  whyChoose?: string;

  @ApiPropertyOptional({
    example: 'Limited stock',
    description: 'Reasons not to choose this variant',
  })
  @IsOptional()
  whyNotChoose?: string;
}
