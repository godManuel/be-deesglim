import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ColorType } from 'src/products/enums/color-type.enum';

export type PaymentTransactionDocument = PaymentTransaction & Document;

export enum PaymentTransactionStatus {
  INITIATED = 'INITIATED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
}

export enum PaymentMethod {
  CARD = 'CARD',
  BANK = 'BANK',
  USSD = 'USSD',
  QR = 'QR',
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  EFT = 'EFT',
  PAYATTITUDE = 'PAYATTITUDE',
  APPLE_PAY = 'APPLE_PAY',
  UNKNOWN = 'UNKNOWN',
}

@Schema({ _id: false })
export class CheckoutItemSnapshot {
  @Prop({ required: true })
  productId: string;

  @Prop({
    required: false,
    default: null,
  })
  variantId?: string;

  @Prop({
    type: String,
    enum: Object.values(ColorType),
    required: true,
  })
  color: ColorType;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true })
  quantity: number;

  @Prop({ type: [String] })
  images: string[];
}

export const CheckoutItemSnapshotSchema =
  SchemaFactory.createForClass(CheckoutItemSnapshot);

@Schema({ timestamps: true })
export class PaymentTransaction {
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  reference: string;

  @Prop({
    type: String,
    enum: PaymentTransactionStatus,
    default: PaymentTransactionStatus.INITIATED,
  })
  status: PaymentTransactionStatus;

  @Prop({ required: true })
  amountKobo: number;

  @Prop({ required: true })
  total: number;

  @Prop({ required: true })
  subtotal: number;

  @Prop({ required: true, default: 0 })
  taxTotal: number;

  @Prop({ required: true, default: 0 })
  shippingTotal: number;

  @Prop({ required: true, default: 0 })
  discountTotal: number;

  @Prop({ type: Object, required: true })
  shippingAddress: Record<string, any>;

  @Prop({ type: [CheckoutItemSnapshotSchema], default: [] })
  items: CheckoutItemSnapshot[];

  @Prop({
    type: {
      deliveryPartner: {
        type: String,
        required: true,
      },
      deliveryPartnerName: {
        type: String,
        required: true,
      },
      deliveryType: {
        type: String,
        required: true,
      },
      deliveryFee: {
        type: Number,
        required: true,
      },
    },
    required: true,
  })
  deliveryDetails!: {
    deliveryPartner: string;
    deliveryPartnerName: string;
    deliveryType: string;
    deliveryFee: number;
  };

  @Prop()
  paystackAccessCode?: string;

  @Prop()
  paystackAuthorizationUrl?: string;

  @Prop()
  paystackStatus?: string;

  @Prop()
  paystackChannel?: string;

  @Prop({
    type: String,
    enum: PaymentMethod,
    default: PaymentMethod.UNKNOWN,
  })
  methodOfPayment?: PaymentMethod;

  @Prop({ type: Date })
  paidAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'Order' })
  orderId?: Types.ObjectId;
}

export const PaymentTransactionSchema =
  SchemaFactory.createForClass(PaymentTransaction);
