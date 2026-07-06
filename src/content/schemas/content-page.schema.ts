import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContentPageDocument = ContentPage & Document;

@Schema({ timestamps: true })
export class ContentPage {
  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  @Prop()
  heroImageUrl?: string;

  @Prop()
  metaDescription?: string;
}

export const ContentPageSchema = SchemaFactory.createForClass(ContentPage);
