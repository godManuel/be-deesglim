import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model, Types } from 'mongoose';
import {
  Category,
  CategoryDocument,
  CategoryName,
} from './schemas/category.schema';
import {
  CustomWigType,
  Product,
  ProductDocument,
} from './schemas/product.schema';
import {
  ProductVariant,
  ProductVariantDocument,
} from './schemas/product-variant.schema';
import {
  ProductImage,
  ProductImageDocument,
} from './schemas/product-image.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import {
  Order,
  OrderDocument,
  OrderStatus,
} from '../orders/schemas/order.schema';
import { TopCategoriesQueryDto } from './dto/top-categories-query.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';

type UploadedProductImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
    @InjectModel(ProductImage.name)
    private readonly imageModel: Model<ProductImageDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: Model<OrderDocument>,
  ) {}

  async create(
    createProductDto: CreateProductDto,
    imageFiles: UploadedProductImageFile[] = [],
  ): Promise<Product> {
    const slug = await this.generateUniqueProductSlug(
      createProductDto.slug || createProductDto.name,
    );

    const category = await this.categoryModel.findOne({
      $or: [
        { _id: createProductDto.category },
        { slug: createProductDto.category },
      ],
    });

    if (!category) {
      throw new BadRequestException(
        'Category not found. Provide a valid category id or slug.',
      );
    }

    const isCustomWigCategory =
      category.slug === 'custom-wigs' ||
      category.name === CategoryName.CUSTOM_WIGS;
    const isClosuresFrontalsCategory =
      category.slug === 'closuresfrontals' ||
      category.name === CategoryName.CLOSURES_FRONTALS;
    const isLaceSupplyCategory =
      category.slug === 'lace-supply' ||
      category.name === CategoryName.LACE_SUPPLY;

    if (isCustomWigCategory) {
      if (
        !createProductDto.laceSize ||
        createProductDto.headSize === undefined ||
        !createProductDto.color ||
        createProductDto.grams === undefined ||
        !createProductDto.length
      ) {
        throw new BadRequestException(
          'Custom Wig products require laceSize, headSize, color, grams, and length.',
        );
      }
    }

    if (isClosuresFrontalsCategory) {
      if (
        !createProductDto.laceSize ||
        !createProductDto.length ||
        !createProductDto.color ||
        createProductDto.quantity === undefined ||
        createProductDto.oldPrice === undefined ||
        createProductDto.newPrice === undefined
      ) {
        throw new BadRequestException(
          'Closures/Frontals products require laceSize, length, color, quantity, oldPrice, and newPrice.',
        );
      }
    }

    if (!isLaceSupplyCategory && createProductDto.variants?.length) {
      throw new BadRequestException(
        'Variants can only be added to products in Lace Supply category.',
      );
    }

    const variantIds: Types.ObjectId[] = [];
    if (createProductDto.variants?.length) {
      const variants = await this.variantModel.insertMany(
        createProductDto.variants.map((variant: CreateProductVariantDto) => ({
          ...variant,
          inventoryCount: variant.inventoryCount ?? 0,
        })),
      );
      variantIds.push(...variants.map((variant) => variant._id));
    }

    const imageIds: Types.ObjectId[] = [];
    if (imageFiles.length) {
      const uploadedImages = await Promise.all(
        imageFiles.map((file, index) =>
          this.uploadImageToCloudinary(file, index),
        ),
      );

      const cloudinaryImages = await this.imageModel.insertMany(
        uploadedImages.map((image, index) => ({
          url: image.url,
          altText: image.altText,
          sortOrder: image.sortOrder ?? index,
        })),
      );

      imageIds.push(...cloudinaryImages.map((image) => image._id));
    }

    if (createProductDto.images?.length) {
      const images = await this.imageModel.insertMany(
        createProductDto.images.map((image: CreateProductImageDto) => ({
          ...image,
          sortOrder: image.sortOrder ?? 0,
        })),
      );
      imageIds.push(...images.map((image) => image._id));
    }

    const product = new this.productModel({
      ...createProductDto,
      slug,
      allowAnyColor:
        createProductDto.customWigType === CustomWigType.MAKE_FROM_SCRATCH
          ? true
          : (createProductDto.allowAnyColor ?? false),
      price:
        isClosuresFrontalsCategory && createProductDto.newPrice !== undefined
          ? createProductDto.newPrice
          : createProductDto.price,
      category: category._id,
      variants: variantIds,
      images: imageIds,
    });

    return product.save();
  }

  private async generateUniqueProductSlug(source: string): Promise<string> {
    const baseSlug = source
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!baseSlug) {
      throw new BadRequestException(
        'Product name is required to generate slug.',
      );
    }

    let slug = baseSlug;
    let suffix = 1;

    while (await this.productModel.exists({ slug })) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
  }

  private async uploadImageToCloudinary(
    file: UploadedProductImageFile,
    sortOrder: number,
  ): Promise<{ url: string; altText: string; sortOrder: number }> {
    const cloudName = this.configService.getOrThrow<string>(
      'CLOUDINARY_CLOUD_NAME',
    );
    const apiKey = this.configService.getOrThrow<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.getOrThrow<string>(
      'CLOUDINARY_API_SECRET',
    );
    const folder =
      this.configService.get<string>('CLOUDINARY_FOLDER') ?? 'Deesglim';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHash('sha1')
      .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex');

    const formData = new FormData();
    formData.append(
      'file',
      `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
    );
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
    formData.append('signature', signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: 'POST',
        body: formData,
      },
    );

    if (!response.ok) {
      throw new BadRequestException(
        `Cloudinary upload failed: ${await response.text()}`,
      );
    }

    const result = (await response.json()) as {
      secure_url: string;
      public_id: string;
    };

    return {
      url: result.secure_url,
      altText: file.originalname,
      sortOrder,
    };
  }

  async createCategory(
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category> {
    const slug = createCategoryDto.name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    const existingCategory = await this.categoryModel.findOne({
      $or: [{ name: createCategoryDto.name }, { slug }],
    });

    if (existingCategory) {
      throw new BadRequestException('Category name or slug already exists.');
    }

    const category = new this.categoryModel({ ...createCategoryDto, slug });
    return category.save();
  }

  async findAll(query?: ListProductsQueryDto): Promise<Product[]> {
    const filter: Record<string, any> = { isVisible: true };

    if (query?.category?.trim()) {
      const category = await this.findCategoryByFilterInput(query.category);
      if (!category) {
        return [];
      }

      filter.category = category._id;
    }

    return this.productModel
      .find(filter)
      .populate('variants')
      .populate('images')
      .populate('category')
      .exec();
  }

  findBySlug(slug: string): Promise<Product | null> {
    return this.productModel
      .findOne({ slug, isVisible: true })
      .populate('variants')
      .populate('images')
      .populate('category')
      .exec();
  }

  async findCategories(): Promise<Category[]> {
    return this.categoryModel.find().exec();
  }

  private async findCategoryByFilterInput(input: string) {
    const normalized = input.trim().toLowerCase();
    const normalizedSlug = normalized
      .replace(/\//g, '-')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');

    const aliasMap: Record<string, CategoryName> = {
      'custom-wigs': CategoryName.CUSTOM_WIGS,
      customwigs: CategoryName.CUSTOM_WIGS,
      'lace-supply': CategoryName.LACE_SUPPLY,
      lacesupply: CategoryName.LACE_SUPPLY,
      'closures-frontals': CategoryName.CLOSURES_FRONTALS,
      closuresfrontals: CategoryName.CLOSURES_FRONTALS,
    };

    const categoryName = aliasMap[normalizedSlug] as CategoryName | undefined;

    return this.categoryModel
      .findOne({
        $or: [
          { slug: normalizedSlug },
          { name: categoryName ?? input.trim() },
          { name: input.trim() },
        ],
      })
      .exec();
  }

  async getTopCategories(query: TopCategoriesQueryDto) {
    const days = query.days ?? 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const revenueStatuses = [
      OrderStatus.PAID,
      OrderStatus.PROCESSING,
      OrderStatus.SHIPPED,
      OrderStatus.DELIVERED,
    ];

    const results = await this.orderModel.aggregate([
      {
        $match: {
          status: { $in: revenueStatuses },
          createdAt: { $gte: startDate },
        },
      },
      { $unwind: '$items' },
      {
        $addFields: {
          variantObjectId: { $toObjectId: '$items.productVariantId' },
        },
      },
      {
        $lookup: {
          from: 'products',
          let: { variantId: '$variantObjectId' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$$variantId', '$variants'] },
              },
            },
            {
              $lookup: {
                from: 'categories',
                localField: 'category',
                foreignField: '_id',
                as: 'categoryDoc',
              },
            },
            {
              $unwind: {
                path: '$categoryDoc',
                preserveNullAndEmptyArrays: true,
              },
            },
            {
              $project: {
                _id: 0,
                categoryName: '$categoryDoc.name',
              },
            },
          ],
          as: 'productMatch',
        },
      },
      {
        $addFields: {
          categoryName: {
            $ifNull: [
              { $arrayElemAt: ['$productMatch.categoryName', 0] },
              'Uncategorized',
            ],
          },
        },
      },
      {
        $group: {
          _id: '$categoryName',
          revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          quantitySold: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 },
        },
      },
    ]);

    const categoryOrder = [
      CategoryName.CUSTOM_WIGS,
      CategoryName.LACE_SUPPLY,
      CategoryName.CLOSURES_FRONTALS,
    ];

    const totalRevenue = results.reduce(
      (sum, item) => sum + Number(item.revenue ?? 0),
      0,
    );

    const categoryMap = new Map(results.map((item) => [item._id, item]));

    const categories = categoryOrder.map((categoryName) => {
      const item = categoryMap.get(categoryName);
      const revenue = Number(item?.revenue ?? 0);
      return {
        category: categoryName,
        revenue: Number(revenue.toFixed(2)),
        quantitySold: Number(item?.quantitySold ?? 0),
        orderCount: Number(item?.orderCount ?? 0),
        percentage:
          totalRevenue > 0
            ? Number(((revenue / totalRevenue) * 100).toFixed(2))
            : 0,
      };
    });

    const topCategory =
      [...categories].sort((left, right) => right.revenue - left.revenue)[0] ??
      null;

    return {
      periodDays: days,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      topCategory,
      categories,
    };
  }
}
