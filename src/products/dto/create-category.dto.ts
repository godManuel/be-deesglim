import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { CategoryName } from '../schemas/category.schema';

export class CreateCategoryDto {
  @ApiProperty({
    example: CategoryName.CUSTOM_WIGS,
    description: 'Category name chosen from predefined category types',
    enum: CategoryName,
  })
  @IsNotEmpty()
  @IsEnum(CategoryName)
  name: CategoryName;
}
