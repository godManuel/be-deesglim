import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductVariantDto {
  @ApiPropertyOptional({ example: 'Black', description: 'Product color' })
  @IsOptional()
  color?: string;

  @ApiPropertyOptional({ example: 'M', description: 'Variant length or size' })
  @IsOptional()
  length?: string;

  @ApiPropertyOptional({ example: 'Smooth', description: 'Variant texture' })
  @IsOptional()
  texture?: string;

  @ApiPropertyOptional({
    example: 'Standard',
    description: 'Cap type for the variant',
  })
  @IsOptional()
  capType?: string;

  @ApiPropertyOptional({
    example: '5x5',
    description: 'Lace Supply and Custom Wigs — lace size, e.g. "5x5".',
  })
  @IsOptional()
  laceSize?: string;

  @ApiPropertyOptional({
    example: 'Swiss',
    description: 'Lace type for the variant',
  })
  @IsOptional()
  laceType?: string;

  @ApiPropertyOptional({
    example: '4x4',
    description: 'Closure size for the variant',
  })
  @IsOptional()
  closureSize?: string;

  @ApiPropertyOptional({
    example: '13x4',
    description: 'Frontal size for the variant',
  })
  @IsOptional()
  frontalSize?: string;

  @ApiPropertyOptional({
    example: 22.5,
    description: 'Head circumference measurement in inches',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  headSize?: number;

  @ApiPropertyOptional({
    example: 'Middle',
    description: 'Parting style for the variant',
  })
  @IsOptional()
  parting?: string;

  @ApiPropertyOptional({
    example: 'Curly',
    description: 'Styling for the variant',
  })
  @IsOptional()
  styling?: string;

  @ApiPropertyOptional({
    example: 'Human',
    description: 'Hair type for the variant',
  })
  @IsOptional()
  hairType?: string;

  @ApiPropertyOptional({
    example: 'Please make it extra soft',
    description: 'Customization note for the variant',
  })
  @IsOptional()
  customizationNote?: string;

  @ApiPropertyOptional({
    example: 'Handle with care',
    description: 'Special note for the variant',
  })
  @IsOptional()
  specialNote?: string;

  @ApiPropertyOptional({
    example: 'Custom lace pattern',
    description: 'Lace customization for the variant',
  })
  @IsOptional()
  laceCustomization?: string;

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

  @ApiPropertyOptional({
    example: 5,
    description: 'Additional fee for the variant',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  extraFee?: number;

  @ApiPropertyOptional({
    example: 99.99,
    description: 'Original price of the variant',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  oldPrice?: number;

  @ApiPropertyOptional({
    example: 79.99,
    description: 'Discounted price of the variant',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  newPrice?: number;

  @ApiPropertyOptional({
    example: 10,
    description: 'Available inventory count',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  inventoryCount?: number;
}
