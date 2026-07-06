import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductVariantDto {
  @ApiProperty({
    example: 'SKU-1234',
    description: 'Unique SKU for the variant',
  })
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Black', description: 'Product color' })
  @IsNotEmpty()
  color: string;

  @ApiProperty({ example: 'M', description: 'Variant length or size' })
  @IsNotEmpty()
  length: string;

  @ApiProperty({ example: 'Smooth', description: 'Variant texture' })
  @IsNotEmpty()
  texture: string;

  @ApiProperty({
    example: 'Standard',
    description: 'Cap type for the variant',
    required: false,
  })
  @IsOptional()
  capType?: string;

  @ApiProperty({ example: 99.99, description: 'Variant price' })
  @Type(() => Number)
  @IsNumber()
  price: number;

  @ApiProperty({
    example: 10,
    description: 'Available inventory count',
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  inventoryCount?: number;
}
