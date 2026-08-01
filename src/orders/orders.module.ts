import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schema';
import { Product, ProductSchema } from 'src/products/schemas/product.schema';
import { Cart, CartSchema } from '../cart/schemas/cart.schema';
import {
  ProductVariant,
  ProductVariantSchema,
} from '../products/schemas/product-variant.schema';
import {
  PaymentTransaction,
  PaymentTransactionSchema,
} from './schemas/payment-transaction.schema';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import {
  ShippingDetails,
  ShippingDetailsSchema,
} from './schemas/shipping.schema';
import {
  DeliveryOption,
  DeliveryOptionSchema,
} from './schemas/delivery-option.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Cart.name, schema: CartSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: PaymentTransaction.name, schema: PaymentTransactionSchema },
      { name: User.name, schema: UserSchema },
      { name: ShippingDetails.name, schema: ShippingDetailsSchema },
      { name: DeliveryOption.name, schema: DeliveryOptionSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
