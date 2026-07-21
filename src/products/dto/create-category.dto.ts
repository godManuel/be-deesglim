import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { ProductType } from '../schemas/category.schema';

export class CreateCategoryDto {
  @ApiProperty({
    example: ProductType.CUSTOM_MADE,
    description: 'Category name chosen from predefined category types',
    enum: ProductType,
  })
  @IsNotEmpty()
  @IsEnum(ProductType)
  name: ProductType;
}
