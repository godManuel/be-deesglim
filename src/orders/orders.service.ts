import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { FilterQuery, Model, Types, Connection, ClientSession } from 'mongoose';
import {
  Order,
  OrderDocument,
  OrderItem,
  OrderStatus,
} from './schemas/order.schema';
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
import { Product, ProductDocument } from 'src/products/schemas/product.schema';
import { ColorType } from 'src/products/enums/color-type.enum';
import { OfferDocument } from 'src/offers/schemas/offer.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import {
  ShippingDetails,
  ShippingDetailsDocument,
} from './schemas/shipping.schema';
import {
  DeliveryOption,
  DeliveryOptionDocument,
} from './schemas/delivery-option.schema';
import { DeliveryDetailsDto } from './dto/delivery-details.dto';
import { deliveryOptionsSeed } from './seeds/delivery-options.seed';
import { MailService } from 'src/mail/mail.service';
import { calculateVolumeDiscount } from './utils/volume-discount';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @InjectConnection()
    private readonly connection: Connection,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    @InjectModel(ShippingDetails.name)
    private readonly shippingDetailsModel: Model<ShippingDetailsDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
    @InjectModel(DeliveryOption.name)
    private readonly deliveryOptionModel: Model<DeliveryOptionDocument>,
    @InjectModel(PaymentTransaction.name)
    private readonly paymentTxModel: Model<PaymentTransactionDocument>,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
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

    // ---------------------------------------------------------
    // 1. Initialize Paystack payment
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // 2. Get user and populate saved shipping details
    // ---------------------------------------------------------
    const user = await this.userModel
      .findById(userId)
      .populate('shippingDetails')
      .exec();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // ---------------------------------------------------------
    // 3. Determine shipping details to use
    // ---------------------------------------------------------
    let shippingDetails;

    if (user.shippingDetails) {
      // User already has saved shipping details.
      // Use the existing saved shipping details.
      shippingDetails = user.shippingDetails;
    } else {
      // User doesn't have saved shipping details yet.
      // Create them from the checkout data.
      const newShippingDetails = await this.shippingDetailsModel.create({
        userId: new Types.ObjectId(userId),
        ...checkoutData.shippingAddress,
      });

      // Save the ShippingDetails document ID to the user
      user.shippingDetails = newShippingDetails._id;

      await user.save();

      // Use the newly created shipping details
      shippingDetails = newShippingDetails;
    }

    // ---------------------------------------------------------
    // 4. Create payment transaction
    // ---------------------------------------------------------
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
      shippingAddress: shippingDetails,
      items: checkoutData.items,
      deliveryDetails: checkoutData.deliveryDetails,
      extraNote: checkoutData.extraNote,
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

    const session = await this.connection.startSession();

    let order: OrderDocument;

    try {
      await session.withTransaction(async () => {
        transaction.status = PaymentTransactionStatus.SUCCESS;
        transaction.paystackStatus = paystackData.status;
        transaction.paystackChannel =
          paystackData.channel ?? transaction.paystackChannel;

        transaction.methodOfPayment = this.mapPaystackChannelToPaymentMethod(
          paystackData.channel ?? transaction.paystackChannel,
        );

        transaction.paidAt = new Date(paystackData.paid_at ?? Date.now());

        // 1. Create the order record (doesn't touch cart or stock yet).
        order = await this.createOrderFromTransaction(transaction, session);

        await this.decrementProductStock(order.items, session);

        // 3. Only after stock has been successfully decremented do we
        //    retire the cart. This is the actual "clear cart after verify"
        //    behavior you asked for.
        await this.cartModel
          .updateMany(
            { userId: transaction.userId, status: 'ACTIVE' },
            { $set: { status: 'ORDERED' } },
            { session },
          )
          .exec();

        transaction.orderId = order._id as Types.ObjectId;

        await transaction.save({ session });
      });

      // Send email AFTER successful database transaction

      const user = await this.userModel.findById(userId).select('email').exec();

      if (user?.email) {
        try {
          await this.mailService.sendOrderConfirmationEmail(user.email, order!);
        } catch (error) {
          this.logger.error(
            `Order ${order!.orderNumber} was created successfully, but confirmation email failed.`,
            error,
          );
        }
      }
    } finally {
      await session.endSession();
    }

    return {
      message: 'Payment verified and order created successfully.',
      order: order!,
      reference,
    };
  }

  async findAll(): Promise<Order[]> {
    return this.orderModel.find().populate('userId').exec();
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
      orders,
    ] = await Promise.all([
      this.orderModel.countDocuments().exec(),

      this.orderModel.countDocuments({ status: OrderStatus.DELIVERED }).exec(),

      this.orderModel.countDocuments({ status: OrderStatus.SHIPPED }).exec(),

      this.orderModel.countDocuments({ status: OrderStatus.PENDING }).exec(),

      this.orderModel.countDocuments({ status: OrderStatus.PAID }).exec(),

      this.orderModel.countDocuments({ status: OrderStatus.PROCESSING }).exec(),

      this.orderModel.countDocuments({ status: OrderStatus.CANCELLED }).exec(),

      this.orderModel.find().populate('userId').sort({ createdAt: -1 }).exec(),
    ]);

    return {
      totalOrders,
      deliveredOrders,
      shippedOrders,
      pendingOrders,
      paidOrders,
      processingOrders,
      cancelledOrders,
      orders,
    };
  }

  async findForUser(userId: string): Promise<Order[]> {
    return this.orderModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('items.images')
      .populate('shippingAddress')
      .exec();
  }

  async findById(userId: string, orderId: string): Promise<Order> {
    const order = await this.orderModel
      .findOne({
        _id: new Types.ObjectId(orderId),
        userId: new Types.ObjectId(userId),
      })
      .populate('items.images')
      .populate('shippingAddress')
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

    // Keep the previous status so we can check if it actually changed
    const previousStatus = order.status;

    // Update order status
    order.status = statusDto.status;

    // Save the updated order first
    const updatedOrder = await order.save();

    // Only send an email if the status actually changed
    if (previousStatus !== updatedOrder.status) {
      const user = await this.userModel
        .findById(updatedOrder.userId)
        .select('email')
        .lean()
        .exec();

      if (user?.email) {
        try {
          await this.mailService.sendOrderStatusUpdateEmail(
            user.email,
            updatedOrder.orderNumber,
            updatedOrder.status,
          );
        } catch (error) {
          // The order has already been successfully updated.
          // An email failure should not cause the update request to fail.
          this.logger.error(
            `Order ${updatedOrder.orderNumber} was updated successfully, but status update email failed.`,
            error,
          );
        }
      }
    }

    return updatedOrder;
  }

  private async decrementProductStock(
    orderItems: OrderItem[],
    session: ClientSession,
  ): Promise<void> {
    if (!orderItems?.length) {
      return;
    }

    for (const item of orderItems) {
      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new BadRequestException('Invalid quantity for order item.');
      }

      if (item.offerId && !item.productId) {
        continue;
      }

      if (!item.productId) {
        throw new BadRequestException('Order item is missing a productId.');
      }

      if (!item.color) {
        throw new BadRequestException(
          `Order item for product ${item.productId} is missing a color.`,
        );
      }

      const productId = new Types.ObjectId(item.productId);

      // ============================================================
      // 1. FIND THE LATEST PRODUCT
      // ============================================================

      const product = await this.productModel
        .findById(productId)
        .session(session)
        .exec();

      if (!product) {
        throw new BadRequestException(
          `Product ${item.productId} was not found.`,
        );
      }

      // ============================================================
      // 2. FIND THE SELECTED COLOR
      // ============================================================

      const selectedColor = product.color?.find(
        (productColor) => productColor.colorType === item.color,
      );

      if (!selectedColor) {
        throw new BadRequestException(
          `"${product.name}" is no longer available in the "${item.color}" color.`,
        );
      }

      // ============================================================
      // 3. VARIANT PRODUCT
      // ============================================================

      if (item.variantId) {
        // ----------------------------------------------------------
        // Find variant inside the selected color
        // ----------------------------------------------------------

        const selectedVariant = selectedColor.variants?.find(
          (variant: any) =>
            variant._id?.toString() === item.variantId?.toString(),
        );

        if (!selectedVariant) {
          throw new BadRequestException(
            `Product variant ${item.variantId} was not found in the "${item.color}" color of "${product.name}".`,
          );
        }

        // ----------------------------------------------------------
        // Get variant inventory
        // ----------------------------------------------------------

        const variantInventory = Number(selectedVariant.inventoryCount ?? 0);

        // ----------------------------------------------------------
        // Get color inventory
        // ----------------------------------------------------------

        const colorInventory = Number(selectedColor.colorQuantity ?? 0);

        // ----------------------------------------------------------
        // Check variant inventory
        // ----------------------------------------------------------

        if (quantity > variantInventory) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}" (${item.color}) ` +
              `selected variant. ` +
              `Available: ${variantInventory}, ` +
              `requested: ${quantity}.`,
          );
        }

        // ----------------------------------------------------------
        // Check color inventory
        // ----------------------------------------------------------

        if (quantity > colorInventory) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}" (${item.color}). ` +
              `Available: ${colorInventory}, ` +
              `requested: ${quantity}.`,
          );
        }

        // ==========================================================
        // DEDUCT FROM BOTH INVENTORIES
        // ==========================================================

        // Deduct from the selected variant
        selectedVariant.inventoryCount = variantInventory - quantity;

        // Deduct from the selected color
        selectedColor.colorQuantity = colorInventory - quantity;
      }

      // ============================================================
      // 4. PRODUCT WITHOUT VARIANT
      // ============================================================
      else {
        const colorInventory = Number(selectedColor.colorQuantity ?? 0);

        // ----------------------------------------------------------
        // Check color inventory
        // ----------------------------------------------------------

        if (quantity > colorInventory) {
          throw new BadRequestException(
            `Insufficient stock for "${product.name}" (${item.color}). ` +
              `Available: ${colorInventory}, requested: ${quantity}.`,
          );
        }

        // ----------------------------------------------------------
        // Deduct from color inventory
        // ----------------------------------------------------------

        selectedColor.colorQuantity = colorInventory - quantity;
      }

      // ============================================================
      // 5. SAVE PRODUCT
      // ============================================================

      await product.save({ session });
    }
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
        .populate('userId')
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
    const validatedDelivery = await this.validateDeliveryDetails(
      payload.deliveryDetails,
    );

    const cart = await this.cartModel
      .findOne({
        userId: new Types.ObjectId(userId),
        status: 'ACTIVE',
      })
      .populate({
        path: 'items.product',
        populate: {
          path: 'images',
        },
      })
      .populate('items.offer')
      .exec();

    if (!cart || !cart.items?.length) {
      throw new BadRequestException('Cannot checkout an empty cart.');
    }

    // ============================================================
    // 1. VALIDATE CART ITEMS AND INVENTORY
    // ============================================================

    for (const cartItem of cart.items as any[]) {
      const offer = cartItem.offer as OfferDocument | undefined;

      if (offer) {
        const requestedQuantity = Number(cartItem.quantity);

        if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
          throw new BadRequestException(
            `Invalid quantity for offer "${offer.name}".`,
          );
        }

        continue;
      }

      const product = cartItem.product as ProductDocument;

      if (!product) {
        throw new BadRequestException('Cart contains an invalid product.');
      }

      const requestedQuantity = Number(cartItem.quantity);

      if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
        throw new BadRequestException(
          `Invalid quantity for "${product.name}".`,
        );
      }

      // ----------------------------------------------------------
      // Variant selected
      // ----------------------------------------------------------

      if (cartItem.variant) {
        const variantId =
          cartItem.variant?._id?.toString?.() ?? cartItem.variant?.toString?.();

        if (!variantId) {
          throw new BadRequestException(
            `Invalid variant for "${product.name}".`,
          );
        }

        const selectedColor = product.color?.find((productColor: any) =>
          (productColor.variants ?? []).some(
            (variant: any) => variant?._id?.toString?.() === variantId,
          ),
        );

        if (!selectedColor) {
          throw new BadRequestException(
            `Product variant ${variantId} was not found for "${product.name}".`,
          );
        }

        const selectedVariant = selectedColor.variants?.find(
          (variant: any) => variant?._id?.toString?.() === variantId,
        );

        if (!selectedVariant) {
          throw new BadRequestException(
            `Product variant ${variantId} was not found for "${product.name}".`,
          );
        }

        // --------------------------------------------------------
        // Check variant inventory
        // --------------------------------------------------------

        const availableQuantity = Number(selectedVariant.inventoryCount ?? 0);

        if (requestedQuantity > availableQuantity) {
          throw new BadRequestException(
            `"${product.name}" (${cartItem.color}) only has ` +
              `${availableQuantity} item(s) remaining for the selected variant. ` +
              `Requested: ${requestedQuantity}.`,
          );
        }
      } else {
        // --------------------------------------------------------
        // No variant selected
        // Use color quantity
        // --------------------------------------------------------

        if (!cartItem.color) {
          throw new BadRequestException(
            `Cart item "${product.name}" is missing a color.`,
          );
        }

        const selectedColor = product.color?.find(
          (productColor: any) => productColor.colorType === cartItem.color,
        );

        if (!selectedColor) {
          throw new BadRequestException(
            `"${product.name}" is no longer available in the "${cartItem.color}" color.`,
          );
        }

        const availableQuantity = Number(selectedColor.colorQuantity ?? 0);

        if (requestedQuantity > availableQuantity) {
          throw new BadRequestException(
            `"${product.name}" (${cartItem.color}) only has ` +
              `${availableQuantity} item(s) remaining. ` +
              `Requested: ${requestedQuantity}.`,
          );
        }
      }
    }

    // ============================================================
    // 2. CREATE CHECKOUT SNAPSHOT
    // ============================================================

    const snapshotItems = cart.items.map((cartItem: any) => {
      const offer = cartItem.offer as OfferDocument | undefined;

      if (offer) {
        const quantity = Number(cartItem.quantity);

        if (!Number.isInteger(quantity) || quantity <= 0) {
          throw new BadRequestException(
            `Invalid quantity for offer "${offer.name}".`,
          );
        }

        const price = Number(offer.offerPrice ?? 0);

        if (!Number.isFinite(price) || price < 0) {
          throw new BadRequestException(
            `Offer "${offer.name}" has no valid price.`,
          );
        }

        return {
          offerId: offer._id.toString(),
          name: offer.name,
          price,
          quantity,
          images: offer.image ? [offer.image] : [],
        };
      }

      const product = cartItem.product as ProductDocument;

      if (!product) {
        throw new BadRequestException('Cart contains an invalid product.');
      }

      // ----------------------------------------------------------
      // Find selected variant
      // ----------------------------------------------------------

      let selectedVariant: any = undefined;
      let selectedColorType: ColorType | undefined = cartItem.color;

      let selectedColor: any = undefined;

      if (cartItem.variant) {
        const variantId =
          cartItem.variant?._id?.toString?.() ?? cartItem.variant?.toString?.();

        if (!variantId) {
          throw new BadRequestException(
            `Invalid variant for "${product.name}".`,
          );
        }

        selectedColor = product.color?.find((productColor: any) =>
          (productColor.variants ?? []).some(
            (variant: any) => variant?._id?.toString?.() === variantId,
          ),
        );

        if (!selectedColor) {
          throw new BadRequestException(
            `Selected variant was not found for "${product.name}".`,
          );
        }

        selectedVariant = selectedColor.variants?.find(
          (variant: any) => variant?._id?.toString?.() === variantId,
        );

        if (!selectedVariant) {
          throw new BadRequestException(
            `Selected variant was not found for "${product.name}".`,
          );
        }

        selectedColorType = selectedColor.colorType;
      } else {
        if (!cartItem.color) {
          throw new BadRequestException(
            `Cart item "${product.name}" is missing a color.`,
          );
        }

        selectedColor = product.color?.find(
          (productColor: any) => productColor.colorType === cartItem.color,
        );

        if (!selectedColor) {
          throw new BadRequestException(
            `"${product.name}" is no longer available in the "${cartItem.color}" color.`,
          );
        }

        selectedColorType = cartItem.color;
      }

      const price = Number(product.price ?? 0);

      if (!Number.isFinite(price) || price < 0) {
        throw new BadRequestException(
          `Product "${product.name}" has no valid price.`,
        );
      }

      const quantity = Number(cartItem.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new BadRequestException(
          `Invalid quantity for "${product.name}".`,
        );
      }

      return {
        productId: product._id.toString(),

        // The selected variant inside the selected color
        variantId: selectedVariant?._id?.toString(),

        // The selected color
        color: selectedColorType,

        // Product name
        name: product.name,
        // Snapshot unit price.
        price,

        // Requested quantity
        quantity,

        // Product images
        images: (product.images ?? []).map((image: any) => image.url),
      };
    });

    const subtotal = Number(cart.total ?? 0);

    if (!Number.isFinite(subtotal) || subtotal < 0) {
      throw new BadRequestException('Cart total is invalid.');
    }

    const itemCount = (cart.items ?? []).reduce((total, item: any) => {
      const quantity = Number(item?.quantity ?? 0);
      return total + (Number.isFinite(quantity) ? quantity : 0);
    }, 0);

    const volumeDiscount = calculateVolumeDiscount(itemCount, subtotal);

    const taxTotal = payload.taxTotal ?? 0;
    const shippingTotal = validatedDelivery.deliveryFee;
    const discountTotal = Number(
      (payload.discountTotal ?? 0) + volumeDiscount.discountAmount,
    );

    const total = subtotal + taxTotal + shippingTotal - discountTotal;

    if (total <= 0) {
      throw new BadRequestException(
        'Calculated order total must be greater than zero.',
      );
    }

    return {
      items: snapshotItems,
      shippingAddress: payload.shippingAddress,

      deliveryDetails: validatedDelivery,
      extraNote: payload.extraNote,

      subtotal,
      taxTotal,
      shippingTotal,
      discountTotal,
      volumeDiscount,

      total,

      // Paystack expects amount in kobo
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
    session: ClientSession,
  ): Promise<OrderDocument> {
    // Prevent duplicate orders for the same payment reference
    const existingOrder = await this.orderModel
      .findOne({
        paymentReference: transaction.reference,
      })
      .session(session)
      .exec();

    if (existingOrder) {
      return existingOrder;
    }

    // Generate order number from the first item
    const orderNumber = this.generateOrderNumber();

    const orderItems = transaction.items.map((item) => ({
      offerId: item.offerId,
      productId: item.productId,
      color: item.color,
      variantId: item.variantId,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      images: item.images,
    }));

    const order = new this.orderModel({
      userId: transaction.userId,
      orderNumber,
      paymentReference: transaction.reference,
      status: OrderStatus.PAID,
      shippingAddress: transaction.shippingAddress,

      deliveryDetails: transaction.deliveryDetails,
      extraNote: transaction.extraNote,

      // Save the complete checkout snapshot
      items: orderItems,

      subtotal: transaction.subtotal,
      taxTotal: transaction.taxTotal,
      shippingTotal: transaction.shippingTotal,
      discountTotal: transaction.discountTotal,
      total: transaction.total,
    });

    return order.save({ session });
  }

  private generateOrderNumber(): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

    return Array.from({ length: 6 }, () =>
      characters.charAt(Math.floor(Math.random() * characters.length)),
    ).join('');
  }

  private async validateDeliveryDetails(deliveryDetails: DeliveryDetailsDto) {
    if (!deliveryDetails) {
      throw new BadRequestException('Delivery details are required.');
    }

    const { deliveryPartner, deliveryType } = deliveryDetails;

    // Find the delivery partner
    const deliveryOption = await this.deliveryOptionModel.findOne({
      id: deliveryPartner,
      isActive: true,
    });

    if (!deliveryOption) {
      throw new BadRequestException(
        `Delivery partner "${deliveryPartner}" is not available.`,
      );
    }

    // Check if the delivery partner supports
    // the selected delivery type
    if (!deliveryOption.deliveryTypes.includes(deliveryType)) {
      throw new BadRequestException(
        `${deliveryOption.title} does not support "${deliveryType}".`,
      );
    }

    // Get the fee directly from the database
    const deliveryFee = deliveryOption.deliveryFees[deliveryType];

    if (deliveryFee === undefined || deliveryFee === null) {
      throw new BadRequestException(
        `No delivery fee has been configured for "${deliveryType}" with ${deliveryOption.title}.`,
      );
    }

    return {
      deliveryPartner,
      deliveryPartnerName: deliveryOption.title,
      deliveryType,
      deliveryFee,
    };
  }

  async seedDeliveryOptions() {
    for (const deliveryOption of deliveryOptionsSeed) {
      await this.deliveryOptionModel.updateOne(
        {
          id: deliveryOption.id,
        },
        {
          $set: deliveryOption,
        },
        {
          upsert: true,
        },
      );
    }

    return {
      message: 'Delivery options seeded successfully.',
    };
  }
}
