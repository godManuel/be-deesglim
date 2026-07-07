import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class InventoryAlertsQueryDto {
  @ApiPropertyOptional({
    description: 'Maximum number of inventory alerts to return',
    example: 6,
    default: 6,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 6;
}
