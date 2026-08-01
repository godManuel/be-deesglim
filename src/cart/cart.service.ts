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

import { ColorType } from 'src/products/enums/color-type.enum';

import { Offer, OfferDocument } from 'src/offers/schemas/offer.schema';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name)
    private readonly cartModel: Model<CartDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
    @InjectModel(Offer.name)
    private readonly offerModel: Model<OfferDocument>,
    private readonly productsService: ProductsService,
  ) {}

  async findOrCreateCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel
      .findOne({
        userId: new Types.ObjectId(userId),
        status: 'ACTIVE',
      })
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
        {
          path: 'items.offer',
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
    productId: string | undefined,
    variantId: string | undefined,
    quantity: number | undefined,
    color: ColorType | undefined,
    offerId?: string,
  ): Promise<CartDocument> {
    // ============================================================
    // OFFER CART ITEM
    // ============================================================

    if (offerId) {
      if (!Types.ObjectId.isValid(offerId)) {
        throw new BadRequestException('Invalid offerId.');
      }

      const offer = await this.offerModel.findById(offerId).lean().exec();

      if (!offer) {
        throw new NotFoundException('Offer not found.');
      }

      // Check expiration if expirationDate exists
      if (
        offer.expirationDate &&
        new Date(offer.expirationDate).getTime() <= Date.now()
      ) {
        throw new BadRequestException('This offer has expired.');
      }

      if (!offer.variantIds?.length) {
        throw new BadRequestException(
          'This offer does not contain any products.',
        );
      }

      const cart = await this.findOrCreateCart(userId);

      // Check if this offer is already in the cart
      const existingOfferItem = cart.items.find((item: any) => {
        const existingOfferId =
          item.offer?._id?.toString?.() ?? item.offer?.toString?.();

        return existingOfferId === offerId;
      });

      if (existingOfferItem) {
        throw new BadRequestException(
          `"${offer.name}" is already in your cart.`,
        );
      }

      // Add offer to cart.
      //
      // Since this is an offer, we do not check:
      // - productId
      // - variantId
      // - color
      // - quantity
      //
      // The offer itself determines the products/variants included.
      cart.items.push({
        offer: new Types.ObjectId(offerId),
        quantity: 1,
      } as CartItem);

      await cart.save();

      return this.findOrCreateCart(userId);
    }

    // ============================================================
    // NORMAL PRODUCT CART ITEM
    // ============================================================

    // If there is no offerId, all normal product information is required.
    if (!productId) {
      throw new BadRequestException(
        'productId is required when adding a normal product to cart.',
      );
    }

    if (!color) {
      throw new BadRequestException(
        'color is required when adding a normal product to cart.',
      );
    }

    if (!quantity || !Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer.');
    }

    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid productId.');
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

    // ============================================================
    // FIND SELECTED COLOR
    // ============================================================

    const selectedColor = product.color.find(
      (productColor) => productColor.colorType === color,
    );

    if (!selectedColor) {
      throw new BadRequestException(
        `"${product.name}" is not available in the "${color}" color.`,
      );
    }

    // ============================================================
    // FIND SELECTED VARIANT
    // ============================================================

    let selectedVariant: ProductVariantDocument | undefined;

    if (variantId) {
      if (!Types.ObjectId.isValid(variantId)) {
        throw new BadRequestException('Invalid variantId.');
      }

      selectedVariant = selectedColor.variants?.find(
        (variant: any) => variant?._id?.toString() === variantId,
      ) as ProductVariantDocument | undefined;

      if (!selectedVariant) {
        throw new NotFoundException(
          `The selected variant does not exist in the "${color}" color.`,
        );
      }
    }

    // ============================================================
    // DETERMINE AVAILABLE INVENTORY
    // ============================================================

    let availableQuantity: number;

    if (selectedVariant) {
      // If a variant is selected, use that variant's inventoryCount.
      availableQuantity = selectedVariant.inventoryCount ?? 0;
    } else {
      // If no variant is selected, use the color quantity.
      availableQuantity = selectedColor.colorQuantity ?? 0;
    }

    // ============================================================
    // FIND CART
    // ============================================================

    const cart = await this.findOrCreateCart(userId);

    // ============================================================
    // FIND EXISTING CART ITEM
    // ============================================================

    const item = cart.items.find((existing: any) => {
      // Offers should never match normal products.
      if (existing.offer) {
        return false;
      }

      const existingProductId =
        existing.product?._id?.toString?.() ?? existing.product?.toString?.();

      if (!existingProductId) {
        return false;
      }

      if (existingProductId !== productId) {
        return false;
      }

      // Color must match.
      if (existing.color !== color) {
        return false;
      }

      // Product without variant.
      if (!variantId) {
        return !existing.variant;
      }

      // Product with variant.
      const existingVariantId =
        existing.variant?._id?.toString?.() ?? existing.variant?.toString?.();

      return existingVariantId === variantId;
    });

    // ============================================================
    // CHECK CART QUANTITY AGAINST INVENTORY
    // ============================================================

    const currentCartQuantity = item?.quantity ?? 0;

    const requestedTotalQuantity = currentCartQuantity + quantity;

    if (requestedTotalQuantity > availableQuantity) {
      throw new BadRequestException(
        `"${product.name}" (${color}) ${
          selectedVariant ? 'variant' : 'color'
        } only has ${availableQuantity} item(s) remaining. ` +
          `You already have ${currentCartQuantity} in your cart ` +
          `and are requesting ${quantity} more.`,
      );
    }

    // ============================================================
    // UPDATE EXISTING ITEM
    // ============================================================

    if (item) {
      item.quantity = (item.quantity ?? 0) + quantity;
      item.color = color;
    }

    // ============================================================
    // ADD NEW PRODUCT ITEM
    // ============================================================
    else {
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

  // ============================================================
  // UPDATE ITEM
  // ============================================================

  async updateItem(
    userId: string,
    itemId: string,
    quantity: number,
  ): Promise<CartDocument> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer.');
    }

    const cart = await this.findOrCreateCart(userId);

    const item = cart.items.find(
      (item: any) => item._id?.toString() === itemId,
    );

    if (!item) {
      throw new NotFoundException('Cart item not found.');
    }

    // ============================================================
    // OFFER ITEM
    // ============================================================

    if (item.offer) {
      throw new BadRequestException('Offer quantity cannot be updated.');
    }

    // ============================================================
    // NORMAL PRODUCT
    // ============================================================

    if (!item.product) {
      throw new BadRequestException('Cart item does not contain a product.');
    }

    const productId =
      item.product?._id?.toString?.() ?? item.product?.toString?.();

    const product = await this.productsService.findById(productId);

    if (!product) {
      throw new NotFoundException('Product not found.');
    }

    const selectedColor = product.color?.find(
      (c) => c.colorType === item.color,
    );

    if (!selectedColor) {
      throw new NotFoundException(
        `Color "${item.color}" is no longer available for this product.`,
      );
    }

    let availableQuantity = selectedColor.colorQuantity ?? 0;

    // If variant exists, check variant inventory.
    if (item.variant) {
      const variantId =
        item.variant?._id?.toString?.() ?? item.variant?.toString?.();

      const variant = selectedColor.variants?.find(
        (v: any) => v._id?.toString() === variantId,
      );

      if (!variant) {
        throw new NotFoundException(
          'The selected variant no longer exists for this color.',
        );
      }

      availableQuantity = variant.inventoryCount ?? 0;
    }

    if (quantity > availableQuantity) {
      throw new BadRequestException(
        `"${product.name}" (${item.color}) only has ` +
          `${availableQuantity} item(s) available.`,
      );
    }

    item.quantity = quantity;

    await cart.save();

    return this.findOrCreateCart(userId);
  }

  // ============================================================
  // REMOVE ITEM
  // ============================================================

  async removeItem(userId: string, itemId: string): Promise<CartDocument> {
    const cart = await this.findOrCreateCart(userId);

    const item = cart.items.find(
      (item: any) => item._id?.toString() === itemId,
    );

    if (!item) {
      throw new NotFoundException('Cart item not found.');
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
