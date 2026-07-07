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
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { InitializeCheckoutDto } from './dto/initialize-checkout.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Orders')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout/initialize')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initialize checkout payment',
    description:
      'Initializes a Paystack transaction for the authenticated user based on the active cart.',
  })
  @ApiBody({ type: InitializeCheckoutDto })
  @ApiResponse({
    status: 201,
    description:
      'Checkout initialized successfully and authorization URL returned.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Invalid cart/checkout payload or Paystack initialization failed.',
  })
  initializeCheckout(
    @Req() request: any,
    @Body() initializeCheckoutDto: InitializeCheckoutDto,
  ) {
    return this.ordersService.initializeCheckout(
      request.user.id,
      request.user.email,
      initializeCheckoutDto,
    );
  }

  @Post('checkout/verify')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify checkout payment',
    description:
      'Verifies a Paystack transaction reference and creates an order when payment is successful.',
  })
  @ApiBody({ type: VerifyPaymentDto })
  @ApiResponse({
    status: 201,
    description: 'Payment verified successfully and order created.',
  })
  @ApiResponse({
    status: 400,
    description: 'Payment verification failed or payment not successful.',
  })
  @ApiResponse({
    status: 404,
    description: 'Checkout transaction reference not found for the user.',
  })
  verifyCheckout(
    @Req() request: any,
    @Body() verifyPaymentDto: VerifyPaymentDto,
  ) {
    return this.ordersService.verifyCheckout(
      request.user.id,
      verifyPaymentDto.reference,
    );
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query() query: ListOrdersQueryDto) {
    return this.ordersService.findAdminOrders(query);
  }

  @Get('dashboard/stats')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  dashboardStats() {
    return this.ordersService.getDashboardStats();
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
