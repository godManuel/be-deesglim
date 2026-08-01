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
import {
  ProductVariant,
  ProductVariantDocument,
} from '../products/schemas/product-variant.schema';

@Injectable()
export class OffersService {
  constructor(
    @InjectModel(Offer.name)
    private readonly offerModel: Model<OfferDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
  ) {}

  async create(dto: CreateOfferDto): Promise<Offer> {
    const uniqueVariantIds = Array.from(new Set(dto.variantIds));

    const existingVariants = await this.variantModel
      .find({
        _id: { $in: uniqueVariantIds.map((id) => new Types.ObjectId(id)) },
      })
      .select('_id')
      .exec();

    if (existingVariants.length !== uniqueVariantIds.length) {
      const foundIds = new Set(
        existingVariants.map((variant) => variant._id.toString()),
      );
      const missingIds = uniqueVariantIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `The following variant id(s) do not exist: ${missingIds.join(', ')}`,
      );
    }

    const expirationDate = new Date(dto.expirationDate);
    if (Number.isNaN(expirationDate.getTime())) {
      throw new BadRequestException('Invalid expirationDate.');
    }
    if (expirationDate.getTime() <= Date.now()) {
      throw new BadRequestException('expirationDate must be in the future.');
    }

    const offer = new this.offerModel({
      name: dto.name,
      offerPrice: dto.offerPrice,
      image: dto.image,
      description: dto.description,
      expirationDate,
      variantIds: uniqueVariantIds.map((id) => new Types.ObjectId(id)),
    });

    return offer.save();
  }

  async findAll(query: ListOffersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const filter: FilterQuery<OfferDocument> = {};

    if (query.activeOnly !== false) {
      filter.expirationDate = { $gt: new Date() };
    }

    const [data, total] = await Promise.all([
      this.offerModel
        .find(filter)
        .populate('variantIds')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.offerModel.countDocuments(filter).exec(),
    ]);

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
