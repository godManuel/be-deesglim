import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Product } from 'src/products/schemas/product.schema';
import { ProductVariant } from 'src/products/schemas/product-variant.schema';
import { ColorType } from 'src/products/enums/color-type.enum';

export type CartItemDocument = CartItem & Document;

@Schema()
export class CartItem {
  @Prop({ type: Types.ObjectId, ref: Product.name })
  product?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Offer' })
  offer?: Types.ObjectId;

  @Prop({ min: 1 })
  quantity?: number;

  @Prop({ type: Types.ObjectId, ref: ProductVariant.name })
  variant?: Types.ObjectId;

  @Prop({
    type: String,
    enum: Object.values(ColorType),
  })
  color?: ColorType;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);
