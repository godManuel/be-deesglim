import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { CartItem } from './schemas/cart-item.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
  ) {}

  async findOrCreateCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'ACTIVE' })
      .populate('items.variant')
      .exec();
    if (!cart) {
      cart = await new this.cartModel({
        userId: new Types.ObjectId(userId),
        status: 'ACTIVE',
        items: [],
      }).save();
    }
    return cart;
  }

  async addItem(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<CartDocument> {
    const cart = await this.findOrCreateCart(userId);
    const productObjectId = new Types.ObjectId(productId);
    const item = cart.items.find(
      (existing) => existing.product.toString() === productObjectId.toString(),
    );

    if (item) {
      item.quantity += quantity;
    } else {
      cart.items.push({ product: productObjectId, quantity } as CartItem);
    }
    await cart.save();
    return this.findOrCreateCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    quantity: number,
  ): Promise<CartDocument> {
    const cart = await this.findOrCreateCart(userId);
    const item = cart.items.find(
      (item: any) => item._id?.toString() === itemId,
    );
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    item.quantity = quantity;
    await cart.save();
    return this.findOrCreateCart(userId);
  }

  async removeItem(userId: string, itemId: string): Promise<CartDocument> {
    const cart = await this.findOrCreateCart(userId);
    const item = cart.items.find(
      (item: any) => item._id?.toString() === itemId,
    );
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await cart.save();
    return this.findOrCreateCart(userId);
  }
}
