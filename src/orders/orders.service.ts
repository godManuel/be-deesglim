import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const rawItemName = createOrderDto.items?.[0]?.name ?? 'order';
    const normalizedItemName = rawItemName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 30);
    const orderNumber = `ORD-${normalizedItemName}-${Date.now()}`;
    const order = new this.orderModel({
      userId: new Types.ObjectId(userId),
      orderNumber,
      status: OrderStatus.PENDING,
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

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().exec();
  }

  async findAdminOrders(query: ListOrdersQueryDto) {
    return this.findAdminOrdersByStatus(query.status, query);
  }

  async findDeliveredOrders(query: ListOrdersQueryDto) {
    return this.findAdminOrdersByStatus(OrderStatus.DELIVERED, query);
  }

  async findShippedOrders(query: ListOrdersQueryDto) {
    return this.findAdminOrdersByStatus(OrderStatus.SHIPPED, query);
  }

  async findPendingOrders(query: ListOrdersQueryDto) {
    return this.findAdminOrdersByStatus(OrderStatus.PENDING, query);
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

  async updateStatus(
    orderId: string,
    statusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.orderModel.findById(orderId).exec();
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.status = statusDto.status;
    return order.save();
  }

  private async findAdminOrdersByStatus(
    status: OrderStatus | undefined,
    query: ListOrdersQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<OrderDocument> = {};
    if (status) {
      filter.status = status;
    }

    const search = query.search?.trim();
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'items.name': { $regex: search, $options: 'i' } },
        { 'items.sku': { $regex: search, $options: 'i' } },
        { 'shippingAddress.firstName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.lastName': { $regex: search, $options: 'i' } },
        { 'shippingAddress.fullName': { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      filters: {
        status: status ?? null,
        search: search ?? null,
      },
    };
  }
}
