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
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { Offer, OfferDocument } from 'src/offers/schemas/offer.schema';
import { resolveVariantId } from '../cart/utils/variant-reference';
import { matchesCartItemSelection } from '../cart/utils/cart-item-selection';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
    @InjectModel(Offer.name) private readonly offerModel: Model<OfferDocument>,
    private readonly productsService: ProductsService,
  ) {}

  async findOrCreateCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel
      .findOne({
        userId: new Types.ObjectId(userId),
        status: 'ACTIVE',
      })
      .populate({
        path: 'items.product',
        populate: {
          path: 'images',
        },
      })
      .populate('items.offer')
      .exec();

    if (!cart) {
      cart = await new this.cartModel({
        userId: new Types.ObjectId(userId),
        status: 'ACTIVE',
        items: [],
        total: 0,
      }).save();

      return cart;
    }

    // Attach embedded variant only for normal product-cart items.
    // Offer-cart items only need the populated offer document.
    cart.items = cart.items.map((item: any) => {
      const obj = item.toObject();

      if (item.offer) {
        return obj;
      }

      const product = item.product as any;

      if (!product) {
        return obj;
      }

      const selectedColor = product.color?.find(
        (c: any) => c.colorType === item.color,
      );

      const requestedVariantId = resolveVariantId(item.variant)?.toString();
      const selectedVariant =
        selectedColor?.variants?.find(
          (v: any) => resolveVariantId(v?._id)?.toString() === requestedVariantId,
        ) ?? null;

      return {
        ...obj,
        variant: selectedVariant,
      };
    }) as any;

    return cart;
  }

  async addItem(userId: string, dto: AddCartItemDto): Promise<CartDocument> {
    const { offerId, productId, variantId, quantity, color } = dto;

    if (offerId) {
      if (
        productId ||
        variantId ||
        quantity !== undefined ||
        color !== undefined
      ) {
        throw new BadRequestException(
          'Provide either offerId or product details, not both.',
        );
      }

      return this.addOfferToCart(userId, offerId);
    }

    if (!productId || quantity === undefined || !color) {
      throw new BadRequestException(
        'productId, quantity, and color are required when offerId is not provided.',
      );
    }

    return this.addProductToCart(userId, productId, variantId, quantity, color);
  }

  private async addProductToCart(
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

    let lineUnitPrice = product.price ?? 0;

    if (variantId) {
      if (
        selectedVariant?.newPrice === undefined ||
        selectedVariant?.newPrice === null
      ) {
        throw new BadRequestException(
          'The selected variant does not have a valid newPrice.',
        );
      }

      lineUnitPrice = selectedVariant.newPrice;
    }

    const cart = await this.findOrCreateCart(userId);

    this.upsertCartItem(
      cart,
      product,
      productId,
      variantId,
      quantity,
      color,
      availableQuantity,
      !!selectedVariant,
    );

    cart.total = (cart.total ?? 0) + lineUnitPrice * quantity;

    await cart.save();

    return this.findOrCreateCart(userId);
  }

  private async addOfferToCart(
    userId: string,
    offerId: string,
  ): Promise<CartDocument> {
    const offer = await this.offerModel.findById(offerId).exec();

    if (!offer) {
      throw new NotFoundException('Offer not found.');
    }

    const cart = await this.findOrCreateCart(userId);

    const existingOfferItem = cart.items.find((item: any) => {
      const existingOfferId =
        item.offer?._id?.toString?.() ?? item.offer?.toString?.();

      if (!existingOfferId) {
        return false;
      }

      return existingOfferId === offerId;
    });

    if (existingOfferItem) {
      existingOfferItem.quantity = (existingOfferItem.quantity ?? 0) + 1;
    } else {
      cart.items.push({
        offer: new Types.ObjectId(offerId),
        quantity: 1,
      } as CartItem);
    }

    cart.total = (cart.total ?? 0) + (offer.offerPrice ?? 0);

    await cart.save();

    return this.findOrCreateCart(userId);
  }

  private upsertCartItem(
    cart: CartDocument,
    product: any,
    productId: string,
    variantId: string | undefined,
    quantity: number,
    color: ColorType,
    availableQuantity: number,
    isVariantSelection: boolean,
    offerId?: string,
  ) {
    const item = cart.items.find((existing) =>
      matchesCartItemSelection(existing, {
        productId,
        color,
        offerId,
        variantId,
      }),
    );

    const currentCartQuantity = item?.quantity ?? 0;
    const requestedTotalQuantity = currentCartQuantity + quantity;

    if (requestedTotalQuantity > availableQuantity) {
      throw new BadRequestException(
        `"${product.name}" (${color}) ${
          isVariantSelection ? 'variant' : 'color'
        } only has ${availableQuantity} item(s) remaining. ` +
          `You already have ${currentCartQuantity} in your cart and are requesting ${quantity} more.`,
      );
    }

    if (item) {
      item.quantity = (item.quantity ?? 0) + quantity;
      item.color = color;

      if (offerId && !item.offer) {
        item.offer = new Types.ObjectId(offerId);
      }

      if (variantId) {
        item.variant = resolveVariantId(variantId);
      } else if (item.variant) {
        item.variant = undefined;
      }

      return;
    }

    const normalizedVariant = resolveVariantId(variantId);

    cart.items.push({
      product: new Types.ObjectId(productId),
      offer: offerId ? new Types.ObjectId(offerId) : undefined,
      variant: normalizedVariant,
      quantity,
      color,
    } as CartItem);
  }

  async updateItem(
    userId: string,
    itemId: string,
    quantity: number,
  ): Promise<CartDocument> {
    // -------------------------------------------------------
    // 1. Validate quantity
    // -------------------------------------------------------

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer');
    }

    // -------------------------------------------------------
    // 2. Find active cart
    // -------------------------------------------------------

    const cart = await this.cartModel.findOne({
      userId: new Types.ObjectId(userId),
      status: 'ACTIVE',
    });

    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    // -------------------------------------------------------
    // 3. Find cart item
    // -------------------------------------------------------

    const item = cart.items.find(
      (item: any) => item._id?.toString() === itemId,
    );

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // -------------------------------------------------------
    // 4. Safely get product ID
    //
    // item.product can either be:
    // - ObjectId
    // - populated Product object
    // -------------------------------------------------------

    const productId =
      item.product?._id?.toString?.() ?? item.product?.toString?.();

    if (!productId) {
      throw new BadRequestException('Cart item contains an invalid product.');
    }

    // -------------------------------------------------------
    // 5. Get product
    // -------------------------------------------------------

    const product = await this.productsService.findById(productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // -------------------------------------------------------
    // 6. Find selected color
    // -------------------------------------------------------

    const selectedColor = product.color?.find(
      (c) => c.colorType === item.color,
    );

    if (!selectedColor) {
      throw new NotFoundException(
        `Color "${item.color}" is no longer available for this product.`,
      );
    }

    // -------------------------------------------------------
    // 7. Determine available inventory
    // -------------------------------------------------------

    let availableQuantity = Number(selectedColor.colorQuantity ?? 0);

    // -------------------------------------------------------
    // 8. If cart item has a variant,
    //    validate the variant and use its inventory
    // -------------------------------------------------------

    if (item.variant) {
      const variantId =
        item.variant?._id?.toString?.() ?? item.variant?.toString?.();

      if (!variantId) {
        throw new BadRequestException('Cart item contains an invalid variant.');
      }

      const variant = selectedColor.variants?.find(
        (v: any) => v?._id?.toString?.() === variantId,
      );

      if (!variant) {
        throw new NotFoundException(
          'The selected variant no longer exists for this color.',
        );
      }

      // Variant has its own inventory.
      availableQuantity = Number(variant.inventoryCount ?? 0);
    }

    // -------------------------------------------------------
    // 9. Validate requested quantity against inventory
    // -------------------------------------------------------

    if (quantity > availableQuantity) {
      throw new BadRequestException(
        `"${product.name}" (${item.color}) only has ` +
          `${availableQuantity} item(s) available. ` +
          `Requested: ${quantity}.`,
      );
    }

    // -------------------------------------------------------
    // 10. Update cart item quantity
    // -------------------------------------------------------

    item.quantity = quantity;

    // -------------------------------------------------------
    // 11. Recalculate cart total
    // -------------------------------------------------------

    await this.recalculateAndAssignCartTotal(cart);

    // -------------------------------------------------------
    // 12. Save cart
    // -------------------------------------------------------

    await cart.save();

    // -------------------------------------------------------
    // 13. Return populated cart
    // -------------------------------------------------------

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

    await this.recalculateAndAssignCartTotal(cart);

    await cart.save();
    return this.findOrCreateCart(userId);
  }

  private async recalculateAndAssignCartTotal(
    cart: CartDocument,
  ): Promise<void> {
    let total = 0;

    const offersPriceCache = new Map<string, number>();
    const productCache = new Map<string, any>();

    for (const item of cart.items as any[]) {
      const quantity = item.quantity ?? 0;

      if (quantity <= 0) {
        continue;
      }

      const offerId = item.offer?._id?.toString?.() ?? item.offer?.toString?.();

      if (offerId) {
        let offerPrice = offersPriceCache.get(offerId);

        if (offerPrice === undefined) {
          const offer = await this.offerModel
            .findById(offerId)
            .select('offerPrice')
            .lean()
            .exec();

          offerPrice = offer?.offerPrice ?? 0;
          offersPriceCache.set(offerId, offerPrice);
        }

        total += offerPrice * quantity;
        continue;
      }

      const productId =
        item.product?._id?.toString?.() ?? item.product?.toString?.();

      if (!productId) {
        continue;
      }

      let product = productCache.get(productId);

      if (!product) {
        product = await this.productsService.findById(productId);
        productCache.set(productId, product);
      }

      if (!product) {
        continue;
      }

      const variantId =
        item.variant?._id?.toString?.() ?? item.variant?.toString?.();

      if (variantId) {
        const selectedColor = product.color?.find(
          (c: any) => c.colorType === item.color,
        );

        const selectedVariant = selectedColor?.variants?.find(
          (v: any) => v?._id?.toString() === variantId,
        );

        const unitPrice = selectedVariant?.newPrice ?? 0;

        total += unitPrice * quantity;
        continue;
      }

      total += (product.price ?? 0) * quantity;
    }

    cart.total = total;
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
