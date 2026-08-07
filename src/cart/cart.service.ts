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
import { ProductVariantDocument } from 'src/products/schemas/product-variant.schema';
import { ColorType } from 'src/products/enums/color-type.enum';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
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
        { path: 'items.variant' },
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
    color: ColorType,
  ): Promise<CartDocument> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer.');
    }

    const product = await this.productsService.findById(productId);

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    if (!product.color?.length) {
      throw new BadRequestException(
        `"${product.name}" does not have any colors configured.`,
      );
    }

    const selectedColor = product.color.find(
      (productColor) => productColor.colorType === color,
    );

    if (!selectedColor) {
      throw new BadRequestException(
        `"${product.name}" is not available in the "${color}" color.`,
      );
    }

    let selectedVariant: ProductVariantDocument | undefined;

    if (variantId) {
      selectedVariant = selectedColor.variants?.find(
        (variant: any) => variant?._id?.toString() === variantId,
      ) as ProductVariantDocument | undefined;

      if (!selectedVariant) {
        throw new NotFoundException(
          `The selected variant does not exist in the "${color}" color.`,
        );
      }
    }

    let availableQuantity: number;

    if (selectedVariant) {
      availableQuantity = selectedVariant.inventoryCount ?? 0;
    } else {
      availableQuantity = selectedColor.colorQuantity ?? 0;
    }

    const cart = await this.findOrCreateCart(userId);

    const item = cart.items.find((existing) => {
      // Safely get existing product ID
      const existingProductId =
        existing.product?._id?.toString?.() ?? existing.product?.toString?.();

      if (!existingProductId) {
        return false;
      }

      const sameProduct = existingProductId === productId;

      if (!sameProduct) {
        return false;
      }

      // Color must match
      const sameColor = existing.color === color;

      if (!sameColor) {
        return false;
      }

      if (!variantId) {
        return !existing.variant;
      }

      const existingVariantId =
        existing.variant?._id?.toString?.() ?? existing.variant?.toString?.();

      return existingVariantId === variantId;
    });

    const currentCartQuantity = item?.quantity ?? 0;

    const requestedTotalQuantity = currentCartQuantity + quantity;

    if (requestedTotalQuantity > availableQuantity) {
      throw new BadRequestException(
        `"${product.name}" (${color}) ${
          selectedVariant ? 'variant' : 'color'
        } only has ${availableQuantity} item(s) remaining. ` +
          `You already have ${currentCartQuantity} in your cart and are requesting ${quantity} more.`,
      );
    }

    if (item) {
      item.quantity += quantity;
      item.color = color;
    } else {
      cart.items.push({
        product: new Types.ObjectId(productId),

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

    const selectedColor = product.color?.find(
      (c) => c.colorType === item.color,
    );

    if (!selectedColor) {
      throw new NotFoundException(
        `Color "${item.color}" is no longer available for this product.`,
      );
    }

    availableQuantity = selectedColor.colorQuantity;

    if (item.variant) {
      const variantId = item.variant;

      if (variantId) {
        const variant = selectedColor.variants?.find(
          (v: any) => v._id?.toString() === variantId.toString(),
        );

        if (!variant) {
          throw new NotFoundException(
            'The selected variant no longer exists for this color.',
          );
        }
      }

      // Since you're managing stock by color,
      // do NOT overwrite availableQuantity here.
    }

    if (quantity > availableQuantity) {
      throw new BadRequestException(
        `Only ${availableQuantity} item(s) available.`,
      );
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
    cart.items = cart.items.filter(
      (item: any) => item._id?.toString() !== itemId,
    );
    await cart.save();
    return this.findOrCreateCart(userId);
  }

  // private async getAvailableQuantity(
  //   variantIds: Types.ObjectId[],
  // ): Promise<number> {
  //   if (!variantIds?.length) return 0;

  //   const result = await this.variantModel.aggregate([
  //     { $match: { _id: { $in: variantIds } } },
  //     { $group: { _id: null, total: { $sum: '$inventoryCount' } } },
  //   ]);

  //   return result[0]?.total ?? 0;
  // }
}
