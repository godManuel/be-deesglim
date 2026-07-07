import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { TransactionsService } from './transactions.service';
import { TransactionsQueryDto } from './dto/transactions-query.dto';
import { TransactionsOverviewQueryDto } from './dto/transactions-overview-query.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get('dashboard/overview')
  @ApiOperation({
    summary: 'Get transactions overview cards',
    description:
      'Returns total revenue, average transaction value, pending payouts, and success rate for the selected period.',
  })
  @ApiResponse({ status: 200, description: 'Transactions overview loaded.' })
  getOverview(@Query() query: TransactionsOverviewQueryDto) {
    return this.transactionsService.getOverview(query);
  }

  @Get('export')
  @ApiOperation({
    summary: 'Export transactions statement',
    description:
      'Returns CSV statement content for filtered transactions in the selected period.',
  })
  @ApiResponse({ status: 200, description: 'Transactions statement exported.' })
  exportTransactions(@Query() query: TransactionsQueryDto) {
    return this.transactionsService.exportTransactions(query);
  }

  @Get('filters/options')
  @ApiOperation({
    summary: 'Get transactions filter options',
    description:
      'Returns status counts, payment methods, and amount range for transaction filters.',
  })
  @ApiResponse({ status: 200, description: 'Transaction filters loaded.' })
  getFilterOptions(@Query() query: TransactionsOverviewQueryDto) {
    return this.transactionsService.getFilterOptions(query);
  }

  @Get()
  @ApiOperation({
    summary: 'List transactions for admin table view',
    description:
      'Returns paginated transactions with status filters, payment method filters, amount range filters, and search.',
  })
  @ApiResponse({ status: 200, description: 'Transactions list loaded.' })
  listTransactions(@Query() query: TransactionsQueryDto) {
    return this.transactionsService.listTransactions(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get transaction details',
    description:
      'Returns full transaction details by transaction id or reference.',
  })
  @ApiResponse({ status: 200, description: 'Transaction details loaded.' })
  @ApiResponse({ status: 404, description: 'Transaction not found.' })
  getTransactionDetails(@Param('id') id: string) {
    return this.transactionsService.getTransactionDetails(id);
  }
}
