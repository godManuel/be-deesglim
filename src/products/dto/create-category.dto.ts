import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics', description: 'Category name' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    example: 'electronics',
    description: 'Category slug identifier',
  })
  @IsNotEmpty()
  @IsString()
  slug: string;
}
