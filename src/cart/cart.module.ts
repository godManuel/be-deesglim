import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Offer, OfferSchema } from '../offers/schemas/offer.schema';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { Cart, CartSchema } from './schemas/cart.schema';
import {
  ProductVariant,
  ProductVariantSchema,
} from '../products/schemas/product-variant.schema';
import { ProductsModule } from 'src/products/products.module';
import { Product, ProductSchema } from 'src/products/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: ProductVariant.name, schema: ProductVariantSchema },
      { name: Product.name, schema: ProductSchema },
      { name: Offer.name, schema: OfferSchema },
    ]),
    ProductsModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
