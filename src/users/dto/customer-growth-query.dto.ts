import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export class CustomerGrowthQueryDto {
  @ApiPropertyOptional({
    description: 'Number of months to include in the customer growth chart',
    example: 6,
    enum: [1, 6, 12],
    default: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn([1, 6, 12])
  months?: number = 6;
}
