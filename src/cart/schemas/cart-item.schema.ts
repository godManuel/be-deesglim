import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from 'src/products/schemas/product.schema';
import { ProductVariant } from 'src/products/schemas/product-variant.schema';

export type CartItemDocument = CartItem & Document;

@Schema()
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: Product.name, required: true })
  product: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ type: Types.ObjectId, ref: ProductVariant.name })
  variant?: Types.ObjectId;

  @Prop({ required: true })
  color: string;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);
