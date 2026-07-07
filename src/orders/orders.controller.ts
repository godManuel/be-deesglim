import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import { ApiBearerAuth } from '@nestjs/swagger';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() request: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(request.user.id, createOrderDto);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.findAdminOrders(query);
  }

  @Get('delivered')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findDelivered(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.findDeliveredOrders(query);
  }

  @Get('shipped')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findShipped(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.findShippedOrders(query);
  }

  @Get('pending')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findPending(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.findPendingOrders(query);
  }

  @Get('user/:userId')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  async findForUserId(@Req() request: any, @Param('userId') userId: string) {
    const requester = request.user;
    if (requester.role !== UserRole.ADMIN && requester.id !== userId) {
      throw new ForbiddenException('Not authorized to view these orders');
    }
    return this.ordersService.findForUser(userId);
  }

  @Get(':id')
  findOne(@Req() request: any, @Param('id') id: string) {
    return this.ordersService.findById(request.user.id, id);
  }

  @Patch(':id/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateStatus(
    @Param('id') id: string,
    @Body() statusDto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, statusDto);
  }
}
