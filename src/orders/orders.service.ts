import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schema';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ListOrdersQueryDto } from './dto/list-orders-query.dto';
import { InitializeCheckoutDto } from './dto/initialize-checkout.dto';
import {
  PaymentMethod,
  PaymentTransaction,
  PaymentTransactionDocument,
  PaymentTransactionStatus,
} from './schemas/payment-transaction.schema';
import { Cart, CartDocument } from '../cart/schemas/cart.schema';
import {
  ProductVariant,
  ProductVariantDocument,
} from '../products/schemas/product-variant.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(PaymentTransaction.name)
    private readonly paymentTxModel: Model<PaymentTransactionDocument>,
    private readonly configService: ConfigService,
  ) {}

  async initializeCheckout(
    userId: string,
    email: string,
    payload: InitializeCheckoutDto,
  ) {
    const checkoutData = await this.buildCheckoutFromActiveCart(
      userId,
      payload,
    );
    const paystackSecret = this.configService.get<string>(
      'PAYSTACK_SECRET_KEY',
    );

    if (!paystackSecret) {
      throw new InternalServerErrorException(
        'Paystack secret key is not configured.',
      );
    }

    const reference = this.generatePaystackReference(userId);
    const callbackUrl = this.configService.get<string>('PAYSTACK_CALLBACK_URL');

    const initializeResponse = await fetch(
      'https://api.paystack.co/transaction/initialize',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          amount: checkoutData.amountKobo,
          reference,
          callback_url: callbackUrl,
          metadata: {
            userId,
            source: 'deesglim-checkout',
          },
        }),
      },
    );

    const initializeJson = (await initializeResponse.json()) as any;
    if (!initializeResponse.ok || !initializeJson?.status) {
      throw new BadRequestException(
        initializeJson?.message ??
          'Unable to initialize payment with Paystack.',
      );
    }

    const transaction = new this.paymentTxModel({
      userId: new Types.ObjectId(userId),
      reference,
      status: PaymentTransactionStatus.INITIATED,
      methodOfPayment: PaymentMethod.UNKNOWN,
      amountKobo: checkoutData.amountKobo,
      subtotal: checkoutData.subtotal,
      taxTotal: checkoutData.taxTotal,
      shippingTotal: checkoutData.shippingTotal,
      discountTotal: checkoutData.discountTotal,
      total: checkoutData.total,
      shippingAddress: checkoutData.shippingAddress,
      items: checkoutData.items,
      paystackAccessCode: initializeJson.data?.access_code,
      paystackAuthorizationUrl: initializeJson.data?.authorization_url,
      paystackStatus: initializeJson.data?.status ?? 'initialized',
    });
    await transaction.save();

    return {
      reference,
      authorizationUrl: initializeJson.data?.authorization_url,
      accessCode: initializeJson.data?.access_code,
      amountKobo: checkoutData.amountKobo,
      amount: checkoutData.total,
    };
  }

  async verifyCheckout(userId: string, reference: string) {
    const transaction = await this.paymentTxModel
      .findOne({ reference, userId: new Types.ObjectId(userId) })
      .exec();

    if (!transaction) {
      throw new NotFoundException('Checkout transaction not found.');
    }

    if (
      transaction.status === PaymentTransactionStatus.SUCCESS &&
      transaction.orderId
    ) {
      const existingOrder = await this.orderModel
        .findById(transaction.orderId)
        .exec();
      if (existingOrder) {
        return {
          message: 'Payment already verified for this reference.',
          order: existingOrder,
          reference,
        };
      }
    }

    const paystackSecret = this.configService.get<string>(
      'PAYSTACK_SECRET_KEY',
    );
    if (!paystackSecret) {
      throw new InternalServerErrorException(
        'Paystack secret key is not configured.',
      );
    }

    const verifyResponse = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecret}`,
        },
      },
    );

    const verifyJson = (await verifyResponse.json()) as any;
    const paystackData = verifyJson?.data;

    if (!verifyResponse.ok || !verifyJson?.status) {
      transaction.status = PaymentTransactionStatus.FAILED;
      transaction.paystackStatus = paystackData?.status ?? 'verify_failed';
      await transaction.save();
      throw new BadRequestException(
        verifyJson?.message ?? 'Unable to verify payment with Paystack.',
      );
    }

    if (paystackData?.status !== 'success') {
      transaction.status = PaymentTransactionStatus.FAILED;
      transaction.paystackStatus = paystackData?.status ?? 'failed';
      await transaction.save();
      throw new BadRequestException(
        'Payment has not been completed successfully.',
      );
    }

    if (paystackData?.amount !== transaction.amountKobo) {
      transaction.status = PaymentTransactionStatus.FAILED;
      transaction.paystackStatus = 'amount_mismatch';
      await transaction.save();
      throw new BadRequestException('Payment amount mismatch detected.');
    }

    transaction.status = PaymentTransactionStatus.SUCCESS;
    transaction.paystackStatus = paystackData.status;
    transaction.paystackChannel =
      paystackData.channel ?? transaction.paystackChannel;
    transaction.methodOfPayment = this.mapPaystackChannelToPaymentMethod(
      paystackData.channel ?? transaction.paystackChannel,
    );
    transaction.paidAt = new Date(paystackData.paid_at ?? Date.now());

    const order = await this.createOrderFromTransaction(transaction);
    transaction.orderId = order._id as Types.ObjectId;
    await transaction.save();

    return {
      message: 'Payment verified and order created successfully.',
      order,
      reference,
    };
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().exec();
  }

  async findAdminOrders(query: ListOrdersQueryDto) {
    return this.findAdminOrdersByStatus(query.status, query);
  }

  async getDashboardStats() {
    const [
      totalOrders,
      deliveredOrders,
      shippedOrders,
      pendingOrders,
      paidOrders,
      processingOrders,
      cancelledOrders,
    ] = await Promise.all([
      this.orderModel.countDocuments().exec(),
      this.orderModel.countDocuments({ status: OrderStatus.DELIVERED }).exec(),
      this.orderModel.countDocuments({ status: OrderStatus.SHIPPED }).exec(),
      this.orderModel.countDocuments({ status: OrderStatus.PENDING }).exec(),
      this.orderModel.countDocuments({ status: OrderStatus.PAID }).exec(),
      this.orderModel.countDocuments({ status: OrderStatus.PROCESSING }).exec(),
      this.orderModel.countDocuments({ status: OrderStatus.CANCELLED }).exec(),
    ]);

    return {
      totalOrders,
      deliveredOrders,
      shippedOrders,
      pendingOrders,
      paidOrders,
      processingOrders,
      cancelledOrders,
    };
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

  private async buildCheckoutFromActiveCart(
    userId: string,
    payload: InitializeCheckoutDto,
  ) {
    const cart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'ACTIVE' })
      .populate('items.variant')
      .exec();

    if (!cart || !cart.items?.length) {
      throw new BadRequestException('Cannot checkout an empty cart.');
    }

    const snapshotItems = cart.items.map((cartItem: any) => {
      const variant = cartItem.variant as ProductVariantDocument;
      if (!variant || variant.price === undefined || variant.price === null) {
        throw new BadRequestException(
          'Cart contains an invalid variant with missing price.',
        );
      }

      return {
        productVariantId: variant._id.toString(),
        name: (variant as any).name ?? variant.sku,
        sku: variant.sku,
        price: Number(variant.price),
        quantity: Number(cartItem.quantity),
      };
    });

    const subtotal = snapshotItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const taxTotal = payload.taxTotal ?? 0;
    const shippingTotal = payload.shippingTotal ?? 0;
    const discountTotal = payload.discountTotal ?? 0;
    const total = subtotal + taxTotal + shippingTotal - discountTotal;

    if (total <= 0) {
      throw new BadRequestException(
        'Calculated order total must be greater than zero.',
      );
    }

    return {
      items: snapshotItems,
      shippingAddress: payload.shippingAddress,
      subtotal,
      taxTotal,
      shippingTotal,
      discountTotal,
      total,
      amountKobo: Math.round(total * 100),
    };
  }

  private generatePaystackReference(userId: string) {
    const uniqueSuffix = new Types.ObjectId().toString().slice(-8);
    return `PSK-${userId.slice(-6)}-${Date.now()}-${uniqueSuffix}`;
  }

  private mapPaystackChannelToPaymentMethod(channel?: string): PaymentMethod {
    const normalized = channel?.trim().toLowerCase();

    switch (normalized) {
      case 'card':
        return PaymentMethod.CARD;
      case 'bank':
        return PaymentMethod.BANK;
      case 'ussd':
        return PaymentMethod.USSD;
      case 'qr':
        return PaymentMethod.QR;
      case 'mobile_money':
      case 'mobile money':
        return PaymentMethod.MOBILE_MONEY;
      case 'bank_transfer':
      case 'bank transfer':
      case 'transfer':
        return PaymentMethod.BANK_TRANSFER;
      case 'eft':
        return PaymentMethod.EFT;
      case 'payattitude':
        return PaymentMethod.PAYATTITUDE;
      case 'apple_pay':
      case 'apple pay':
        return PaymentMethod.APPLE_PAY;
      default:
        return PaymentMethod.UNKNOWN;
    }
  }

  private async createOrderFromTransaction(
    transaction: PaymentTransactionDocument,
  ): Promise<OrderDocument> {
    const existingOrder = await this.orderModel
      .findOne({ paymentReference: transaction.reference })
      .exec();
    if (existingOrder) {
      return existingOrder;
    }

    const firstItemName = transaction.items[0]?.name ?? 'order';
    const normalizedItemName = firstItemName
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .substring(0, 30);

    const orderNumber = `ORD-${normalizedItemName}-${Date.now()}`;

    const order = new this.orderModel({
      userId: transaction.userId,
      orderNumber,
      paymentReference: transaction.reference,
      status: OrderStatus.PAID,
      shippingAddress: transaction.shippingAddress,
      items: transaction.items,
      subtotal: transaction.subtotal,
      taxTotal: transaction.taxTotal,
      shippingTotal: transaction.shippingTotal,
      discountTotal: transaction.discountTotal,
      total: transaction.total,
    });

    const savedOrder = await order.save();
    await this.cartModel
      .updateMany(
        { userId: transaction.userId, status: 'ACTIVE' },
        { $set: { status: 'ORDERED' } },
      )
      .exec();

    return savedOrder;
  }
}
