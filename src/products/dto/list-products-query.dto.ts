import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ListProductsQueryDto {
  @ApiPropertyOptional({
    description:
      'Filter products by category name or slug. Supported values include Custom Wigs/custom-wigs, Lace Supply/lace-supply, and Closures/Frontals/closuresfrontals.',
    example: 'closures/frontals',
  })
  @IsOptional()
  @IsString()
  category?: string;
}
