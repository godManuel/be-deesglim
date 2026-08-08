export interface VolumeDiscountResult {
  discountRate: number;
  discountAmount: number;
  packageName: string;
  itemCount: number;
}

export function calculateVolumeDiscount(
  itemCount: number,
  subtotal: number,
): VolumeDiscountResult {
  const safeItemCount = Math.max(0, Math.floor(itemCount));
  const safeSubtotal = Number.isFinite(subtotal) ? subtotal : 0;

  if (safeItemCount >= 40) {
    return {
      discountRate: 0.2,
      discountAmount: Number((safeSubtotal * 0.2).toFixed(2)),
      packageName: 'wholesale package',
      itemCount: safeItemCount,
    };
  }

  if (safeItemCount >= 20) {
    return {
      discountRate: 0.15,
      discountAmount: Number((safeSubtotal * 0.15).toFixed(2)),
      packageName: 'vendors package',
      itemCount: safeItemCount,
    };
  }

  if (safeItemCount >= 10) {
    return {
      discountRate: 0.1,
      discountAmount: Number((safeSubtotal * 0.1).toFixed(2)),
      packageName: 'retail package',
      itemCount: safeItemCount,
    };
  }

  return {
    discountRate: 0,
    discountAmount: 0,
    packageName: 'no discount',
    itemCount: safeItemCount,
  };
}
