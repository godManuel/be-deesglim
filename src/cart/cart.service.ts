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
      .populate([
        {
          path: 'items.product',
          populate: {
            path: 'images',
          },
        },
        {
          path: 'items.variant',
        },
      ])
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
    variantId: string | undefined,
    quantity: number,
    color: string,
  ): Promise<CartDocument> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const product = await this.productsService.findById(productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let availableQuantity = 0;
    let variant: ProductVariantDocument | undefined;

    if (variantId) {
      variant = product.variants?.find(
        (v: any) => v._id.toString() === variantId,
      ) as ProductVariantDocument | undefined;

      if (!variant) {
        throw new NotFoundException(
          'The selected variant does not belong to this product',
        );
      }

      availableQuantity = variant.inventoryCount;
    } else {
      availableQuantity = await this.getAvailableQuantity(
        product.variants as unknown as Types.ObjectId[],
      );
    }

    const productObjectId = new Types.ObjectId(productId);

    const cart = await this.findOrCreateCart(userId);

    const item = cart.items.find((existing) => {
      const sameProduct =
        existing.product.toString() === productObjectId.toString();

      if (!sameProduct) return false;

      // Product without variant
      if (!variantId) {
        return !existing.variant;
      }

      // Product with variant
      return existing.variant?.toString() === variantId;
    });

    const currentCartQuantity = item ? item.quantity : 0;
    const requestedTotalQuantity = currentCartQuantity + quantity;

    if (requestedTotalQuantity > availableQuantity) {
      throw new BadRequestException(
        `Insufficient quantity for "${product.name}". Available: ${availableQuantity}, requested: ${requestedTotalQuantity}`,
      );
    }

    if (item) {
      item.quantity += quantity;
      item.color = color;
    } else {
      cart.items.push({
        product: productObjectId,
        variant: variantId ? new Types.ObjectId(variantId) : undefined,
        quantity,
        color,
      } as CartItem);
    }

    await cart.save();

    return this.findOrCreateCart(userId);
  }

  async updateItem(
    userId: string,
    itemId: string,
    quantity: number,
    color: string,
  ): Promise<CartDocument> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const cart = await this.findOrCreateCart(userId);

    const item = cart.items.find(
      (item: any) => item._id?.toString() === itemId,
    );

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    const product = await this.productsService.findById(
      item.product.toString(),
    );

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let availableQuantity = 0;

    const variantId = item.variant;

    if (variantId) {
      const variant = await this.variantModel.findById(variantId);

      if (!variant) {
        throw new NotFoundException('Product variant not found');
      }

      availableQuantity = variant.inventoryCount;
    } else {
      availableQuantity = await this.getAvailableQuantity(
        product.variants as Types.ObjectId[],
      );
    }

    if (quantity > availableQuantity) {
      throw new BadRequestException(
        `Only ${availableQuantity} item(s) available.`,
      );
    }

    item.quantity = quantity;
    item.color = color;

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
    cart.items = cart.items.filter(
      (item: any) => item._id?.toString() !== itemId,
    );
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
