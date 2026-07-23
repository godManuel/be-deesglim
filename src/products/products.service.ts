import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { createHash } from 'crypto';
import { Model, Types } from 'mongoose';
import {
  Category,
  CategoryDocument,
  ProductType,
} from './schemas/category.schema';
import { Product, ProductDocument } from './schemas/product.schema';
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
import { UpdateProductDto } from './dto/update-product.dto';
import {
  Order,
  OrderDocument,
  OrderStatus,
} from '../orders/schemas/order.schema';
import { TopCategoriesQueryDto } from './dto/top-categories-query.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { CreateCustomProductDto } from './dto/create-custom-product.dto';

type UploadedProductImageFile = {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
};

@Injectable()
export class ProductsService {
  findById(productId: string) {
    return this.productModel
      .findById(productId)
      .populate('variants')
      .populate('images')
      .populate('category')
      .exec();
  }

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
      name: createProductDto.name,
      slug,
      description: createProductDto.description,
      color: createProductDto.color,
      isVisible: createProductDto.isVisible ?? true,
      isFeatured: createProductDto.isFeatured ?? false,
      category: category._id,
      variants: variantIds,
      images: imageIds,
      whyChoose: createProductDto.whyChoose,
      whyNotChoose: createProductDto.whyNotChoose,
      price: createProductDto.price ?? 0,
      quantity: createProductDto.quantity ?? 0,
      sizeGuidePdfUrl: createProductDto.sizeGuidePdfUrl,
      skinToneGuidePdfUrl: createProductDto.skinToneGuidePdfUrl,
    });

    return product.save();
  }

  async createCustomProduct(
    createCustomProductDto: CreateCustomProductDto,
    imageFiles: UploadedProductImageFile[] = [],
  ): Promise<Product> {
    // ---------------------------------------------------------------
    // 1. Find the Custom Wigs category
    // ---------------------------------------------------------------
    const category = await this.categoryModel.findOne({
      $or: [{ slug: 'custom-made' }, { name: ProductType.CUSTOM_MADE }],
    });

    if (!category) {
      throw new BadRequestException(
        'Custom Wigs category has not been configured.',
      );
    }

    // ---------------------------------------------------------------
    // 2. Generate a unique product slug
    // ---------------------------------------------------------------
    const slug = await this.generateUniqueProductSlug(
      createCustomProductDto.slug || createCustomProductDto.name,
    );

    // ---------------------------------------------------------------
    // 3. Create variants if provided
    // ---------------------------------------------------------------
    const variantIds: Types.ObjectId[] = [];

    if (createCustomProductDto.variants?.length) {
      const variants = await this.variantModel.insertMany(
        createCustomProductDto.variants.map(
          (variant: CreateProductVariantDto) => ({
            ...variant,
            inventoryCount: variant.inventoryCount ?? 0,
          }),
        ),
      );

      variantIds.push(...variants.map((variant) => variant._id));
    }

    // ---------------------------------------------------------------
    // 4. Upload product images to Cloudinary
    // ---------------------------------------------------------------
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

    // ---------------------------------------------------------------
    // 5. Create the custom product
    // ---------------------------------------------------------------
    const product = new this.productModel({
      name: createCustomProductDto.name,

      slug,

      description: createCustomProductDto.description,

      color: createCustomProductDto.color,

      // Automatically assign Custom Wigs category
      category: category._id,

      price: createCustomProductDto.price ?? 0,

      quantity: createCustomProductDto.quantity ?? 0,

      isVisible: createCustomProductDto.isVisible ?? true,

      isFeatured: createCustomProductDto.isFeatured ?? false,

      variants: variantIds,

      images: imageIds,

      sizeGuidePdfUrl: createCustomProductDto.sizeGuidePdfUrl,

      skinToneGuidePdfUrl: createCustomProductDto.skinToneGuidePdfUrl,
    });

    return product.save();
  }

  async updateProduct(
    productId: string,
    updateProductDto: UpdateProductDto,
    imageFiles: UploadedProductImageFile[] = [],
  ): Promise<Product> {
    const product = await this.productModel.findOne({
      _id: productId,
      isDeleted: false,
    });

    if (!product) {
      throw new BadRequestException('Product not found.');
    }

    let categoryId = product.category;

    if (updateProductDto.category) {
      const category = await this.categoryModel.findOne({
        $or: [
          { _id: updateProductDto.category },
          { slug: updateProductDto.category },
        ],
      });

      if (!category) {
        throw new BadRequestException(
          'Category not found. Provide a valid category id or slug.',
        );
      }

      categoryId = category._id;
    }

    let slug = product.slug;

    if (updateProductDto.name || updateProductDto.slug) {
      const slugSource =
        updateProductDto.slug || updateProductDto.name || product.name;

      slug = await this.generateUniqueProductSlugForUpdate(
        slugSource,
        productId,
      );
    }

    let variantIds = product.variants;

    if (updateProductDto.variants !== undefined) {
      const variants = await this.variantModel.insertMany(
        updateProductDto.variants.map((variant: CreateProductVariantDto) => ({
          ...variant,
          inventoryCount: variant.inventoryCount ?? 0,
        })),
      );

      variantIds = variants.map((variant) => variant._id);
    }

    let imageIds: Types.ObjectId[] = product.images ?? [];

    if (updateProductDto.images !== undefined) {
      const images = await this.imageModel.insertMany(
        updateProductDto.images.map((image: CreateProductImageDto) => ({
          ...image,
          sortOrder: image.sortOrder ?? 0,
        })),
      );

      imageIds = images.map((image) => image._id);
    }

    if (imageFiles.length > 0) {
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

    product.name = updateProductDto.name ?? product.name;
    product.slug = slug;
    product.description = updateProductDto.description ?? product.description;
    product.color = updateProductDto.color ?? product.color;
    product.isVisible = updateProductDto.isVisible ?? product.isVisible;
    product.isFeatured = updateProductDto.isFeatured ?? product.isFeatured;
    product.category = categoryId;
    product.variants = variantIds;
    product.images = imageIds;

    return product.save();
  }

  async deleteProduct(productId: string): Promise<{
    message: string;
    deletedProductId: string;
    deletedAt: Date;
  }> {
    const product = await this.productModel.findOne({
      _id: productId,
      isDeleted: false,
    });

    if (!product) {
      throw new BadRequestException('Product not found.');
    }

    // ---------------------------------------------------------------
    // 2. Soft delete the product
    // ---------------------------------------------------------------
    const deletedAt = new Date();

    product.isDeleted = true;
    product.deletedAt = deletedAt;

    // Make sure deleted products are no longer visible
    product.isVisible = false;

    // ---------------------------------------------------------------
    // 3. Save the soft-deleted product
    // ---------------------------------------------------------------
    await product.save();

    // ---------------------------------------------------------------
    // 4. Return response
    // ---------------------------------------------------------------
    return {
      message: 'Product deleted successfully.',
      deletedProductId: productId,
      deletedAt,
    };
  }

  /**
   * Generates a unique product slug during an update.
   *
   * The current product is excluded from the uniqueness check,
   * so keeping the same slug will not cause a conflict.
   */
  private async generateUniqueProductSlugForUpdate(
    source: string,
    productId: string,
  ): Promise<string> {
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

    while (
      await this.productModel.exists({
        slug,
        _id: { $ne: productId },
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return slug;
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

    const aliasMap: Record<string, ProductType> = {
      'lace-supply': ProductType.LACE_SUPPLY,
      lacesupply: ProductType.LACE_SUPPLY,

      'closures-frontals': ProductType.CLOSURES_FRONTALS,
      closuresfrontals: ProductType.CLOSURES_FRONTALS,

      'ready-to-ship-wigs': ProductType.READY_TO_SHIP_WIGS,
      readytoshipwigs: ProductType.READY_TO_SHIP_WIGS,

      'custom-made': ProductType.CUSTOM_MADE,
      custommade: ProductType.CUSTOM_MADE,
    };

    const productType = aliasMap[normalizedSlug] as ProductType | undefined;

    return this.categoryModel
      .findOne({
        $or: [
          { slug: normalizedSlug },
          { name: productType ?? input.trim() },
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
      ProductType.LACE_SUPPLY,
      ProductType.CLOSURES_FRONTALS,
      ProductType.READY_TO_SHIP_WIGS,
      ProductType.CUSTOM_MADE,
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
