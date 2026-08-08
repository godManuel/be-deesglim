import { calculateVolumeDiscount } from './volume-discount';

describe('calculateVolumeDiscount', () => {
  it('applies the retail package discount at 10 items and above', () => {
    expect(calculateVolumeDiscount(10, 1000)).toEqual({
      discountRate: 0.1,
      discountAmount: 100,
      packageName: 'retail package',
      itemCount: 10,
    });
  });

  it('applies the vendors package discount at 20 items and above', () => {
    expect(calculateVolumeDiscount(20, 1000)).toEqual({
      discountRate: 0.15,
      discountAmount: 150,
      packageName: 'vendors package',
      itemCount: 20,
    });
  });

  it('applies the wholesale package discount at 40 items and above', () => {
    expect(calculateVolumeDiscount(40, 1000)).toEqual({
      discountRate: 0.2,
      discountAmount: 200,
      packageName: 'wholesale package',
      itemCount: 40,
    });
  });

  it('does not apply a discount for fewer than 10 items', () => {
    expect(calculateVolumeDiscount(9, 1000)).toEqual({
      discountRate: 0,
      discountAmount: 0,
      packageName: 'no discount',
      itemCount: 9,
    });
  });
});
