import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CategoryDocument = Category & Document;

export enum CategoryName {
  CUSTOM_WIGS = 'Custom Wigs',
  READY_TO_SHIP_WIGS = 'Ready to Ship Wigs',
  LACE_SUPPLY = 'Lace Supply',
  CLOSURES_FRONTALS = 'Closures/Frontals',
}

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, unique: true, enum: CategoryName })
  name: CategoryName;

  @Prop({ required: true, unique: true })
  slug: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
