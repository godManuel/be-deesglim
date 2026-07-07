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
import {
  CustomWigDensityOption,
  CustomWigType,
  LaceTintShade,
  LaceType,
} from '../schemas/product.schema';

export class CreateProductDto {
  @ApiProperty({ example: 'Example Product', description: 'Product name' })
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'example-product',
    description: 'Product slug identifier',
  })
  @IsNotEmpty()
  slug: string;

  @ApiProperty({
    example: 99.99,
    description: 'Base product price',
  })
  @IsNotEmpty()
  @Type(() => Number)
  @IsNumber()
  price: number;

  @ApiProperty({
    example: '5x5',
    description: 'Lace size (required for Closures/Frontals and Custom Wigs).',
    required: false,
  })
  @IsOptional()
  @IsString()
  laceSize?: string;

  @ApiProperty({
    example: '20 inches',
    description: 'Length (required for Closures/Frontals and Custom Wigs).',
    required: false,
  })
  @IsOptional()
  @IsString()
  length?: string;

  @ApiProperty({
    example: 'Natural Black',
    description: 'Color (required for Closures/Frontals and Custom Wigs).',
    required: false,
  })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({
    example: 5,
    description: 'Quantity (required for Closures/Frontals).',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  quantity?: number;

  @ApiProperty({
    example: 399.99,
    description: 'Old price (required for Closures/Frontals).',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  oldPrice?: number;

  @ApiProperty({
    example: 299.99,
    description: 'New price (required for Closures/Frontals).',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  newPrice?: number;

  @ApiProperty({
    example: 22.5,
    description: 'Head size (required for Custom Wigs).',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  headSize?: number;

  @ApiProperty({
    example: 300,
    description: 'Grams (required for Custom Wigs).',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  grams?: number;

  @ApiProperty({
    example: 'This is the full product description.',
    description: 'Product description',
    required: false,
  })
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'Short product description',
    description: 'Short product summary',
    required: false,
  })
  @IsOptional()
  shortDescription?: string;

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
  category: string;

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
    enum: CustomWigType,
    required: false,
    description:
      'Custom wig mode. READY_TO_SHIP is uploaded by admin; MAKE_FROM_SCRATCH is configured by users.',
  })
  @IsOptional()
  customWigType?: CustomWigType;

  @ApiProperty({
    type: [String],
    required: false,
    example: ['4x4', '5x5', '13x4'],
    description: 'Available lace size variants for custom wig.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  laceSizes?: string[];

  @ApiProperty({
    type: [String],
    enum: LaceType,
    required: false,
    description: 'Available lace types.',
  })
  @IsOptional()
  @IsArray()
  laceTypes?: LaceType[];

  @ApiProperty({
    type: [String],
    required: false,
    example: ['12 inches', '14 inches', '16 inches'],
    description: 'Available length variants.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lengthOptions?: string[];

  @ApiProperty({
    type: [String],
    enum: CustomWigDensityOption,
    required: false,
    description: 'Available density options.',
  })
  @IsOptional()
  @IsArray()
  densityOptions?: CustomWigDensityOption[];

  @ApiProperty({
    type: [Number],
    required: false,
    example: [21, 21.5, 22, 22.5, 23, 24],
    description: 'Available head sizes.',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsNumber({}, { each: true })
  headSizes?: number[];

  @ApiProperty({
    type: [String],
    required: false,
    example: ['Natural Black', 'Chocolate Brown'],
    description: 'Available color options.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  colors?: string[];

  @ApiProperty({
    required: false,
    example: false,
    description:
      'Allow users to choose any color (set true for make-from-scratch custom wigs).',
  })
  @IsOptional()
  @IsBoolean()
  allowAnyColor?: boolean;

  @ApiProperty({
    required: false,
    example: true,
    description:
      'Whether lace customization is available (bleached knots and tinted lace).',
  })
  @IsOptional()
  @IsBoolean()
  laceCustomizationAvailable?: boolean;

  @ApiProperty({
    type: [String],
    enum: LaceTintShade,
    required: false,
    description: 'Available tint shades for lace customization.',
  })
  @IsOptional()
  @IsArray()
  laceTintShades?: LaceTintShade[];

  @ApiProperty({
    type: [String],
    required: false,
    example: ['Straight', 'Body Wave', 'Curly'],
    description:
      'Texture options (required for make-from-scratch custom wigs).',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  textureOptions?: string[];

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
