import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ProductVariant } from '../../products/schemas/product-variant.schema';

export type CartItemDocument = CartItem & Document;

@Schema()
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: ProductVariant.name, required: true })
  variant: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  quantity: number;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);
