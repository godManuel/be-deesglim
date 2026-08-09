import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Offer, OfferDocument } from './schemas/offer.schema';
import { CreateOfferDto } from './dto/create-offer.dto';
import { ListOffersQueryDto } from './dto/list-offers-query.dto';
import { Product, ProductDocument } from 'src/products/schemas/product.schema';
import {
  enrichOfferWithVariants,
  enrichOffersWithVariants,
} from './utils/offer-variant-population';

@Injectable()
export class OffersService {
  constructor(
    @InjectModel(Offer.name)
    private readonly offerModel: Model<OfferDocument>,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  async create(dto: CreateOfferDto): Promise<Offer> {
    const uniqueVariantIds = Array.from(new Set(dto.variantIds));

    // Find products containing the requested nested variant IDs
    const products = await this.productModel
      .find({
        'color.variants._id': {
          $in: uniqueVariantIds.map((id) => new Types.ObjectId(id)),
        },
      })
      .select('color')
      .lean()
      .exec();

    // Collect existing nested variant IDs
    const existingVariantIds = new Set<string>();

    for (const product of products) {
      for (const color of product.color ?? []) {
        for (const variant of color.variants ?? []) {
          const variantWithId = variant as typeof variant & {
            _id?: Types.ObjectId;
          };

          if (variantWithId._id) {
            existingVariantIds.add(variantWithId._id.toString());
          }
        }
      }
    }

    // Check for missing variant IDs
    const missingVariantIds = uniqueVariantIds.filter(
      (id) => !existingVariantIds.has(id),
    );

    if (missingVariantIds.length > 0) {
      throw new BadRequestException(
        `The following variant id(s) do not exist: ${missingVariantIds.join(', ')}`,
      );
    }

    // Validate expiration date
    let expirationDate: Date | undefined;

    if (dto.expirationDate) {
      expirationDate = new Date(dto.expirationDate);

      if (Number.isNaN(expirationDate.getTime())) {
        throw new BadRequestException('Invalid expirationDate.');
      }

      if (expirationDate.getTime() <= Date.now()) {
        throw new BadRequestException('expirationDate must be in the future.');
      }
    }

    // Create offer
    const offer = new this.offerModel({
      name: dto.name,
      offerPrice: dto.offerPrice,
      image: dto.image,
      description: dto.description,
      expirationDate,
      variantIds: uniqueVariantIds.map((id) => new Types.ObjectId(id)),
    });

    const savedOffer = await offer.save();
    const savedOfferObject = savedOffer?.toObject
      ? savedOffer.toObject()
      : savedOffer;

    const populatedProducts = await this.productModel
      .find({
        'color.variants._id': {
          $in: uniqueVariantIds.map((id) => new Types.ObjectId(id)),
        },
      })
      .select('name slug color images')
      .lean()
      .exec();

    return enrichOfferWithVariants(savedOfferObject, populatedProducts);
  }

  async findAll(query: ListOffersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<OfferDocument> = {};

    // By default, return active offers.
    // By default, return active offers.
    // An offer is considered active if:
    // 1. It has no expirationDate, OR
    // 2. Its expirationDate is in the future.
    if (query.activeOnly !== false) {
      filter.$or = [
        {
          expirationDate: {
            $exists: false,
          },
        },
        {
          expirationDate: null,
        },
        {
          expirationDate: {
            $gt: new Date(),
          },
        },
      ];
    }

    const [offers, total] = await Promise.all([
      this.offerModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      this.offerModel.countDocuments(filter).exec(),
    ]);

    // ---------------------------------------------------------
    // Get all variant IDs from the offers
    // ---------------------------------------------------------

    const variantIds = offers.flatMap((offer) =>
      (offer.variantIds ?? []).map((id) => id.toString()),
    );

    // ---------------------------------------------------------
    // Find products containing the nested variants
    // ---------------------------------------------------------

    let products: any[] = [];

    if (variantIds.length > 0) {
      products = await this.productModel
        .find({
          'color.variants._id': {
            $in: variantIds.map((id) => new Types.ObjectId(id)),
          },
        })
        .select('name slug color images')
        .lean()
        .exec();
    }

    // ---------------------------------------------------------
    // Attach nested variant details to each offer
    // ---------------------------------------------------------

    const data = enrichOffersWithVariants(offers, products);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findById(offerId: string): Promise<Offer> {
    const offer = await this.offerModel
      .findById(offerId)
      .populate('variantIds')
      .exec();
    if (!offer) {
      throw new NotFoundException('Offer not found.');
    }
    return offer;
  }
}
