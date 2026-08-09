import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';

jest.mock('src/products/schemas/product.schema', () => ({
  Product: class Product {},
  ProductDocument: class ProductDocument {},
}));

import { OffersService } from './offers.service';
import { Offer } from './schemas/offer.schema';

describe('OffersService', () => {
  let service: OffersService;
  let createdVariantId: string;

  beforeEach(async () => {
    const variantId = new Types.ObjectId().toString();
    createdVariantId = variantId;

    const savedOffer = {
      _id: new Types.ObjectId(),
      name: 'Summer Sale',
      offerPrice: 20,
      image: 'https://example.com/offer.jpg',
      description: 'A test offer',
      expirationDate: new Date(Date.now() + 60_000),
      variantIds: [new Types.ObjectId(variantId)],
      toObject: () => ({
        _id: new Types.ObjectId(),
        name: 'Summer Sale',
        offerPrice: 20,
        image: 'https://example.com/offer.jpg',
        description: 'A test offer',
        expirationDate: new Date(Date.now() + 60_000),
        variantIds: [new Types.ObjectId(variantId)],
      }),
    };

    const offerModel = jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(savedOffer),
    }));

    const productModel = {
      find: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue([
              {
                _id: new Types.ObjectId(),
                name: 'Test Product',
                slug: 'test-product',
                color: [
                  {
                    colorType: 'Blue',
                    variants: [
                      {
                        _id: new Types.ObjectId(variantId),
                        name: 'Small',
                        sku: 'SKU-1',
                      },
                    ],
                  },
                ],
              },
            ]),
          }),
        }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OffersService,
        {
          provide: getModelToken(Offer.name),
          useValue: offerModel,
        },
        {
          provide: getModelToken('Product'),
          useValue: productModel,
        },
      ],
    }).compile();

    service = module.get<OffersService>(OffersService);
  });

  it('returns populated variant details when creating an offer', async () => {
    const result = await service.create({
      name: 'Summer Sale',
      offerPrice: 20,
      image: 'https://example.com/offer.jpg',
      description: 'A test offer',
      expirationDate: new Date(Date.now() + 60_000).toISOString(),
      variantIds: [createdVariantId],
    } as any);

    expect(result.variantIds[0]).toEqual(
      expect.objectContaining({
        variantId: expect.any(String),
        productId: expect.any(String),
        productName: 'Test Product',
        color: 'Blue',
      }),
    );
  });
});
