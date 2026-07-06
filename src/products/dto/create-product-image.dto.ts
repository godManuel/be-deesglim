import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductImageDto {
  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Image URL',
  })
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    example: 'Front view',
    description: 'Image alternate text',
    required: false,
  })
  @IsOptional()
  altText?: string;

  @ApiProperty({ example: 0, description: 'Image sort order', required: false })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sortOrder?: number;
}
