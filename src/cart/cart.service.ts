import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { CartItem } from './schemas/cart-item.schema';
import { ProductsService } from 'src/products/products.service';
import {
  ProductVariant,
  ProductVariantDocument,
} from 'src/products/schemas/product-variant.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
    private readonly productsService: ProductsService,
  ) {}

  async findOrCreateCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel
      .findOne({ userId: new Types.ObjectId(userId), status: 'ACTIVE' })
      .populate({
        path: 'items.product',
        populate: {
          path: 'images',
        },
      })
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
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const product = await this.productsService.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const productObjectId = new Types.ObjectId(productId);
    const cart = await this.findOrCreateCart(userId);
    const item = cart.items.find(
      (existing) => existing.product.toString() === productObjectId.toString(),
    );

    const currentCartQuantity = item ? item.quantity : 0;
    const requestedTotalQuantity = currentCartQuantity + quantity;

    // Stock is no longer tracked on the product itself — each variant now
    // owns its own `inventoryCount`, so the product's available quantity
    // is the sum of inventory across all of its variants.
    const availableQuantity = await this.getAvailableQuantity(
      product.variants as unknown as Types.ObjectId[],
    );

    if (availableQuantity < requestedTotalQuantity) {
      throw new BadRequestException(
        `Insufficient quantity for "${product.name}". Available: ${availableQuantity}, requested: ${requestedTotalQuantity}`,
      );
    }

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

  private async getAvailableQuantity(
    variantIds: Types.ObjectId[],
  ): Promise<number> {
    if (!variantIds?.length) return 0;

    const result = await this.variantModel.aggregate([
      { $match: { _id: { $in: variantIds } } },
      { $group: { _id: null, total: { $sum: '$inventoryCount' } } },
    ]);

    return result[0]?.total ?? 0;
  }
}
