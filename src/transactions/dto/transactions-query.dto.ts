import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export const transactionStatusFilterValues = [
  'ALL',
  'COMPLETED',
  'PENDING',
  'FAILED',
  'REFUNDED',
] as const;

export type TransactionStatusFilter =
  (typeof transactionStatusFilterValues)[number];

export class TransactionsQueryDto {
  @ApiPropertyOptional({
    enum: transactionStatusFilterValues,
    description: 'Status filter for admin transaction listing.',
    default: 'ALL',
  })
  @IsOptional()
  @IsIn(transactionStatusFilterValues)
  status?: TransactionStatusFilter;

  @ApiPropertyOptional({
    description: 'Payment channel filter, for example card, bank, ussd, qr.',
    example: 'card',
  })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional({
    description: 'Minimum transaction amount in major currency units.',
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Maximum transaction amount in major currency units.',
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;

  @ApiPropertyOptional({
    description: 'Search by reference, order number, customer name, or email.',
    example: 'TR-88291',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Time window in days counted backward from now.',
    default: 30,
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(365)
  days?: number;

  @ApiPropertyOptional({
    description: 'Page number for pagination.',
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page.',
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
