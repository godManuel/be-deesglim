import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const orderNumber = `ORD-${Date.now()}`;
    const order = new this.orderModel({
      userId: new Types.ObjectId(userId),
      orderNumber,
      status: 'PENDING',
      shippingAddress: createOrderDto.shippingAddress,
      items: createOrderDto.items,
      subtotal: createOrderDto.subtotal,
      taxTotal: createOrderDto.taxTotal,
      shippingTotal: createOrderDto.shippingTotal,
      discountTotal: createOrderDto.discountTotal,
      total: createOrderDto.total,
    });
    return order.save();
  }

  async findForUser(userId: string): Promise<Order[]> {
    return this.orderModel.find({ userId: new Types.ObjectId(userId) }).exec();
  }

  async findById(userId: string, orderId: string): Promise<Order> {
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        userId: new Types.ObjectId(userId),
      })
      .exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }
}
