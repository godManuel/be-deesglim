import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

// Mirrors the four storefront categories from the spec. Kept as its own
// field (rather than only inferring it from the populated `category`
// document) so business rules — which color options are valid, which
// variant fields are expected, whether price lives on the product or the
// variant — can be checked without a populate/lookup.
export enum ProductType {
  LACE_SUPPLY = 'Lace Supply',
  CLOSURES_FRONTALS = 'Closures/Frontals',
  READY_TO_SHIP_WIGS = 'Ready to Ship Wigs',
  CUSTOM_WIGS = 'Custom Wigs',
}

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true, enum: ProductType })
  name: ProductType;

  @Prop({ required: true, unique: true })
  slug: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
