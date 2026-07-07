import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
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

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
    @InjectModel(ProductVariant.name)
    private readonly variantModel: Model<ProductVariantDocument>,
    @InjectModel(ProductImage.name)
    private readonly imageModel: Model<ProductImageDocument>,
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
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

  findAll(): Promise<Product[]> {
    return this.productModel
      .find({ isVisible: true })
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
}
