import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@Req() request: any, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.create(request.user.id, createOrderDto);
  }

  @Get()
  findAll(@Req() request: any) {
    return this.ordersService.findForUser(request.user.id);
  }

  @Get(':id')
  findOne(@Req() request: any, @Param('id') id: string) {
    return this.ordersService.findById(request.user.id, id);
  }
}
