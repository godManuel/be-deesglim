import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { DashboardService } from './dashboard.service';
import { DashboardQueryDto } from './dto/dashboard-query.dto';
import { RecentActivityQueryDto } from './dto/recent-activity-query.dto';
import { InventoryAlertsQueryDto } from './dto/inventory-alerts-query.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @ApiOperation({
    summary: 'Get admin dashboard overview',
    description:
      'Returns executive overview metrics, sales performance, recent activity, and inventory alerts.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard overview retrieved successfully.',
  })
  getOverview(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getOverview(query);
  }

  @Get('sales-performance')
  @ApiOperation({
    summary: 'Get dashboard sales performance',
    description:
      'Returns revenue trend and category performance for the selected period.',
  })
  @ApiResponse({
    status: 200,
    description: 'Sales performance retrieved successfully.',
  })
  getSalesPerformance(@Query() query: DashboardQueryDto) {
    return this.dashboardService.getSalesPerformance(query);
  }

  @Get('recent-activity')
  @ApiOperation({
    summary: 'Get dashboard recent activity',
    description:
      'Returns latest order and user activity items for the admin dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Recent activity retrieved successfully.',
  })
  getRecentActivity(@Query() query: RecentActivityQueryDto) {
    return this.dashboardService.getRecentActivity(query);
  }

  @Get('inventory-alerts')
  @ApiOperation({
    summary: 'Get dashboard inventory alerts',
    description: 'Returns low-stock inventory alerts for the admin dashboard.',
  })
  @ApiResponse({
    status: 200,
    description: 'Inventory alerts retrieved successfully.',
  })
  getInventoryAlerts(@Query() query: InventoryAlertsQueryDto) {
    return this.dashboardService.getInventoryAlerts(query);
  }
}
