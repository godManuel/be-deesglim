import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsNumber,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProductVariantDto } from './create-product-variant.dto';
import { CreateProductImageDto } from './create-product-image.dto';

export class CreateProductDto {
  @ApiProperty({ example: 'Example Product', description: 'Product name' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'example-product',
    description: 'Product slug identifier',
    required: false,
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiProperty({
    example: 99.99,
    description: 'Base product price',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price? = 0;

  @ApiProperty({
    example: 'Natural Black',
    description: 'Color (required for Closures/Frontals and Custom Wigs).',
    required: false,
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({
    example: 'This is the full product description.',
    description: 'Product description',
    required: false,
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: true,
    description: 'Visible in the catalog',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @ApiProperty({
    example: false,
    description: 'Featured product flag',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({
    example: 'library',
    description: 'Category slug or id for the product',
  })
  @IsNotEmpty()
  @IsString()
  category = '';

  @ApiProperty({ type: [CreateProductVariantDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];

  @ApiProperty({ type: [CreateProductImageDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];

  @ApiProperty({
    required: false,
    example: 'https://cdn.deesglim.com/guides/head-size-guide.pdf',
    description: 'PDF URL for the custom wig size guide.',
  })
  @IsOptional()
  @IsString()
  sizeGuidePdfUrl?: string;

  @ApiProperty({
    required: false,
    example: 'https://cdn.deesglim.com/guides/skin-tone-guide.pdf',
    description: 'PDF URL for skin tone/tint shade guide.',
  })
  @IsOptional()
  @IsString()
  skinToneGuidePdfUrl?: string;
}
