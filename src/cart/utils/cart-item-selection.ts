import { resolveVariantId } from './variant-reference';

export interface CartItemSelection {
  productId: string;
  color: string;
  offerId?: string;
  variantId?: string;
}

export function matchesCartItemSelection(
  existing: any,
  selection: CartItemSelection,
): boolean {
  const existingProductId =
    existing?.product?._id?.toString?.() ?? existing?.product?.toString?.();

  if (!existingProductId || existingProductId !== selection.productId) {
    return false;
  }

  if (existing?.color !== selection.color) {
    return false;
  }

  const existingOfferId =
    existing?.offer?._id?.toString?.() ?? existing?.offer?.toString?.();

  if (selection.offerId) {
    if (existingOfferId !== selection.offerId) {
      return false;
    }
  } else if (existingOfferId) {
    return false;
  }

  const existingVariantId = resolveVariantId(existing?.variant)?.toString();

  if (selection.variantId) {
    return existingVariantId === selection.variantId;
  }

  return !existingVariantId;
}
