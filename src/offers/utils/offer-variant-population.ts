export interface OfferVariantDetail {
  variantId: string;
  productId: string;
  productName: string;
  color: string;
  variant: any;
}

export function enrichOfferWithVariants(offer: any, products: any[] = []) {
  const variantIds = Array.isArray(offer?.variantIds) ? offer.variantIds : [];
  const variantMap = new Map<string, any>();

  for (const product of products) {
    for (const color of product.color ?? []) {
      for (const variant of color.variants ?? []) {
        const variantId = variant?._id?.toString?.();

        if (!variantId) {
          continue;
        }

        variantMap.set(variantId, {
          variant,
          product,
          color,
        });
      }
    }
  }

  const variants = variantIds
    .map((variantId: any) => {
      const normalizedVariantId = variantId?.toString?.() ?? variantId;
      const variantData = variantMap.get(normalizedVariantId);

      if (!variantData) {
        return null;
      }

      return {
        variantId: normalizedVariantId,
        productId: variantData.product._id?.toString?.(),
        productName: variantData.product.name,
        color: variantData.color.colorType,
        variant: variantData.variant,
      } satisfies OfferVariantDetail;
    })
    .filter(Boolean);

  return {
    ...offer,
    variantIds: variants,
  };
}

export function enrichOffersWithVariants(offers: any[], products: any[] = []) {
  return offers.map((offer) => enrichOfferWithVariants(offer, products));
}
